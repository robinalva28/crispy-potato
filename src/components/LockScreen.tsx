import { useState } from 'react';

interface Props {
  hasPin: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
  onSetPin: (pin: string) => Promise<void>;
}

export function LockScreen({ hasPin, onUnlock, onSetPin }: Props) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!hasPin) {
      // Setup: crear PIN
      if (pin.length < 4) {
        setError('El PIN debe tener al menos 4 dígitos.');
        return;
      }
      if (pin !== confirmPin) {
        setError('Los PIN no coinciden. Intentá de nuevo.');
        return;
      }
      await onSetPin(pin);
      return;
    }

    // Desbloqueo
    const ok = await onUnlock(pin);
    if (!ok) {
      setError('PIN incorrecto.');
      setPin('');
    }
  }

  const inputCls =
    'w-full max-w-[220px] px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-neutral-900 dark:bg-neutral-950">
      <div className="w-16 h-16 mb-4 rounded-2xl bg-emerald-500 flex items-center justify-center text-3xl text-white shadow-lg">
        🔒
      </div>
      <h1 className="text-xl font-bold text-white mb-1">Presupuesto Mensual</h1>
      <p className="text-sm text-neutral-400 mb-8">
        {hasPin ? 'Ingresá tu PIN para desbloquear' : 'Creá un PIN para proteger tus datos (4+ dígitos)'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full">
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          className={inputCls}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          maxLength={10}
        />

        {!hasPin && (
          <input
            type="password"
            inputMode="numeric"
            className={inputCls}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Repetir"
            maxLength={10}
          />
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          className="w-full max-w-[220px] px-4 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition"
        >
          {hasPin ? 'Desbloquear' : 'Crear PIN y entrar'}
        </button>
      </form>
    </div>
  );
}