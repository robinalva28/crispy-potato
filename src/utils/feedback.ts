/**
 * Feedback háptico y sonoro moderno (WebAudio + navigator.vibrate).
 * Sin librerías externas: sonidos sintetizados con WebAudio
 * y patrones de vibración vía Vibration API.
 *
 * Estética de sonido:
 * - Nada de arpegios "Tetris": tonos únicos, cortos y con cuerpo.
 * - Cada sonido usa envelope de pitch (frecuencia que barre) +
 *   filtro lowpass + decay exponencial → "pops/blips" modernos
 *   estilo iOS/Android actual.
 *
 * Vibración:
 * - Duraciones mínimas de 25ms (los pulsos < 20ms son imperceptibles
 *   en la mayoría de los dispositivos y Android los descarta).
 * - Patrones claros y dinámicos, distintos por caso.
 *
 * Accesibilidad: respeta `prefers-reduced-motion`.
 */

export type FeedbackType =
  | 'success' // crear mes / agregar gasto / guardar
  | 'edit' // guardar edición (variante más suave)
  | 'toggle' // marcar pagado / pendiente
  | 'delete' // borrar gasto o segmento
  | 'undo' // deshacer borrado
  | 'closeMonth' // cerrar mes
  | 'reopenMonth' // reabrir mes
  | 'error'; // validación fallida

interface ToneStep {
  type?: OscillatorType;
  freq: number; // frecuencia inicial
  freqEnd?: number; // si existe, barre la frecuencia hasta acá (pitch envelope)
  duration: number; // ms
  gain?: number; // 0..1
  filter?: number; // frecuencia del lowpass (Hz)
  start?: number; // offset en ms desde el inicio
}

/** Secuencias de tonos para cada tipo de feedback. */
const TONES: Record<FeedbackType, ToneStep[]> = {
  // "Pop" limpio ascendente (crear mes, agregar gasto)
  success: [
    { freq: 480, freqEnd: 980, duration: 140, type: 'sine', gain: 0.22, filter: 1400 },
  ],
  // Doble "tic" muy suave (guardar edición)
  edit: [
    { freq: 620, freqEnd: 930, duration: 80, type: 'sine', gain: 0.16, filter: 2200 },
    { freq: 780, freqEnd: 1040, duration: 70, type: 'sine', gain: 0.13, filter: 2200, start: 45 },
  ],
  // "Blip" corto afirmativo (marcar pagado / pendiente) — estilo iOS
  toggle: [
    { freq: 880, freqEnd: 1320, duration: 60, type: 'sine', gain: 0.2, filter: 3000 },
  ],
  // "Swoosh" grave descendente (borrar)
  delete: [
    { freq: 320, freqEnd: 140, duration: 160, type: 'triangle', gain: 0.2, filter: 900 },
  ],
  // Ascenso suave que "revive" (deshacer borrado)
  undo: [
    { freq: 140, freqEnd: 330, duration: 150, type: 'triangle', gain: 0.18, filter: 1000 },
  ],
  // "Thud" grave de candado (cerrar mes)
  closeMonth: [
    { freq: 220, freqEnd: 120, duration: 260, type: 'sine', gain: 0.26, filter: 500 },
  ],
  // "Click" de apertura (reabrir mes)
  reopenMonth: [
    { freq: 440, freqEnd: 720, duration: 90, type: 'triangle', gain: 0.16, filter: 1800 },
  ],
  // Dos "thuds" suaves, sin square estridente (error)
  error: [
    { freq: 200, freqEnd: 160, duration: 70, type: 'sine', gain: 0.18, filter: 600 },
    { freq: 200, freqEnd: 160, duration: 70, type: 'sine', gain: 0.18, filter: 600, start: 95 },
  ],
};

/**
 * Patrones de vibración dinámicos (Vibration API: [duración, pausa, ...]).
 * Duraciones ≥ 25ms para que se SIENTAN en el dispositivo.
 */
const VIBRATIONS: Record<FeedbackType, number[]> = {
  // Escalera clara ascendente: 30 → 45 → 60
  success: [30, 45, 45, 45, 60],
  // Doble pulso perceptible
  edit: [30, 35, 45],
  // Doble pulso rápido y claro
  toggle: [35, 30, 30],
  // Pulso firme largo que se corta
  delete: [70, 45, 40],
  // Ritmo "revive": suave-largo-suave
  undo: [25, 45, 50, 45, 30],
  // Firme y grave (cerrar candado)
  closeMonth: [90, 40, 30],
  // Ligero y abierto
  reopenMonth: [30, 40, 55, 40, 25],
  // Doble seco, nada suave
  error: [60, 60, 60],
};

let audioCtx: AudioContext | null = null;

/** Crea (o reusa) el AudioContext. Debe llamarse tras un gesto del usuario. */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Reproduce un tono con pitch envelope, lowpass y decay exponencial. */
function playTone(ctx: AudioContext, step: ToneStep, startAt: number): void {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const duration = step.duration / 1000;
  const vol = step.gain ?? 0.15;
  const freqEnd = step.freqEnd ?? step.freq;

  osc.type = step.type ?? 'sine';
  // Pitch envelope: barre la frecuencia para dar el "pop" moderno
  osc.frequency.setValueAtTime(step.freq, startAt);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), startAt + duration);

  // Filtro lowpass: redondea el sonido (elimina la dureza "arcade")
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(step.filter ?? 2000, startAt);
  filter.frequency.exponentialRampToValueAtTime(Math.max(100, (step.filter ?? 2000) * 0.4), startAt + duration);
  filter.Q.setValueAtTime(0.8, startAt);

  // Envolvente con ataque rápido y decay EXPONENCIAL (decaimiento natural)
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(vol, startAt + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/** Reproduce una secuencia de tonos. */
function playTones(steps: ToneStep[]): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const step of steps) {
    const startAt = now + (step.start ?? 0) / 1000;
    playTone(ctx, step, startAt);
  }
}

/** Suena + vibra según el tipo de feedback. */
export function feedback(type: FeedbackType): void {
  if (prefersReducedMotion()) return;
  playTones(TONES[type]);
  if ('vibrate' in navigator) {
    navigator.vibrate(VIBRATIONS[type]);
  }
}