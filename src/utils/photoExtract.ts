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

/** Nombres de gastos corregidos por el usuario (localStorage) → categoría. */
const KNOWN_EXPENSES_KEY = 'pe-known-expenses';

/** Normaliza un texto (minúsculas + sin tildes) para coincidencias. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1, // borrar
        dp[j - 1] + 1, // insertar
        prev + (a[i - 1] === b[j - 1] ? 0 : 1) // sustituir / igual
      );
      prev = tmp;
    }
  }
  return dp[n];
}

/** Lee las correcciones guardadas (nombre → categoría). */
export function getKnownExpenses(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem(KNOWN_EXPENSES_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** Guarda las correcciones del usuario para aprendizaje futuro. */
export function saveCorrections(drafts: ExpenseDraft[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const known = getKnownExpenses();
    for (const d of drafts) {
      const n = normalizeText(d.name);
      if (n) known[n] = String(d.category);
    }
    localStorage.setItem(KNOWN_EXPENSES_KEY, JSON.stringify(known));
  } catch {
    // ignore
  }
}

/** Busca una corrección conocida parecida al nombre que leyó el modelo. */
export function matchKnownName(
  name: string,
  known: Record<string, string>
): { name: string; category: string } | null {
  const n = normalizeText(name);
  if (!n) return null;
  for (const [key, cat] of Object.entries(known)) {
    const kn = normalizeText(key);
    if (kn === n) return { name: key, category: cat };
    // Tolerancia 3: LLaVA deforma nombres ("Alquiler" → "maulier"), queremos corregirlos
    if (Math.abs(kn.length - n.length) <= 2 && levenshtein(kn, n) <= 3) {
      return { name: key, category: cat };
    }
  }
  return null;
}

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

/** ¿El texto menciona alguna palabra de dólares? */
export function mentionsUsd(text: string): boolean {
  return /(usd|u\$d|d[oó]lar(es)?|d[oó]lares|dls)/i.test(text);
}

/**
 * Aplica heurísticas post-procesamiento para corregir limitaciones del modelo:
 * 1. Si tiene ARS y USD a la vez, la moneda dominante es ARS salvo que el nombre/notas diga "usd".
 * 2. Si amountArs === amountUsd, es un invento del modelo → se queda solo ARS.
 * 3. Montos >= 50.000.000 se marcan como sospechosos (puede ser mezcla de filas).
 */
export function normalizeDrafts(raw: unknown[], known?: Record<string, string>): ExpenseDraft[] {
  const drafts: ExpenseDraft[] = [];
  const knownMap = known ?? getKnownExpenses();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === 'string' ? rec.name.trim() : '';
    if (!name) continue;

    const categoryRaw = typeof rec.category === 'string' ? rec.category.toLowerCase() : '';
    const category = VALID_CATEGORIES.includes(categoryRaw as Category)
      ? (categoryRaw as Category)
      : 'otros';
    // Aprendizaje por correcciones: si el nombre leído se parece a uno ya corregido,
    // usamos el nombre/categoría exactos que el usuario confirmó antes.
    const match = matchKnownName(name, knownMap);
    const finalName = match?.name ?? name;
    const finalCategory = match?.category ?? category;

    let amountArs = toNumber(rec.amountArs) > 0 ? toNumber(rec.amountArs) : null;
    let amountUsd = toNumber(rec.amountUsd);
    const notes = typeof rec.notes === 'string' ? rec.notes.trim() : '';
    const hayLiteralUsd = mentionsUsd(`${name} ${notes}`);

    // Si el modelo puso USD pero el apunte no dice "usd/u$d/dólar", es invento → descartar USD
    if (!hayLiteralUsd) {
      amountUsd = 0;
    }
    // Si amountArs === amountUsd (duplicado exacto), es invento → descartar el USD
    else if (amountArs != null && amountArs === amountUsd) {
      amountUsd = 0;
    }
    // Si no hay ARS pero sí USD con literal, mantener (ej: "Seguro 12 usd")
    // (amountArs queda null si el modelo no devolvió pesos)

    // Sanity check de magnitud: marca montos absurdos (mezcla filas) poniendo amountArs=0 si supera umbral
    // No se borra data, solo se "aplana" el invento absurdo.
    if (amountArs != null && amountArs >= 50_000_000) {
      amountArs = null;
    }

    // La cotización NO la adivina el modelo (inventa valores raros, ej: 3.33).
    // En Argentina se carga al validar. Forzamos usdRate = 0 siempre.
    drafts.push({
      name: finalName,
      category: finalCategory,
      amountArs,
      amountUsd,
      usdRate: 0,
      notes,
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

  // Formato 9: nuestro Worker con Moondream devuelve { resultado: "moondream", answer: "..." }
  // o { result: { answer: "..." } } — la tarea "query" usa el campo answer.
  if (rec.resultado === 'moondream' && typeof rec.answer === 'string') return rec.answer;
  if (result && typeof result.answer === 'string') return result.answer;
  if (typeof rec.answer === 'string') return rec.answer;

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
