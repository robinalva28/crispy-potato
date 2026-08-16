import type { Category } from '../types.ts';

/** Gastos detectados por el modelo de visión (borrador antes de confirmar). */
export interface ExpenseDraft {
  name: string;
  category: Category | string;
  amountArs: number | null;
  amountUsd: number;
  usdRate: number;
  notes: string;
}

/** URL del Worker de Cloudflare que llama a Workers AI (Creado en el dashboard). */
const WORKER_URL = 'https://polished-bar-b342.robinnet28.workers.dev';

const VALID_CATEGORIES: Category[] = [
  'vivienda', 'servicios', 'tarjetas', 'eventos', 'salud', 'impuestos', 'otros',
];

function toNumber(v: unknown): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (!isNaN(n)) return n;
  }
  return 0;
}

/** Valida y normaliza los gastos crudos que devuelve el modelo. */
export function normalizeDrafts(raw: unknown[]): ExpenseDraft[] {
  const drafts: ExpenseDraft[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === 'string' ? rec.name.trim() : '';
    if (!name) continue;

    const categoryRaw = typeof rec.category === 'string' ? rec.category.toLowerCase() : '';
    const category = VALID_CATEGORIES.includes(categoryRaw as Category)
      ? (categoryRaw as Category)
      : 'otros';

    drafts.push({
      name,
      category,
      amountArs: toNumber(rec.amountArs) > 0 ? toNumber(rec.amountArs) : null,
      amountUsd: toNumber(rec.amountUsd),
      usdRate: toNumber(rec.usdRate),
      notes: typeof rec.notes === 'string' ? rec.notes.trim() : '',
    });
  }
  return drafts;
}

/** Extrae el texto de la respuesta de Workers AI (varios formatos posibles). */
function extractResponseText(data: unknown): string {
  const rec = data as Record<string, unknown>;
  if (!rec) return '';

  // Formato 1: { result: { response: "..." } }
  const result = rec.result as Record<string, unknown> | undefined;
  if (result && typeof result.response === 'string') return result.response;

  // Formato 2: { result: [{ response: "..." }] } (array de responses)
  if (Array.isArray(result)) {
    for (const item of result) {
      const r = item as Record<string, unknown>;
      if (r && typeof r.response === 'string') return r.response;
    }
  }

  // Formato 3: { response: "..." } directo
  if (typeof rec.response === 'string') return rec.response;

  // Formato 4: { result: "..." } string directo
  if (typeof rec.result === 'string') return rec.result;

  // Formato 5: { result: { output?: { text: "..." } } } (formato más nuevo)
  const output = result?.output as Record<string, unknown> | undefined;
  if (output && typeof output.text === 'string') return output.text;

  // Formato 6: Moondream con messages suele devolver { result: { string_response: "..." } }
  if (result && typeof result.string_response === 'string') return result.string_response;

  // Formato 7: { result: { response: "..." } } anidado en string_response directo
  if (result && typeof result.output_text === 'string') return result.output_text;

  // Formato 8: nuestro Worker con LLaVA devuelve { resultado: "llava", description: "..." }
  // donde description contiene el JSON de gastos detectados.
  if (rec.resultado === 'llava' && typeof rec.description === 'string') return rec.description;

  return JSON.stringify(data); // fallback: devolver todo por si ayuda a debuggear
}

/** Extrae los gastos de una foto de apuntes usando el Worker de Cloudflare. */
export async function extractExpensesFromImage(base64: string): Promise<ExpenseDraft[]> {
  let res: Response;
  try {
    res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
    });
  } catch (err) {
    throw new Error(`No se pudo conectar al Worker (${err instanceof Error ? err.message : 'red'})`);
  }

  if (!res.ok) {
    // Lee el detalle del error del Worker para mostrarlo
    const detail = await res.text().catch(() => '');
    throw new Error(`Fallo al leer la foto (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as unknown;
  const text = extractResponseText(data);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? normalizeDrafts(parsed) : [];
  } catch {
    return [];
  }
}
