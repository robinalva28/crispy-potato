/**
 * Worker de Cloudflare — Extracción de gastos con Llama 3.2 11B Vision Instruct.
 *
 * Modelo: @cf/meta/llama-3.2-11b-vision-instruct (el mejor VLM de visión de Workers AI).
 * - Requiere aceptar la licencia en el primer uso (error 5016): se envía
 *   automáticamente { prompt: "agree" } y se reintenta.
 * - Formato de entrada: { image: base64 } (JPEG, como envía el front).
 * - Formato de salida: { resultado: "vision", description, modelo }.
 *
 * Historial:
 *  - LLaVA 1.5-7B: malo para OCR (deformaba nombres, inventaba montos) — ELIMINADO.
 *  - Gemini 2.0/2.5 Flash: Google los desactivó para usuarios nuevos.
 *  - Qwen2.5-VL / Phi-3 / Kimi-VL: no disponibles en el plan de la cuenta.
 *  - Gemma 4 26B: no acepta el formato de imagen en Workers AI.
 *  - Llama 3.2 11B Vision: elegido final — probado con fotos reales (13 gastos
 *    exactos en la imagen 1, 3 en la imagen 2).
 *
 * Pegar este código en Cloudflare → Workers & Pages → polished-bar-b342 → Edit → Deploy.
 */
export default {
  async fetch(request, env) {
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

      const bin = atob(image);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const imageArray = Array.from(bytes);

      const prompt = `Leé esta imagen de una lista de gastos de Argentina escrita a mano.
Devolvé SOLO un ARRAY JSON, sin texto, sin markdown, sin explicaciones.
Cada elemento tiene SOLO estas claves:
{"name":"", "amountArs":0, "amountUsd":0}

REGLAS:
1. NO inventes gastos. Leé SOLO lo que está escrito en la hoja.
2. NO uses categorías. Ignorá títulos como "vivienda", "servicios", etc: son etiquetas, no gastos.
3. Copiá cada número EXACTO con todos sus dígitos (450000 no es 45000).
4. Si un monto dice "usd" o "u$d" → amountUsd. Si no, es amountArs (pesos).
5. Si un texto no es un gasto (título, nota, fecha), ignoralo.
6. Si no hay gastos legibles, devolvé [].`;

      const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

      let resp;
      try {
        resp = await env.AI.run(MODEL, {
          image: imageArray,
          prompt,
          max_tokens: 1024,
        });
      } catch (err) {
        const msg = String(err?.message ?? err);
        // Cloudflare exige aceptar la licencia de Llama 3.2 antes del primer uso
        // (error 5016). Enviamos el "agree" oficial y reintentamos.
        if (msg.includes('5016') || msg.includes('agree')) {
          await env.AI.run(MODEL, { prompt: 'agree' });
          resp = await env.AI.run(MODEL, {
            image: imageArray,
            prompt,
            max_tokens: 1024,
          });
        } else {
          throw err;
        }
      }

      // llama-3.2-vision devuelve { response: "..." } (o anidado en result.response).
      // Normalizamos a string para mantener el contrato { resultado, description }.
      const text =
        typeof resp === 'string'
          ? resp
          : resp?.response ?? resp?.result?.response ?? JSON.stringify(resp);

      return new Response(JSON.stringify({ resultado: 'vision', description: text, modelo: MODEL }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};