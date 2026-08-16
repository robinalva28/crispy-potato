import { useEffect, useRef, useState } from 'react';
import type { Month } from '../types.ts';
import { extractExpensesFromImage, type ExpenseDraft } from '../utils/photoExtract.ts';
import { CATEGORY_LABELS, fmtARS } from '../utils/money.ts';
import { canUsePhoto } from '../utils/monthUtils.ts';

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
  }

  function addEmptyRow() {
    setDrafts((prev) => [
      ...prev,
      { name: '', category: 'otros', amountArs: null, amountUsd: 0, usdRate: 0, notes: '' },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(drafts, month.id);
      onClose();
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const total = drafts.reduce((sum, d) => sum + (d.amountArs ?? 0) + (d.amountUsd * d.usdRate), 0);

  const inputCls =
    'w-full px-2 py-1 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-4 space-y-3 dark:bg-neutral-900 dark:border dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="font-bold text-neutral-900 dark:text-neutral-100">
            📷 Foto de apuntes — {month.label}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900">
            ⚠️ {error}
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={!canUsePhoto(month)}
              className="w-full px-3 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              📷 Tomar foto de los apuntes
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <div className="text-3xl mb-2 animate-spin inline-block">⏳</div>
            <div>Leyendo tus apuntes…</div>
          </div>
        )}

        {phase === 'review' && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Revisá y corregí los gastos detectados antes de guardar. Se reemplazarán todos los del
              mes.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {drafts.map((d, i) => (
                <div
                  key={i}
                  className="space-y-1 border border-neutral-200 dark:border-neutral-800 rounded-md p-2"
                >
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      value={d.name}
                      onChange={(e) => updateDraft(i, { name: e.target.value })}
                      placeholder="Nombre"
                    />
                    <select
                      className={`${inputCls} shrink-0 w-28`}
                      value={d.category}
                      onChange={(e) => updateDraft(i, { category: e.target.value })}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeDraft(i)}
                      className="text-neutral-300 hover:text-red-500 shrink-0 dark:text-neutral-600 dark:hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      inputMode="decimal"
                      value={d.amountArs ?? ''}
                      onChange={(e) =>
                        updateDraft(i, {
                          amountArs: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Monto ARS"
                    />
                    <input
                      className={inputCls}
                      inputMode="decimal"
                      value={d.amountUsd > 0 ? String(d.amountUsd) : ''}
                      onChange={(e) => updateDraft(i, { amountUsd: Number(e.target.value) || 0 })}
                      placeholder="USD"
                    />
                    <input
                      className={inputCls}
                      inputMode="decimal"
                      value={d.usdRate > 0 ? String(d.usdRate) : ''}
                      onChange={(e) => updateDraft(i, { usdRate: Number(e.target.value) || 0 })}
                      placeholder="Cotización"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={addEmptyRow}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400"
              >
                ➕ Agregar fila
              </button>
              <span className="text-neutral-600 dark:text-neutral-300">
                Total: <span className="font-bold">{fmtARS(total, 0)}</span>
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-40"
              >
                {saving ? 'Guardando…' : 'Guardar gastos'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase('capture');
                  setDrafts([]);
                }}
                className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Otra foto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Convierte un File/Blob a base64 comprimido (resize a máx 1024px + JPEG 80%). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          // Redimensionar a máx 1024px (la foto del celular es enorme y causa timeout)
          const MAX = 1024;
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

          // JPEG calidad 0.8 — muchísimo más liviano que la foto original
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
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
