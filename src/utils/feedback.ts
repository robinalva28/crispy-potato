/**
 * Feedback háptico y sonoro (WebAudio + navigator.vibrate).
 * Sin librerías externas: sonidos sintetizados con osciladores WebAudio
 * y patrones de vibración dinámicos vía Vibration API.
 *
 * Reglas:
 * - Respetar `prefers-reduced-motion`: si el usuario lo activó, no sonar ni vibrar.
 * - En desktop `navigator.vibrate` no existe: solo suena, no vibra.
 * - Todos los patrones son cortos y dinámicos, nada abrumador.
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
  freq: number;
  start: number; // offset en ms desde el inicio
  duration: number; // ms
  type?: OscillatorType;
  gain?: number; // 0..1
}

/** Secuencias de tonos para cada tipo de feedback. */
const TONES: Record<FeedbackType, ToneStep[]> = {
  // Arpegio ascendente suave y corto (crear mes, agregar gasto)
  success: [
    { freq: 523.25, start: 0, duration: 60, type: 'triangle', gain: 0.12 },
    { freq: 659.25, start: 50, duration: 60, type: 'triangle', gain: 0.12 },
    { freq: 783.99, start: 100, duration: 90, type: 'triangle', gain: 0.13 },
  ],
  // Pulso afirmativo muy suave (guardar edición)
  edit: [
    { freq: 587.33, start: 0, duration: 70, type: 'triangle', gain: 0.1 },
    { freq: 739.99, start: 40, duration: 60, type: 'triangle', gain: 0.1 },
  ],
  // Pulso afirmativo corto (marcar pagado / pendiente)
  toggle: [
    { freq: 880, start: 0, duration: 40, type: 'sine', gain: 0.12 },
    { freq: 1046.5, start: 25, duration: 50, type: 'sine', gain: 0.1 },
  ],
  // Descenso grave y firme (borrar)
  delete: [
    { freq: 440, start: 0, duration: 60, type: 'triangle', gain: 0.14 },
    { freq: 220, start: 45, duration: 80, type: 'triangle', gain: 0.12 },
  ],
  // Ascendente suave que "revive" (deshacer borrado)
  undo: [
    { freq: 220, start: 0, duration: 60, type: 'triangle', gain: 0.12 },
    { freq: 349.23, start: 40, duration: 70, type: 'triangle', gain: 0.12 },
    { freq: 440, start: 90, duration: 70, type: 'triangle', gain: 0.11 },
  ],
  // Nota grave con decay (cerrar mes = "candado")
  closeMonth: [
    { freq: 330, start: 0, duration: 70, type: 'sine', gain: 0.14 },
    { freq: 165, start: 55, duration: 110, type: 'sine', gain: 0.11 },
  ],
  // Ascenso ligero y abierto (reabrir mes)
  reopenMonth: [
    { freq: 440, start: 0, duration: 60, type: 'sine', gain: 0.11 },
    { freq: 660, start: 40, duration: 80, type: 'sine', gain: 0.1 },
  ],
  // Doble pulso seco y grave (validación fallida)
  error: [
    { freq: 220, start: 0, duration: 50, type: 'square', gain: 0.07 },
    { freq: 220, start: 70, duration: 50, type: 'square', gain: 0.07 },
  ],
};

/**
 * Patrones de vibración dinámicos (Vibration API: [duración, pausa, ...]).
 * Diseñados para ser cortos, con ritmo distinto por caso y nada abrumadores.
 */
const VIBRATIONS: Record<FeedbackType, number[]> = {
  // Triple pulso ascendente en intensidad (10 → 10 → 25)
  success: [10, 40, 10, 40, 25],
  // Doble pulso muy suave
  edit: [8, 30, 10],
  // Micro-pulso afirmativo, casi imperceptible
  toggle: [15, 40, 8],
  // Pulso firme que se corta (sensación de "eliminado")
  delete: [35, 50, 15],
  // Pulso suave "revive"
  undo: [10, 35, 20, 35, 10],
  // Firme y grave (cerrar candado)
  closeMonth: [45, 30, 10],
  // Ligero y abierto
  reopenMonth: [10, 30, 20, 30, 10],
  // Doble pulso igual, seco
  error: [30, 50, 30],
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

/** Reproduce una secuencia de tonos con WebAudio. */
function playTones(steps: ToneStep[]): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const step of steps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startAt = now + step.start / 1000;
    const duration = step.duration / 1000;
    const vol = step.gain ?? 0.1;

    osc.type = step.type ?? 'sine';
    osc.frequency.setValueAtTime(step.freq, startAt);
    // Fade suave para evitar clicks
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(vol, startAt + 0.008);
    gain.gain.setValueAtTime(vol, startAt + Math.max(0, duration - 0.02));
    gain.gain.linearRampToValueAtTime(0, startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
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