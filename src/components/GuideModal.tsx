import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: '🗓️',
    title: 'Planificá tu mes',
    text: 'Al principio del mes tocá "+ Crear Mes" con tu ingreso. La app clona los gastos del mes anterior como plantilla. Después podés borrar los que no apliquen y agregar los nuevos.',
  },
  {
    icon: '💵',
    title: 'Cargá tus gastos',
    text: 'Tocá "+ Agregar Gasto". Completá el nombre, categoría y monto. Si el monto es estimado (factura que no llegó), dejá "Monto ARS" vacío y cargá "Estimado ARS": el gasto queda "por confirmar" (~).',
  },
  {
    icon: '🇺🇸',
    title: 'Gastos con USD',
    text: 'Si tu tarjeta trae consumos en dólares (ej: $50.000 + US$20), cargá el monto ARS, el monto USD y la cotización. La app calcula el total real automáticamente.',
  },
  {
    icon: '✅',
    title: 'Marcá lo pagado',
    text: 'Tocá el check ✓ de cada gasto al pagarlo. Los gastos pendientes quedan resaltados en ámbar.',
  },
  {
    icon: '📊',
    title: 'Mirá los 3 números',
    text: 'Confirmado (montos reales) · Proyectado (incluye estimados) · Resto (ahorro proyectado = ingreso − proyectado). Si querés la vista por categoría, tocá "🗂 Agrupar por categoría".',
  },
  {
    icon: '📱',
    title: 'Instalala en tu celu',
    text: 'Desde el navegador del celular tocá "Agregar a pantalla de inicio" (o "Instalar app"). Funciona offline. Hacé "Exportar JSON" de vez en cuando para respaldar.',
  },
];

export function GuideModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden dark:bg-neutral-900 dark:border dark:border-neutral-800">
        {/* Encabezado */}
        <div className="px-5 pt-5 pb-3 bg-emerald-600 text-white">
          <div className="text-3xl mb-1">{current.icon}</div>
          <h2 className="text-lg font-bold">{current.title}</h2>
          <p className="text-[11px] text-emerald-100 mt-1 opacity-80">
            Paso {step + 1} de {STEPS.length}
          </p>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4 min-h-[120px]">
          <p className="text-sm text-neutral-700 leading-relaxed dark:text-neutral-300">
            {current.text}
          </p>
        </div>

        {/* Controles */}
        <div className="px-5 pb-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md disabled:opacity-30 hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            ← Atrás
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Paso ${i + 1}`}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === step ? 'bg-emerald-500 scale-110' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="px-3 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition"
            >
              ¡Empezar!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}