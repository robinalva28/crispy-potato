import { useEffect, useRef, useState } from 'react';
import type { Month } from '../types.ts';
import { extractExpensesFromImage, saveCorrections, type ExpenseDraft } from '../utils/photoExtract.ts';
import { CATEGORY_LABELS, fmtARS } from '../utils/money.ts';
import { parseLocalNumber, formatInputNumber } from '../utils/format.ts';
import { canUsePhoto } from '../utils/monthUtils.ts';
import { MoneyInput } from './MoneyInput.tsx';
import { Button } from './ui/Button.tsx';
import { Icon } from './ui/Icon.tsx';

interface Props {
  month: Month;
  onSave: (expenses: ExpenseDraft[], monthId: string) => Promise<void>;
  onClose: () => void;
}

type Phase = 'capture' | 'loading' | 'review';

export function PhotoExpenseModal({ month, onSave, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('capture');
  const [drafts, setDrafts] = useState<ExpenseDraft[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Texto crudo por fila (sin formateo en vivo) para no cortar la escritura de montos
  const [arsTexts, setArsTexts] = useState<string[]>([]);
  const [usdTexts, setUsdTexts] = useState<string[]>([]);
  const [rateTexts, setRateTexts] = useState<string[]>([]);

  useEffect(() => {
    if (!canUsePhoto(month)) {
      setError('Este mes ya fue cargado con foto. La foto solo se puede usar una vez por mes.');
    }
  }, [month]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase('loading');
    setError('');

    try {
      const base64 = await fileToBase64(file);
      const result = await extractExpensesFromImage(base64);
      if (result.length === 0) {
        setError('No se pudo leer ningún gasto en la foto. Probá de nuevo con mejor luz/letra.');
        setPhase('capture');
        return;
      }
      setDrafts(result);
      // Inicializa el texto crudo de los montos (sin formateo en vivo)
      setArsTexts(result.map((d) => (d.amountArs != null ? formatInputNumber(d.amountArs) : '')));
      setUsdTexts(result.map((d) => (d.amountUsd > 0 ? formatInputNumber(d.amountUsd) : '')));
      setRateTexts(result.map((d) => (d.usdRate > 0 ? formatInputNumber(d.usdRate) : '')));
      setPhase('review');
    } catch (err) {
      setError(`Error al procesar la foto: ${err instanceof Error ? err.message : String(err)}`);
      setPhase('capture');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function updateDraft(index: number, patch: Partial<ExpenseDraft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    setArsTexts((prev) => prev.filter((_, i) => i !== index));
    setUsdTexts((prev) => prev.filter((_, i) => i !== index));
    setRateTexts((prev) => prev.filter((_, i) => i !== index));
  }

  function addEmptyRow() {
    setDrafts((prev) => [
      ...prev,
      { name: '', category: 'otros', amountArs: null, amountUsd: 0, usdRate: 0, notes: '' },
    ]);
    setArsTexts((prev) => [...prev, '']);
    setUsdTexts((prev) => [...prev, '']);
    setRateTexts((prev) => [...prev, '']);
  }

  /** Parsear un texto crudo a number (null si vacío). */
  function parseText(v: string): number | null {
    if (v.trim() === '') return null;
    return parseLocalNumber(v);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Construye los drafts finales desde los textos crudos (parseo al guardar)
      const finalDrafts = drafts.map((d, i) => ({
        ...d,
        amountArs: parseText(arsTexts[i]),
        amountUsd: parseText(usdTexts[i]) ?? 0,
        usdRate: parseText(rateTexts[i]) ?? 0,
      }));
      // Aprendizaje: guarda los nombres/categorías corregidos para próximas fotos
      saveCorrections(finalDrafts);
      await onSave(finalDrafts, month.id);
      onClose();
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  // Total y validación desde los textos crudos (sin depender del formateo en vivo)
  const total = drafts.reduce((sum, _d, i) => sum + (parseText(arsTexts[i]) ?? 0) + (parseText(usdTexts[i]) ?? 0) * (parseText(rateTexts[i]) ?? 0), 0);
  // Un gasto con USD pero sin cotización no puede guardarse (la cotización se pide al validar).
  const hasMissingRate = drafts.some((_d, i) => (parseText(usdTexts[i]) ?? 0) > 0 && (parseText(rateTexts[i]) ?? 0) <= 0);

  const inputCls = 'input-aura w-full px-3 py-2 text-sm';

  return (
    <div className="modal-overlay fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-card rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-neutral-900 dark:text-neutral-100">
            <Icon name="camera" size={18} className="inline-block mr-1 align-[-2px]" />Foto de apuntes — {month.label}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full glass flex items-center justify-center text-sm hover:opacity-70 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="text-xs text-accent-red glass rounded-xl px-3 py-2">
            <Icon name="alert" size={14} className="inline-block mr-1 align-[-2px]" />{error}
          </div>
        )}

        {phase === 'capture' && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Sacá una foto de la hoja con la lista de tus gastos del mes. La foto reemplaza todo lo
              que haya cargado este mes.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
            <Button
              variant="violet"
              size="lg"
              fullWidth
              onClick={() => fileRef.current?.click()}
              disabled={!canUsePhoto(month)}
              className="disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="camera" size={18} /> Tomar foto de los apuntes
            </Button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="py-10 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
              <div className="text-sm font-bold text-accent-violet">
                Leyendo tus apuntes…
              </div>
            </div>
            <div className="mx-auto mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse" />
            </div>
            <div className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400">
              Analizando la foto con IA. Puede tardar unos segundos…
            </div>
          </div>
        )}

        {phase === 'review' && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Revisá y corregí los gastos detectados antes de guardar. Se reemplazarán todos los del
              mes.
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {drafts.map((d, i) => (
                <div key={i} className="space-y-2 glass rounded-2xl p-3">
                  {/* Fila superior: número + nombre + eliminar */}
                  <div className="flex items-center gap-2">
                    <span className="grad-lime shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <input
                      className={`${inputCls} flex-1 font-medium`}
                      value={d.name}
                      onChange={(e) => updateDraft(i, { name: e.target.value })}
                      placeholder="Nombre del gasto"
                    />
                    <button
                      type="button"
                      onClick={() => removeDraft(i)}
                      aria-label="Eliminar fila"
                      className="shrink-0 w-8 h-8 rounded-full glass text-neutral-400 hover:text-accent-red hover:opacity-80 transition dark:text-neutral-500"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Categoría */}
                  <select
                    className={`${inputCls}`}
                    value={d.category}
                    onChange={(e) => updateDraft(i, { category: e.target.value })}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {/* Montos con etiquetas claras */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-neutral-500 font-medium mb-0.5 dark:text-neutral-400">
                        Monto en pesos ($)
                      </label>
                      <MoneyInput
                        symbol="$"
                        value={arsTexts[i] ?? ''}
                        onChange={(v) => {
                          setArsTexts((prev) => prev.map((t, j) => (j === i ? v : t)));
                          updateDraft(i, { amountArs: parseText(v) });
                        }}
                        placeholder="450.000"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-neutral-500 font-medium mb-0.5 dark:text-neutral-400">
                        Monto en USD (u$d)
                      </label>
                      <MoneyInput
                        symbol="u$d"
                        value={usdTexts[i] ?? ''}
                        onChange={(v) => {
                          setUsdTexts((prev) => prev.map((t, j) => (j === i ? v : t)));
                          updateDraft(i, { amountUsd: parseText(v) ?? 0 });
                        }}
                        placeholder="10,90"
                      />
                    </div>
                  </div>

                  {/* Cotización USD (obligatoria si hay USD — el modelo NO la adivina) */}
                  {(parseText(usdTexts[i]) ?? 0) > 0 && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-accent-amber font-semibold mb-0.5">
                        Cotización USD ($ por 1 USD) *
                      </label>
                      <MoneyInput
                        symbol="$"
                        value={rateTexts[i] ?? ''}
                        onChange={(v) => {
                          setRateTexts((prev) => prev.map((t, j) => (j === i ? v : t)));
                          updateDraft(i, { usdRate: parseText(v) ?? 0 });
                        }}
                        placeholder="1.500"
                        required={(parseText(usdTexts[i]) ?? 0) > 0}
                      />
                      {(parseText(rateTexts[i]) ?? 0) <= 0 && (parseText(usdTexts[i]) ?? 0) > 0 && (
                        <p className="text-[10px] text-accent-amber mt-0.5">
                          Ingresá la cotización para calcular el total en pesos
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={addEmptyRow}
              >
                <Icon name="plus" size={14} /> Agregar fila
              </Button>
              <span className="opacity-70">
                Total: <span className="font-bold tabular-nums">{fmtARS(total, 0)}</span>
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              {hasMissingRate && (
                <p className="text-[11px] text-accent-amber col-span-2">
                  Cargá la cotización de cada gasto en USD para poder guardar.
                </p>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || hasMissingRate}
                title={hasMissingRate ? 'Cargá las cotizaciones de USD faltantes' : undefined}
                fullWidth
                className="disabled:opacity-40"
              >
                {saving ? 'Guardando…' : 'Guardar gastos'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPhase('capture');
                  setDrafts([]);
                }}
              >
                Otra foto
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Convierte un File/Blob a base64 comprimido (resize 1920px + JPEG 92%).
 * Usa createImageBitmap con imageOrientation: 'from-image' para respetar
 * la orientación EXIF de la cámara (sin esto, la foto del celular se dibuja
 * rotada/volteada en el canvas y LLaVA no puede leer el texto).
 */
export async function fileToBase64(file: File): Promise<string> {
  // Si createImageBitmap está disponible (Chrome/Edge/Android/iOS 15+),
  // lo usamos para respetar EXIF automáticamente. Fallback al método clásico.
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      // Foto de apuntes: alta definición (1 foto/mes, vale la pena la calidad)
      const MAX = 1920;
      let { width, height } = bitmap;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo procesar la imagen');
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      // Nivel 2: aumentar contraste y reducir brillo para resaltar la tinta (mejor OCR)
      enhanceContrast(ctx, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    } catch {
      // si falló el bitmap, seguimos al fallback de abajo
    }
  }

  // Fallback clásico (Safari viejo / soporte limitado)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const MAX = 1920;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) {
              height = Math.round((height * MAX) / width);
              width = MAX;
            } else {
              width = Math.round((width * MAX) / height);
              height = MAX;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo procesar la imagen'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          enhanceContrast(ctx, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          resolve(base64);
        } catch {
          reject(new Error('No se pudo procesar la imagen'));
        }
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Nivel 2: aumenta contraste y reduce brillo para resaltar la tinta (mejor OCR).
 * Usa filtro de imagen del canvas (contrast + brightness) sin librerías.
 */
function enhanceContrast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Contraste 1.35 y brillo -12: oscurece tinta y aclara papel
    const v = (pixel: number) => Math.min(255, Math.max(0, (pixel - 128) * 1.35 + 128 - 12));
    data[i] = v(data[i]);
    data[i + 1] = v(data[i + 1]);
    data[i + 2] = v(data[i + 2]);
  }
  ctx.putImageData(imageData, 0, 0);
}
