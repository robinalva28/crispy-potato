import { useState } from 'react';
import { Button } from './ui/Button.tsx';

type GuideType = 'budget' | 'savings';

interface Props {
  open: boolean;
  onClose: () => void;
  type?: GuideType;
}

const BUDGET_STEPS = [
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

const SAVINGS_STEPS = [
  {
    icon: '🎯',
    title: 'Segmentos de ahorro',
    text: 'Creá un segmento con nombre, por ejemplo "Auto", "Vacaciones" o "Fondo emergencia". Cada segmento proyecta cuánto podés ahorrar en un rango de meses.',
  },
  {
    icon: '🗓️',
    title: 'Elegí el rango',
    text: 'Seleccioná "Desde" y "Hasta" (puede cruzar de año, ej: Agosto 2026 → Febrero 2027). Cada mes del rango suma su ahorro proyectado.',
  },
  {
    icon: '📊',
    title: '¿Cómo se calcula?',
    text: 'Ahorro del mes = Ingreso del mes − Gastos proyectados. Los meses FUTUROS sin cargar usan el resto del ÚLTIMO MES CERRADO como referencia consistente (marcados con "≈ estimado").',
  },
  {
    icon: '💰',
    title: 'Ingresos extra',
    text: 'Agregá bonos, aguinaldos o ventas previstas con su mes. Se suman al ahorro del mes en que caen. Ej: "Bono fin de año" $1.500.000 en Noviembre.',
  },
  {
    icon: '🧮',
    title: 'Preview y seguimiento',
    text: 'El formulario muestra el ahorro proyectado total en vivo. En la tarjeta del segmento ves el desglose mes a mes y el total. Podés editar o eliminar los segmentos cuando quieras.',
  },
];

export function GuideModal({ open, onClose, type = 'budget' }: Props) {
  const [step, setStep] = useState(0);
  const steps = type === 'savings' ? SAVINGS_STEPS : BUDGET_STEPS;

  if (!open) return null;

  const current = steps[step];

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-card rounded-3xl overflow-hidden">
        {/* Encabezado */}
        <div className="grad-lime-strong px-5 pt-5 pb-3 text-white">
          <div className="text-3xl mb-1">{current.icon}</div>
          <h2 className="text-lg font-bold">{current.title}</h2>
          <p className="text-[11px] mt-1 opacity-80">
            Paso {step + 1} de {steps.length}
          </p>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4 min-h-[120px]">
          <p className="text-sm leading-relaxed opacity-80">
            {current.text}
          </p>
        </div>

        {/* Controles */}
        <div className="px-5 pb-5 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="disabled:opacity-30"
          >
            ← Atrás
          </Button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
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

          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            >
              Siguiente →
            </Button>
          ) : (
            <Button onClick={onClose}>
              ¡Listo!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}