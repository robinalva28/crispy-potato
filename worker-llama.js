/**
 * Worker de Cloudflare — Extracción de gastos con Llama 3.2 11B Vision Instruct.
 *
 * Modelo: @cf/meta/llama-3.2-11b-vision-instruct (el mejor VLM de visión de Workers AI).
 *
 * - Licencia: primero llama con { prompt: "agree" } (error 5016) y reintenta.
 * - Prompt con ejemplo JSON explícito para evitar respuestas en markdown.
 * - Si la respuesta no contiene JSON, reintenta una vez con refuerzo estricto.
 * - Formato de entrada: { image: base64 } (JPEG, como envía el front).
 * - Formato de salida: { resultado: "vision", description, modelo }.
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

      const PROMPT = `Leé esta imagen de una lista de gastos de Argentina escrita a mano.
Devolvé EXCLUSIVAMENTE un ARRAY JSON válido. NADA de texto, NADA de markdown, NADA de explicaciones.

Formato EXACTO de cada elemento:
{"name":"", "amountArs":0, "amountUsd":0}

Ejemplo de respuesta válida (montos ENTEROS sin separador de miles, decimales con PUNTO):
[{"name":"Alquiler","amountArs":830000,"amountUsd":0},{"name":"Luz","amountArs":111328.96,"amountUsd":0},{"name":"Deuda Vanesa","amountArs":279208,"amountUsd":0}]

REGLAS:
1. NO inventes gastos. Leé SOLO lo que está escrito en la hoja.
2. NO uses categorías. Ignorá títulos como "vivienda", "servicios", etc: son etiquetas, no gastos.
3. MONTOS ARGENTINOS: "$488.935" → 488935 (el punto separa MILES). "$36.999,40" → 36999.4 (la COMA es decimal). NUNCA uses puntos en la salida del número, escribí SOLO dígitos y el punto decimal si hay centavos.
4. Copiá cada número EXACTO con todos sus dígitos (450000 no es 45000, ni 45.000, ni 450.000).
5. Usá amountUsd SOLO si el monto dice explícitamente "usd", "u$d" o "dólar". En ese caso NO pongas amountArs.
6. Si un texto no es un gasto (título, nota, fecha, total), ignoralo.
7. Si un nombre es ilegible pero se infiere, corregilo al español real: "gaz" → "gas", "dude" → "deuda", "nafite" → "nafta", "pblico" → "público", "tel +" → "teléfono", "super" → "supermercado". NUNCA uses palabras en inglés.
8. Si un texto no es un gasto (nota, recordatorio, título, fecha), NO lo incluyas como gasto. Solo incluí lineas con montos.
9. Si no hay gastos legibles, devolvé [].`;

      const STRICT_PROMPT = `Devolvé SOLO el array JSON de gastos de la imagen, sin texto alrededor, sin preámbulos.
Formato: [{"name":"", "amountArs":0, "amountUsd":0}]
Montos: "$488.935" → 488935, "$36.999,40" → 36999.4. Sin puntos de miles en el número.
Si un monto dice "usd" → solo amountUsd. Si no, solo amountArs.
Nombres corregidos al español real ("gaz" → "gas", "dude" → "deuda").
Si no hay gastos, devolvé [].`;

      const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

      async function runModel(prompt) {
        return env.AI.run(MODEL, {
          image: imageArray,
          prompt,
          max_tokens: 1024,
        });
      }

      function extractText(resp) {
        return typeof resp === 'string'
          ? resp
          : resp?.response ?? resp?.result?.response ?? JSON.stringify(resp);
      }

      function hasJson(text) {
        return /\[[\s\S]*\]/.test(text) || /\{[\s\S]*\}/.test(text);
      }

      let text = '';
      try {
        let resp;
        try {
          resp = await runModel(PROMPT);
        } catch (err) {
          const msg = String(err?.message ?? err);
          // Licencia de Llama 3.2: aceptar con el "agree" oficial y reintentar.
          if (msg.includes('5016') || msg.includes('agree')) {
            await env.AI.run(MODEL, { prompt: 'agree' });
            resp = await runModel(PROMPT);
          } else {
            throw err;
          }
        }
        text = extractText(resp);

        // Si el modelo devolvió markdown/texto en vez de JSON, reintentar estricto.
        if (!hasJson(text)) {
          resp = await runModel(STRICT_PROMPT);
          text = extractText(resp);
        }
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(
        JSON.stringify({ resultado: 'vision', description: text, modelo: MODEL }),
        {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};