import { describe, it, expect } from 'vitest';
import { normalizeDrafts, mentionsUsd, normalizeText, matchKnownName, parseProseDrafts } from './photoExtract.ts';

describe('mentionsUsd', () => {
  it('detecta usd, u$d, dólar y dls', () => {
    expect(mentionsUsd('seguro 12 usd')).toBe(true);
    expect(mentionsUsd('compra u$d')).toBe(true);
    expect(mentionsUsd('pago en dólares')).toBe(true);
    expect(mentionsUsd('cotización dls')).toBe(true);
  });

  it('no detecta si no menciona USD', () => {
    expect(mentionsUsd('alquiler')).toBe(false);
    expect(mentionsUsd('supermercado')).toBe(false);
  });
});

describe('normalizeText / matchKnownName', () => {
  it('normaliza acentos y mayúsculas', () => {
    expect(normalizeText('  ALQUilEr ÁFrica ')).toBe('alquiler africa');
  });

  it('matchKnownName coincide exacto', () => {
    const known = { 'Alquiler': 'vivienda', 'Nafta': 'otros' };
    expect(matchKnownName('alquiler', known)).toEqual({ name: 'Alquiler', category: 'vivienda' });
  });

  it('matchKnownName coincide con errores (naffe → Nafta, distancia 2)', () => {
    const known = { 'Nafta': 'otros' };
    // "naffe" (6) vs "nafta" (5): distancia 2 — debe matchear con tolerancia 3
    const m = matchKnownName('naffe', known);
    expect(m).not.toBeNull();
    if (m) expect(m.name).toBe('Nafta');
  });

  it('matchKnownName devuelve null si no hay coincidencia', () => {
    expect(matchKnownName('supermercado', { Alquiler: 'vivienda' })).toBeNull();
  });
});

describe('parseProseDrafts', () => {
  it('parsea "Alquiler: 450000" como ARS', () => {
    const drafts = parseProseDrafts('Alquiler: 450000');
    expect(drafts[0].name).toBe('Alquiler');
    expect(drafts[0].amountArs).toBe(450000);
    expect(drafts[0].amountUsd).toBe(0);
  });

  it('parsea "Seguro 12 usd" como USD', () => {
    const drafts = parseProseDrafts('Seguro 12 usd');
    expect(drafts[0].name).toBe('Seguro');
    expect(drafts[0].amountArs).toBeNull();
    expect(drafts[0].amountUsd).toBe(12);
  });

  it('parsea varias líneas con viñetas', () => {
    const drafts = parseProseDrafts('- Alquiler: 450000\n- Nafta 25000');
    expect(drafts).toHaveLength(2);
    expect(drafts[0].name).toBe('Alquiler');
    expect(drafts[1].name).toBe('Nafta');
  });

  it('ignora líneas sin números (títulos)', () => {
    const drafts = parseProseDrafts('Gastos de julio\nAlquiler: 450000');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].name).toBe('Alquiler');
  });

  it('devuelve [] si no hay líneas con montos', () => {
    expect(parseProseDrafts('No hay gastos\nSin números aquí')).toHaveLength(0);
  });
});

describe('normalizeDrafts', () => {
  it('descarta amountUsd si el nombre no menciona USD (moneda dominante ARS)', () => {
    const drafts = normalizeDrafts([
      { name: 'Alquiler', category: 'vivienda', amountArs: 450000, amountUsd: 45000 },
    ]);
    expect(drafts[0].amountArs).toBe(450000);
    expect(drafts[0].amountUsd).toBe(0);
  });

  it('mantiene USD si el nombre menciona "usd" y no hay ARS', () => {
    const drafts = normalizeDrafts([
      { name: 'Seguro 12 usd', category: 'salud', amountArs: 0, amountUsd: 12 },
    ]);
    expect(drafts[0].amountArs).toBeNull();
    expect(drafts[0].amountUsd).toBe(12);
  });

  it('descarta USD duplicado exacto (invento del modelo)', () => {
    const drafts = normalizeDrafts([
      { name: 'Nafta', category: 'otros', amountArs: 25000, amountUsd: 25000 },
    ]);
    expect(drafts[0].amountArs).toBe(25000);
    expect(drafts[0].amountUsd).toBe(0);
  });

  it('descarta montos absurdos (>= 50M) en ARS', () => {
    const drafts = normalizeDrafts([
      { name: 'Gastos totales', category: 'otros', amountArs: 1333333333, amountUsd: 0 },
    ]);
    expect(drafts[0].amountArs).toBeNull();
  });

  it('normaliza categorías a minúsculas y desconocidas a "otros"', () => {
    const drafts = normalizeDrafts([
      { name: 'Super', category: 'Vivienda', amountArs: 185000, amountUsd: 0 },
      { name: 'x', category: 'Todos', amountArs: 100, amountUsd: 0 },
    ]);
    expect(drafts[0].category).toBe('vivienda');
    expect(drafts[1].category).toBe('otros');
  });

  it('fuerza usdRate a 0 siempre', () => {
    const drafts = normalizeDrafts([
      { name: 'Compra', category: 'tarjetas', amountArs: null, amountUsd: 10.9, usdRate: 3.33 },
    ]);
    expect(drafts[0].usdRate).toBe(0);
  });
});