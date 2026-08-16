/**
 * Hook de feedback háptico/sonoro.
 * Expone métodos por caso. El estado del toggle "Sonidos" lo controla App
 * (para que re-renderice al cambiar), y se persiste en localStorage.
 */
import { useCallback } from 'react';
import { feedback as feedbackFn, type FeedbackType } from '../utils/feedback.ts';

export const SOUND_KEY = 'pe-sound-enabled-v2';

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

export function useFeedback(soundEnabled: boolean) {
  const run = useCallback(
    (type: FeedbackType) => {
      if (!soundEnabled) return;
      feedbackFn(type);
    },
    [soundEnabled]
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
