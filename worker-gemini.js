/**
 * Worker de Cloudflare — Extracción de gastos con Gemini 2.5 Flash.
 *
 * Reemplaza al antiguo worker con @cf/llava-hf/llava-1.5-7b-hf.
 *
 * Configuración (una vez en el dashboard de Cloudflare):
 *   1. Crear API key gratis en https://aistudio.google.com/apikey
 *   2. En el worker polished-bar-b342: Settings → Variables → Add
 *      → GEMINI_API_KEY (valor = la key, tipo Secret)
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
      if (!env.GEMINI_API_KEY) {
        return new Response(
          JSON.stringify({
            error:
              'Falta GEMINI_API_KEY (Settings → Variables → Add) — obtenela en aistudio.google.com/apikey',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const prompt = `Leé esta imagen de una lista de gastos de Argentina escrita a mano.
Devolvé SOLO un ARRAY JSON de gastos, sin texto, sin explicaciones.
Cada elemento tiene SOLO estas claves:
{"name":"", "amountArs":0, "amountUsd":0}

REGLAS:
1. NO inventes gastos. Leé SOLO lo que está escrito en la hoja.
2. NO uses categorías. Ignorá títulos como "vivienda", "servicios", etc: son etiquetas, no gastos.
3. Copiá cada número EXACTO con todos sus dígitos (450000 no es 45000).
4. Si un monto dice "usd" o "u$d" → amountUsd. Si no, es amountArs (pesos).
5. Si un texto no es un gasto (título, nota, fecha), ignoralo.
6. Si no hay gastos legibles, devolvé [].`;

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  // El front siempre envía JPEG (canvas.toDataURL('image/jpeg', 0.92))
                  { inline_data: { mime_type: 'image/jpeg', data: image } },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
              response_mime_type: 'application/json', // fuerza JSON válido sin markdown
            },
          }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(
          JSON.stringify({ error: `Gemini API error ${resp.status}: ${errText.slice(0, 300)}` }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!text) {
        return new Response(JSON.stringify({ error: 'Gemini no devolvió texto' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(JSON.stringify({ resultado: 'gemini', description: text }), {
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