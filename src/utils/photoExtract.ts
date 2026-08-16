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

/** URL del Worker de Cloudflare que llama a Workers AI (lo creás en el dashboard). */
// TODO: reemplazar por la URL real del Worker una vez creado.
const WORKER_URL = 'https://photo-extract.TU-SUBDOMINIO.workers.dev';

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

/** Extrae los gastos de una foto de apuntes usando el Worker de Cloudflare. */
export async function extractExpensesFromImage(base64: string): Promise<ExpenseDraft[]> {
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });

  if (!res.ok) {
    throw new Error(`Fallo al leer la foto (${res.status})`);
  }

  const data = (await res.json()) as { result?: { response?: string } };
  const text = data?.result?.response ?? '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? normalizeDrafts(parsed) : [];
  } catch {
    return [];
  }
}