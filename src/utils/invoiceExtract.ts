/** Extrae datos de una factura argentina vía el worker factura-b342. */
import { fileToBase64 } from './imageUtils.ts';

const WORKER_URL = 'https://factura-b342.robinnet28.workers.dev';

export interface InvoiceData {
  name: string;
  amountArs: number | null;
  amountUsd: number;
  dueDate: string;
  notes: string;
}

function toNum(v: unknown): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Si el modelo razonó sin devolver JSON, extrae proveedor y el monto más grande del texto. */
function parseFromProse(text: string): Record<string, unknown> {
  const nameMatch = text.match(/proveedor es ([^\n.,]+)/i)
    ?? text.match(/emisor[:\s]+([^\n.,]+)/i)
    ?? text.match(/^([A-ZÁ-Ú0-9][A-ZÁ-Ú0-9 .'-]{2,})$/m);
  const amounts = (text.match(/\d[\d.,]*/g) ?? [])
    .map((s) => Number(s.replace(/\./g, '').replace(',', '.')))
    .filter((n) => n > 0 && Number.isFinite(n));
  const biggest = amounts.length ? Math.max(...amounts) : 0;
  return {
    name: (nameMatch?.[1] ?? '').trim(),
    amountArs: biggest,
    amountUsd: 0,
    dueDate: '',
    notes: '',
  };
}

export async function extractInvoice(file: File): Promise<InvoiceData> {
  const base64 = await fileToBase64(file);
  // Timeout: si el worker no responde, el escaneo no se cuelga y muestra error.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error('El servidor tardó demasiado. Probá de nuevo en unos segundos.');
    }
    throw new Error('No se pudo conectar al Worker (' + (err instanceof Error ? err.message : 'red') + ')');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Fallo al leer la factura (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  // description puede venir como string (JSON + posible texto razonado) o como objeto directo
  const text =
    typeof data.description === 'string'
      ? data.description
      : JSON.stringify(data.description ?? data);
  // Primero intentar extraer el objeto JSON ({...}) si está presente
  const objMatch = text.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown>;
  if (objMatch) {
    try {
      parsed = JSON.parse(objMatch[0]) as Record<string, unknown>;
    } catch {
      parsed = parseFromProse(text);
    }
  } else {
    // Sin JSON: parsear el texto razonado (proveedor + monto más grande)
    parsed = parseFromProse(text);
  }
  const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
  const amountArs = toNum(parsed.amountArs) > 0 ? toNum(parsed.amountArs) : null;
  const amountUsd = toNum(parsed.amountUsd);
  const dueDate = typeof parsed.dueDate === 'string' ? parsed.dueDate.trim() : '';
  const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : '';
  if (!name && amountArs == null && amountUsd === 0) {
    throw new Error('No se pudo leer la factura. Probá con mejor luz/encuadre.');
  }
  return { name, amountArs, amountUsd, dueDate, notes };
}