/**
 * Hook de feedback háptico/sonoro.
 * Los toggles "Sonidos" y "Vibraciones" son INDEPENDIENTES: los controla App
 * (para que re-renderice al cambiar) y se persisten en localStorage por separado.
 * - Sonidos: DESACTIVADOS por defecto (clave SOUND_KEY).
 * - Vibraciones: ACTIVADAS por defecto (clave VIBRATION_KEY).
 */
import { useCallback } from 'react';
import { playSound, playVibration, type FeedbackType } from '../utils/feedback.ts';

export const SOUND_KEY = 'pe-sound-enabled-v2';
export const VIBRATION_KEY = 'pe-vibration-enabled';

export function soundEnabledFromStorage(): boolean {
  try {
    // Migración: si existía la clave v1 (activada para probar), la ignoramos.
    // El sonido arranca DESACTIVADO por defecto en todos los dispositivos.
    if (localStorage.getItem(SOUND_KEY) === null) {
      localStorage.setItem(SOUND_KEY, '0');
      localStorage.removeItem('pe-sound-enabled');
    }
    return localStorage.getItem(SOUND_KEY) === '1';
  } catch {
    return false;
  }
}

export function vibrationEnabledFromStorage(): boolean {
  try {
    // La vibración arranca ACTIVADA por defecto en todos los dispositivos.
    if (localStorage.getItem(VIBRATION_KEY) === null) {
      localStorage.setItem(VIBRATION_KEY, '1');
    }
    return localStorage.getItem(VIBRATION_KEY) === '1';
  } catch {
    return true;
  }
}

export function useFeedback(soundEnabled: boolean, vibrationEnabled: boolean) {
  const run = useCallback(
    (type: FeedbackType) => {
      if (soundEnabled) playSound(type);
      if (vibrationEnabled) playVibration(type);
    },
    [soundEnabled, vibrationEnabled]
  );

  return {
    success: () => run('success'),
    edit: () => run('edit'),
    toggle: () => run('toggle'),
    delete: () => run('delete'),
    undo: () => run('undo'),
    closeMonth: () => run('closeMonth'),
    reopenMonth: () => run('reopenMonth'),
    error: () => run('error'),
  };
}
