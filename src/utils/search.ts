/**
 * Ciclo de vida del buscador bajo demanda (estado puro, sin React).
 * Las transiciones se prueban en search.test.ts y se consumen desde App.tsx.
 */

export interface SearchState {
  open: boolean;
  query: string;
}

/** Buscador cerrado por defecto. */
export const SEARCH_CLOSED: SearchState = { open: false, query: '' };

/**
 * Abre el buscador.
 * Por diseño (UX aprobada), al abrir se limpia cualquier búsqueda previa
 * para que arranque vacío y con autofocus.
 */
export function openSearch(prev: SearchState = SEARCH_CLOSED): SearchState {
  return { open: true, query: '' };
}

/** Cierra el buscador y limpia la búsqueda. */
export function closeSearch(): SearchState {
  return { ...SEARCH_CLOSED };
}

/**
 * Cierra el buscador cuando se oculta del viewport (scroll).
 * Idempotente: si ya estaba cerrado, devuelve el mismo estado sin tocar la query.
 */
export function hideSearchFromScroll(state: SearchState): SearchState {
  return state.open ? { ...SEARCH_CLOSED } : state;
}

/** ¿El buscador debe mostrarse? (proxy de estado para el componente). */
export function shouldShowSearch(state: SearchState): boolean {
  return state.open;
}