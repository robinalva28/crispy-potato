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

export async function extractInvoice(file: File): Promise<InvoiceData> {
  const base64 = await fileToBase64(file);
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
    const detail = await res.text().catch(() => '');
    throw new Error(`Fallo al leer la factura (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  const text = typeof data.description === 'string' ? data.description : JSON.stringify(data);
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error('El modelo no devolvió JSON de la factura');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(objMatch[0]) as Record<string, unknown>;
  } catch {
    throw new Error('No se pudo interpretar la factura');
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