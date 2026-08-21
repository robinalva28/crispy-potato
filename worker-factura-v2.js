/**
 * Worker de Cloudflare — Extracción de facturas v2.
 *
 * v2 vs v1 (worker-factura.js):
 * - SHORT-CIRCUIT: imágenes < 10 KB binarios son ruido/blank → JSON vacío sin gastar inferencia.
 * - max_tokens: 512 (menos alucinación prolongada, respuesta más rápida).
 * - Sanitización JSON SERVER-SIDE: extrae el primer {...} parseable y valida; fallback seguro al JSON vacío.
 * - PROMPT REESTRUCTURADO SIN EJEMPLOS REALES: elimina el "example leakage" que hacía que una foto
 *   del cielo/mesa devolviera los datos de los ejemplos ("Supermercado DIA", "WENDYS", 35899.75, 16000).
 *   Conserva el anclaje anti-error "TOTAL/PAGOS" y anti-"L. 27743" que da precisión en facturas reales.
 *
 * Contrato de entrada/salida (idéntico a v1, compatible con src/utils/invoiceExtract.ts):
 * - Entrada: { image: base64 } (JPEG, como envía el front).
 * - Salida:   { resultado: "factura", description: "<JSON string>", modelo }.
 *
 * Desplegar en Cloudflare → Workers & Pages → factura-b342 → Edit → pegar este código → Deploy.
 * Para VOLVER a la v1: pegar el contenido de worker-factura.js (queda intacto en el repo como
 * referencia canónica y savepoint en git).
 */
export default {
  async fetch(request, env) {
    // 1. CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    try {
      const { image } = await request.json();
      if (!image) return new Response('Missing image', { status: 400 });
      if (!env.AI) {
        return new Response(JSON.stringify({ error: 'Binding AI no encontrado' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const EMPTY_JSON = '{"name":"","amountArs":0,"amountUsd":0,"dueDate":"","notes":""}';

      // 2. Decodificación Base64 a texto binario (atob → bytes)
      const bin = atob(image);

      // 3. SHORT-CIRCUIT: imágenes < 10 KB binarios son ruido, un canvas vacío o ilegible.
      //    Se retorna el JSON por defecto al instante, sin gastar tiempo de inferencia.
      const MIN_BYTES_THRESHOLD = 10240;
      if (bin.length < MIN_BYTES_THRESHOLD) {
        return new Response(
          JSON.stringify({
            resultado: 'factura',
            description: EMPTY_JSON,
            modelo: 'short-circuit-hardware',
          }),
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const imageArray = Array.from(bytes);

      // 4. Prompt reestructurado SIN datos reales de ejemplo.
      //    El ÚNICO ejemplo es el JSON vacío (caso "no es factura") → el modelo ya no tiene
      //    nombres ni montos del prompt para "reciclar" cuando la foto no es una factura.
      const PROMPT = `Identificá si esta imagen contiene una FACTURA o COMPROBANTE de pago de Argentina legible.

IMPORTANTE: si la imagen NO es una factura (foto del cielo, de una mesa, un paisaje, una persona, imagen vacía o borrosa), o si no podés leer ningún dato con seguridad, devolvé EXACTAMENTE este JSON y nada más:
{"name":"","amountArs":0,"amountUsd":0,"dueDate":"","notes":""}

Si SÍ es una factura legible, devolvé SOLO un objeto JSON con estos campos:
- name: el EMISOR/PROVEEDOR o comercio (razón social). Nunca la palabra "Factura". Si no es legible, "".
- amountArs: únicamente el monto que acompaña a la palabra TOTAL o PAGOS, como número sin símbolos ni separador de miles (ej: "TOTAL 16.000,00" → 16000). Ignorá IVA, subtotales, percepciones, números de factura, CAE y, sobre todo, montos que aparezcan junto a leyes como "L. 27743". Si no hay total legible, 0.
- amountUsd: si el total está en dólares ("USD", "u$d") ponelo acá y dejá amountArs en 0.
- dueDate: fecha de emisión en AAAA-MM-DD, o "".
- notes: siempre "".

Respondé ÚNICAMENTE el objeto JSON, sin texto ni markdown.`;

      const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

      async function runModel(prompt) {
        return env.AI.run(MODEL, {
          image: imageArray,
          prompt,
          max_tokens: 512, // Reducido para evitar alucinaciones prolongadas
        });
      }

      let rawResp;
      try {
        rawResp = await runModel(PROMPT);
      } catch (err) {
        const msg = String(err?.message ?? err);
        // Licencia de Llama 3.2: aceptar con el "agree" oficial y reintentar.
        if (msg.includes('5016') || msg.includes('agree')) {
          await env.AI.run(MODEL, { prompt: 'agree' });
          rawResp = await runModel(PROMPT);
        } else {
          throw err;
        }
      }

      // 5. Extracción y sanitización estricta del JSON.
      //    Busca el primer bloque de llaves {} ignorando texto previo/posterior (ej. ```json).
      const textResponse =
        typeof rawResp === 'string'
          ? rawResp
          : rawResp?.response ?? rawResp?.result?.response ?? JSON.stringify(rawResp);

      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      let finalJsonString = EMPTY_JSON; // Fallback seguro
      if (jsonMatch) {
        try {
          // Valida que sea un JSON parseable antes de aceptarlo
          JSON.parse(jsonMatch[0]);
          finalJsonString = jsonMatch[0];
        } catch {
          // Si el JSON devuelto está corrupto, usa el fallback en lugar de fallar
        }
      }

      return new Response(
        JSON.stringify({
          resultado: 'factura',
          description: finalJsonString,
          modelo: MODEL,
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};