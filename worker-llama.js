/**
 * Worker de Cloudflare — Extracción de gastos con modelos de visión (cascada).
 *
 * Cascada de modelos (usa el primero que funcione):
 *  1. @cf/qwen/qwen2.5-vl-7b-instruct      — OCR excelente (Apache 2.0, sin licencia)
 *  2. @cf/microsoft/phi-3-vision-128k-instruct — MIT, sin licencia
 *  3. @cf/moonshotai/kimi-vl-a3b-instruct   — Apache 2.0, sin licencia
 *  4. @cf/meta/llama-3.2-11b-vision-instruct — requiere "agree" (auto-acepta y reintenta)
 *  5. @cf/llava-hf/llava-1.5-7b-hf          — último recurso (siempre disponible)
 *
 * El worker prueba cada modelo en orden hasta que uno devuelve JSON.
 * Devuelve { resultado, description, modelo } donde "modelo" indica cuál se usó.
 *
 * Historial:
 *  - LLaVA 1.5-7B: malo para OCR (deformaba nombres, inventaba montos).
 *  - Gemini 2.0/2.5 Flash: Google los desactivó para usuarios nuevos.
 *  - Llama 3.2 11B: exige aceptar licencia (error 5016) y el "agree" vía
 *    env.AI.run no siempre activa la licencia desde el binding.
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

      // Modelos en orden de preferencia. Los primeros no requieren licencia.
      const VISION_MODELS = [
        '@cf/qwen/qwen2.5-vl-7b-instruct',
        '@cf/microsoft/phi-3-vision-128k-instruct',
        '@cf/moonshotai/kimi-vl-a3b-instruct',
        '@cf/meta/llama-3.2-11b-vision-instruct',
        '@cf/llava-hf/llava-1.5-7b-hf',
      ];

      const errors = [];
      for (const model of VISION_MODELS) {
        try {
          let resp;
          try {
            resp = await env.AI.run(model, {
              image: imageArray,
              prompt,
              max_tokens: 1024,
            });
          } catch (err) {
            const msg = String(err?.message ?? err);
            // Licencia de Llama: enviamos el "agree" oficial y reintentamos una vez.
            if (msg.includes('5016') || msg.includes('agree')) {
              await env.AI.run(model, { prompt: 'agree' });
              resp = await env.AI.run(model, {
                image: imageArray,
                prompt,
                max_tokens: 1024,
              });
            } else {
              throw err;
            }
          }

          // Normaliza la respuesta al contrato { resultado, description }.
          const text =
            typeof resp === 'string'
              ? resp
              : resp?.response ?? resp?.result?.response ?? JSON.stringify(resp);

          return new Response(
            JSON.stringify({ resultado: 'vision', description: text, modelo: model }),
            {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
          );
        } catch (err) {
          const msg = String(err?.message ?? err);
          errors.push(`${model}: ${msg.slice(0, 120)}`);
          // Si es error de modelo inexistente (404/10000), probamos el siguiente.
          // Si es otro error grave, seguimos igual — queremos quedarnos con el mejor disponible.
        }
      }

      return new Response(
        JSON.stringify({
          error: 'Ningún modelo de visión disponible',
          detalles: errors,
        }),
        {
          status: 500,
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