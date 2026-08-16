import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pe-lock-hash';
const STORAGE_SALT_KEY = 'pe-lock-salt';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Hash SHA-256 (funciona en contextos seguros: HTTPS o localhost). */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export function useLock() {
  const [locked, setLocked] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHasPin(localStorage.getItem(STORAGE_KEY) !== null);
    // Sin PIN definido → sin bloqueo (se muestra el setup para crearlo)
    setLocked(localStorage.getItem(STORAGE_KEY) !== null);
    setReady(true);
  }, []);

  /** Crea (o reemplaza) el PIN: guarda hash SHA-256 con salt, nunca texto plano. */
  const setPin = useCallback(async (pin: string) => {
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const hash = await sha256(salt + ':' + pin);
    localStorage.setItem(STORAGE_SALT_KEY, salt);
    localStorage.setItem(STORAGE_KEY, hash);
    setHasPin(true);
    setLocked(false); // desbloquea al crear/cambiar
  }, []);

  /** Verifica un PIN contra el hash guardado. */
  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const salt = localStorage.getItem(STORAGE_SALT_KEY) ?? '';
    const storedHash = localStorage.getItem(STORAGE_KEY);
    if (!storedHash || !pin) return false;
    const hash = await sha256(salt + ':' + pin);
    return hash === storedHash;
  }, []);

  /** Intenta desbloquear. Devuelve true si el PIN es correcto. */
  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await verifyPin(pin);
    if (ok) setLocked(false);
    return ok;
  }, [verifyPin]);

  /** Bloquea la app (mantiene el PIN actual). */
  const lock = useCallback(() => setLocked(true), []);

  // Si no hay PIN, no tiene sentido estar "bloqueado"
  useEffect(() => {
    if (ready && !hasPin && locked) setLocked(false);
  }, [ready, hasPin, locked]);

  return { locked, hasPin, ready, setPin, unlock, lock };
}