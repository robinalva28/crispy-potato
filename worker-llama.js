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
Devolvé EXCLUSIVAMENTE un ARRAY JSON válido. NADA de markdown, NADA de bullets, NADA de texto extra.

Formato EXACTO de cada elemento (sin categorías, sin notas):
{"name":"", "amountArs":0, "amountUsd":0}

Ejemplo de respuesta válida:
[{"name":"Alquiler","amountArs":830000,"amountUsd":0},{"name":"Luz","amountArs":111328,"amountUsd":0}]

REGLAS:
1. NO inventes gastos. Leé SOLO lo que está escrito en la hoja.
2. NO uses categorías. Ignorá títulos como "vivienda", "servicios", etc: son etiquetas, no gastos.
3. Copiá cada número EXACTO con todos sus dígitos (450000 no es 45000).
4. Si un monto dice "usd" o "u$d" → amountUsd. Si no, es amountArs (pesos).
5. Si un texto no es un gasto (título, nota, fecha), ignoralo.
6. Si no hay gastos legibles, devolvé [].`;

      const STRICT_PROMPT = `Devolvé SOLO el array JSON de gastos de la imagen, sin texto alrededor.
Formato: [{"name":"", "amountArs":0, "amountUsd":0}]
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