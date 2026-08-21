import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button.tsx';
import { Icon, type IconName } from './ui/Icon.tsx';

type GuideType = 'budget' | 'savings';

interface Chapter {
  id: string;
  icon: IconName;
  title: string;
  text: string;
  action?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  type?: GuideType;
  /** CTA "Probar ahora": cierra la guía y dispara la acción real en App. */
  onAction?: (action: string) => void;
}

const BUDGET_CHUNKS: Chapter[] = [
  {
    id: 'first',
    icon: 'calendar',
    title: 'Primeros pasos',
    text: 'La app arranca vacía. Tocá "+ Mes" y creá el mes con tu ingreso. Al crear el mes siguiente se clonan los gastos del anterior como plantilla.',
    action: 'create-month',
  },
  {
    id: 'add',
    icon: 'plus',
    title: 'Cargar gastos',
    text: 'Tocá el botón "+" y elegí "Agregar Gasto". Completá nombre, categoría y monto. Guardalo y queda listo: podés editarlo, duplicarlo y borrarlo con deshacer.',
    action: 'add-expense',
  },
  {
    id: 'states',
    icon: 'checkCircle',
    title: 'Estados y estimados',
    text: 'Cada gasto tiene estado: Pagado (✓), Pendiente (~) o "Por confirmar" si cargás un estimado sin el monto real. Al confirmar el monto, pasa a pagado automáticamente.',
  },
  {
    id: 'usd',
    icon: 'dollar',
    title: 'Gastos en dólares',
    text: 'Si tu tarjeta trae consumos en USD, activá "u$d" en Montos y cargá el monto + la cotización. El total en pesos se calcula solo.',
  },
  {
    id: 'scan',
    icon: 'receipt',
    title: 'Escanear factura',
    text: 'Dentro de "Agregar Gasto" tocá el botón de escaneo (ícono de scanner) y sacale una foto al comprobante: la app autocompleta nombre, monto y fecha.',
    action: 'scan',
  },
  {
    id: 'photo',
    icon: 'image',
    title: 'Foto de apuntes',
    text: 'Desde el botón "+" elegí "Foto de apuntes": cargá varios gastos de una sola foto de tu lista manuscrita. Reemplaza el mes completo (máximo 1 uso).',
    action: 'photo',
  },
  {
    id: 'organize',
    icon: 'barChart',
    title: 'Organizar',
    text: 'En "⋯ Más" podés agrupar por categoría, definir presupuestos por categoría (con semáforo de alerta) y buscar entre tus gastos con la lupa.',
    action: 'organize',
  },
  {
    id: 'month',
    icon: 'lock',
    title: 'El mes',
    text: 'Cuando termine el mes, cerralo desde "⋯ Más": queda como histórico inmutable con sus chips grises. Podés reabrirlo si te equivocaste.',
    action: 'close-month',
  },
  {
    id: 'savings',
    icon: 'target',
    title: 'Ahorro',
    text: 'En la vista "Ahorro" creá segmentos (ej: Auto, Vacaciones) con un rango de meses e ingresos extra. La app proyecta cuánto podés ahorrar.',
    action: 'savings',
  },
  {
    id: 'backup',
    icon: 'download',
    title: 'Backup y offline',
    text: 'Exportá e importá tus datos desde "⋯ Más", instalá la app en tu celu para usarla offline y personalizá tema, sonidos y vibraciones.',
    action: 'export',
  },
];

const SAVINGS_CHUNKS: Chapter[] = [
  {
    id: 'goal',
    icon: 'target',
    title: 'Segmentos de ahorro',
    text: 'Creá un segmento con nombre, por ejemplo "Auto", "Vacaciones" o "Fondo emergencia". Cada segmento proyecta cuánto podés ahorrar en un rango de meses.',
  },
  {
    id: 'range',
    icon: 'calendar',
    title: 'Elegí el rango',
    text: 'Seleccioná "Desde" y "Hasta" (puede cruzar de año, ej: Agosto 2026 → Febrero 2027). Cada mes del rango suma su ahorro proyectado.',
  },
  {
    id: 'calc',
    icon: 'barChart',
    title: '¿Cómo se calcula?',
    text: 'Ahorro del mes = Ingreso del mes − Gastos proyectados. Los meses futuros sin cargar usan el resto del último mes cerrado como referencia consistente (marcados con "≈ estimado").',
  },
  {
    id: 'extra',
    icon: 'wallet',
    title: 'Ingresos extra',
    text: 'Agregá bonos, aguinaldos o ventas previstas con su mes. Se suman al ahorro del mes en que caen.',
  },
  {
    id: 'preview',
    icon: 'calculator',
    title: 'Preview y seguimiento',
    text: 'El formulario muestra el ahorro proyectado total en vivo. En la tarjeta del segmento ves el desglose mes a mes y el total. Podés editar o eliminar los segmentos cuando quieras.',
  },
];

export function GuideModal({ open, onClose, type = 'budget', onAction }: Props) {
  const chapters = type === 'savings' ? SAVINGS_CHUNKS : BUDGET_CHUNKS;
  const [step, setStep] = useState<number | null>(null); // null = cover
  const touchX = useRef<number | null>(null);
  const total = chapters.length;

  // Reinicia al cover cada vez que se abre
  useEffect(() => {
    if (open) setStep(null);
  }, [open]);

  if (!open) return null;

  const current = step != null ? chapters[step] : null;

  function goPrev() {
    if (step == null) return;
    setStep((s) => (s == null ? null : Math.max(0, s - 1)));
  }
  function goNext() {
    if (step == null) return;
    setStep((s) => {
      if (s == null) return null;
      return s < total - 1 ? s + 1 : s;
    });
  }

  /** Swipe horizontal para navegar capítulos. */
  function handleTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null || step == null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) setStep((s) => (s == null ? null : Math.min(total - 1, s + 1)));
    else setStep((s) => (s == null ? null : Math.max(0, s - 1)));
  }

  /** "Probar ahora": dispara la acción real y cierra. */
  function handleAction(action?: string) {
    if (action && onAction) onAction(action);
    else onClose();
  }

  return (
    <div className="modal-overlay fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-card rounded-3xl guide-modal">
        {/* Header con gradiente + barra de progreso (cover: índice) */}
        <div className="grad-lime-strong px-5 pt-5 pb-3 text-white guide-head">
          {step == null ? (
            <>
              <div className="mb-1"><Icon name="sparkles" size={28} strokeWidth={1.75} /></div>
              <h2 className="text-lg font-bold">{type === 'savings' ? 'Guía de Ahorro' : 'Bienvenido a Aura'}</h2>
              <p className="text-[11px] mt-1 opacity-80">Tu presupuesto, en una sola hoja. Elegí un tema para empezar.</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <Icon name={current!.icon} size={22} strokeWidth={1.75} />
                <div>
                  <div className="text-[11px] font-semibold opacity-80">
                    {step + 1} / {total} · {current!.title}
                  </div>
                  <h2 className="text-lg font-bold leading-tight">{current!.title}</h2>
                </div>
              </div>
              <div className="guide-progress">
                <div className="guide-progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
              </div>
            </>
          )}
        </div>

        {/* Cuerpo: índice (cover) o capítulo */}
        <div className="px-5 py-4">
          {step == null ? (
            <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  type="button"
                  className="guide-cap"
                  onClick={() => setStep(i)}
                >
                  <span className="ico"><Icon name={ch.icon} size={16} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-semibold">{ch.title}</span>
                    <span className="block text-[10px] opacity-50 truncate">{ch.text.slice(0, 52)}…</span>
                  </span>
                  <Icon name="chevronDown" size={14} className="rotate-[-90deg] shrink-0 opacity-40" />
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Chips de capítulo (navegación directa) */}
              <div className="guide-chips -mx-1 px-1">
                {chapters.map((ch, i) => (
                  <button
                    key={ch.id}
                    type="button"
                    className={`guide-chip ${i === step ? 'on' : ''}`}
                    onClick={() => setStep(i)}
                  >
                    {i + 1}. {ch.title}
                  </button>
                ))}
              </div>

              {/* Texto del capítulo */}
              <div className="guide-body -mx-1 px-1">
                <p className="text-sm leading-relaxed opacity-80 min-h-[64px] flex items-center">
                  {current!.text}
                </p>
              </div>

              {/* Dots */}
              <div className="guide-dots py-1">
                {chapters.map((_, i) => (
                  <span key={i} className={`guide-dot ${i === step ? 'on' : ''}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5">
          {step == null ? (
            <div className="flex items-center justify-between gap-2">
              <button type="button" className="guide-skip" onClick={onClose}>
                Saltar guía
              </button>
              <Button onClick={() => setStep(0)}>
                Empezar <Icon name="chevronDown" size={14} className="ml-1 rotate-[-90deg]" />
              </Button>
            </div>
          ) : (
            <>
              <div className="guide-actions">
                <Button variant="ghost" onClick={goPrev} disabled={step === 0} className="disabled:opacity-30">
                  ← Atrás
                </Button>
                {step < total - 1 ? (
                  <Button onClick={goNext}>
                    Siguiente →
                  </Button>
                ) : (
                  <Button onClick={() => handleAction(current?.action)}>¡Listo!</Button>
                )}
              </div>
              <div className="flex justify-center mt-3">
                <button type="button" className="guide-skip" onClick={onClose}>
                  Saltar guía
                </button>
              </div>
            </>
          )}
        </div>

        {/* Zona táctil de swipe solo en capítulos */}
        {step != null && (
          <div
            className="absolute inset-y-0 left-0 right-0 pointer-events-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}
      </div>
    </div>
  );
}