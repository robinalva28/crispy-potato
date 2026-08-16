/**
 * Worker de Cloudflare — Extracción de gastos con modelos de visión (cascada).
 *
 * Cascada de modelos (usa el primero que funcione).
 * Formato: { image: base64 } → JSON { resultado, description, modelo }.
 *
 * Orden:
 *  1. @cf/google/gemma-4-26b-a4b-it     — multimodal (Gemma 3 ya lo era), formato messages
 *  2. @cf/meta/llama-3.2-11b-vision-instruct — requiere "agree" (auto-acepta y reintenta)
 *  3. @cf/llava-hf/llava-1.5-7b-hf      — último recurso (siempre disponible)
 *
 * Historial:
 *  - LLaVA 1.5-7B: malo para OCR (deformaba nombres, inventaba montos).
 *  - Gemini 2.0/2.5 Flash: Google los desactivó para usuarios nuevos.
 *  - Llama 3.2 11B: exige aceptar licencia (error 5016); el agree vía binding no siempre activa.
 *  - Qwen2.5-VL / Phi-3 / Kimi-VL: no disponibles en el plan de la cuenta (fallan al instanciar).
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

      const errors = [];

      // 1) Gemma 4 26B — multimodal. Formato messages con image_url en base64.
      const GEMMA_MODEL = '@cf/google/gemma-4-26b-a4b-it';
      try {
        const resp = await env.AI.run(GEMMA_MODEL, {
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: `data:image/jpeg;base64,${image}` },
                { type: 'text', text: prompt },
              ],
            },
          ],
          max_tokens: 1024,
        });
        const text =
          typeof resp === 'string' ? resp : resp?.response ?? resp?.result?.response ?? '';
        if (text && text.trim().length > 0) {
          return new Response(
            JSON.stringify({ resultado: 'vision', description: text, modelo: GEMMA_MODEL }),
            { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
        errors.push(`${GEMMA_MODEL}: respuesta vacía`);
      } catch (err) {
        errors.push(`${GEMMA_MODEL}: ${String(err?.message ?? err).slice(0, 120)}`);
      }

      // 2) Llama 3.2 11B Vision — con auto-agree de licencia (error 5016).
      const LLAMA_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
      try {
        let resp;
        try {
          resp = await env.AI.run(LLAMA_MODEL, {
            image: imageArray,
            prompt,
            max_tokens: 1024,
          });
        } catch (err) {
          const msg = String(err?.message ?? err);
          if (msg.includes('5016') || msg.includes('agree')) {
            await env.AI.run(LLAMA_MODEL, { prompt: 'agree' });
            resp = await env.AI.run(LLAMA_MODEL, {
              image: imageArray,
              prompt,
              max_tokens: 1024,
            });
          } else {
            throw err;
          }
        }
        const text =
          typeof resp === 'string' ? resp : resp?.response ?? resp?.result?.response ?? '';
        if (text && text.trim().length > 0) {
          return new Response(
            JSON.stringify({ resultado: 'vision', description: text, modelo: LLAMA_MODEL }),
            { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
        errors.push(`${LLAMA_MODEL}: respuesta vacía`);
      } catch (err) {
        errors.push(`${LLAMA_MODEL}: ${String(err?.message ?? err).slice(0, 120)}`);
      }

      // 3) LLaVA 1.5 — último recurso, siempre disponible.
      const LLAVA_MODEL = '@cf/llava-hf/llava-1.5-7b-hf';
      try {
        const resp = await env.AI.run(LLAVA_MODEL, {
          image: imageArray,
          prompt,
          max_tokens: 1024,
        });
        const text =
          typeof resp === 'string' ? resp : resp?.response ?? resp?.result?.response ?? '';
        if (text && text.trim().length > 0) {
          return new Response(
            JSON.stringify({ resultado: 'vision', description: text, modelo: LLAVA_MODEL }),
            { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
        errors.push(`${LLAVA_MODEL}: respuesta vacía`);
      } catch (err) {
        errors.push(`${LLAVA_MODEL}: ${String(err?.message ?? err).slice(0, 120)}`);
      }

      return new Response(
        JSON.stringify({ error: 'Ningún modelo de visión disponible', detalles: errors }),
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