import { describe, it, expect } from 'vitest';
import {
  SEARCH_CLOSED,
  openSearch,
  closeSearch,
  hideSearchFromScroll,
  shouldShowSearch,
} from './search.ts';

describe('search state puro', () => {
  it('parte cerrado y sin query', () => {
    expect(SEARCH_CLOSED).toEqual({ open: false, query: '' });
    expect(shouldShowSearch(SEARCH_CLOSED)).toBe(false);
  });

  it('abrir limpia cualquier búsqueda previa y lo muestra', () => {
    const result = openSearch({ open: true, query: 'alquiler' });
    expect(result).toEqual({ open: true, query: '' });
    expect(shouldShowSearch(result)).toBe(true);
  });

  it('abrir desde cerrado deja query vacía', () => {
    expect(openSearch(SEARCH_CLOSED)).toEqual({ open: true, query: '' });
  });

  it('cerrar desactiva y limpia la query', () => {
    expect(closeSearch()).toEqual({ open: false, query: '' });
  });

  it('hideSearchFromScroll cierra y limpia si estaba abierto', () => {
    const abierto = openSearch({ open: true, query: 'expensas' });
    const result = hideSearchFromScroll(abierto);
    expect(result).toEqual({ open: false, query: '' });
    expect(shouldShowSearch(result)).toBe(false);
  });

  it('hideSearchFromScroll es idempotente si ya estaba cerrado', () => {
    const cerrado = closeSearch();
    expect(hideSearchFromScroll(cerrado)).toBe(cerrado);
  });
});