import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pe-dark-mode';

function getInitial(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return true; // oscuro por defecto
}

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(getInitial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);

  return { dark, toggle };
}