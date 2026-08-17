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

      const PROMPT = `Leé esta imagen de una FACTURA o COMPROBANTE de pago de Argentina.
Devolvé EXCLUSIVAMENTE un OBJETO JSON válido con UN SOLO gasto. NADA de texto, NADA de markdown, NADA de explicaciones.

Formato EXACTO de la respuesta:
{"name":"", "amountArs":0, "amountUsd":0, "dueDate":"AAAA-MM-DD", "notes":""}

Ejemplo:
{"name":"Supermercado DIA","amountArs":35899.75,"amountUsd":0,"dueDate":"2026-08-15","notes":"Factura B N° 1234-567890"}
Otro ejemplo (ticket, el TOTAL es el último importe):
{"name":"WENDYS","amountArs":27741,"amountUsd":0,"dueDate":"2026-08-26","notes":"TOTAL: $27.741,00"}

REGLAS:
1. name = el EMISOR/PROVEEDOR de la factura (razón social o comercio). NO pongas "Factura".
2. amountArs = SOLO el monto que dice EXACTAMENTE "TOTAL" (es SIEMPRE el último monto de la factura, aparece después del IVA). En tickets suele verse "TOTAL: $27.741,00". Si no encontrás la palabra TOTAL, usá el monto MÁS GRANDE de la factura. NUNCA uses "IVA", "SUBTOTAL", "IMPORTE" ni montos de ítems individuales.
3. MONTOS ARGENTINOS: "$35.899,75" → 35899.75 (punto = MILES, coma = decimal). NUNCA uses puntos en la salida.
4. Si la factura está en dólares ("USD", "u$d") → amountUsd = total y amountArs = 0.
5. dueDate = fecha de emisión en AAAA-MM-DD. Si no hay, "".
6. notes = detalle breve o número de factura (máx 80 caracteres).
7. Si no se puede leer nada, devolvé {"name":"","amountArs":0,"amountUsd":0,"dueDate":"","notes":""}.`;

      const STRICT_PROMPT = `Devolvé SOLO el objeto JSON de la factura, sin texto, sin razonar, sin explicaciones.
Formato EXACTO: {"name":"","amountArs":0,"amountUsd":0,"dueDate":"AAAA-MM-DD","notes":""}
amountArs = el número MÁS GRANDE de la factura (es el TOTAL). NUNCA uses IVA, SUBTOTAL ni montos de ítems.
Si es USD, solo amountUsd.
Si no se puede leer nada, devolvé {"name":"","amountArs":0,"amountUsd":0,"dueDate":"","notes":""}.`;

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
        // Para facturas NO reintentamos: la primera pasada suele ser más precisa
        // (el reintento estricto degrada y pierde proveedor/monto total).
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(
        JSON.stringify({ resultado: 'factura', description: text, modelo: MODEL }),
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