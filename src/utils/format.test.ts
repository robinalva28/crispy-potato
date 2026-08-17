import { describe, it, expect } from 'vitest';
import { parseLocalNumber, formatInputNumber, stripThousands } from './format.ts';

describe('parseLocalNumber', () => {
  it('parsea enteros simples', () => {
    expect(parseLocalNumber('850')).toBe(850);
    expect(parseLocalNumber('0')).toBe(0);
  });

  it('parsea miles es-AR con un solo punto (bug: 850.000 → 850)', () => {
    expect(parseLocalNumber('850.000')).toBe(850000);
    expect(parseLocalNumber('450.000')).toBe(450000);
    expect(parseLocalNumber('1.300')).toBe(1300);
  });

  it('parsea miles es-AR con varios puntos', () => {
    expect(parseLocalNumber('1.234.567')).toBe(1234567);
    expect(parseLocalNumber('2.500.000')).toBe(2500000);
  });

  it('parsea decimales con coma (es-AR)', () => {
    expect(parseLocalNumber('10,90')).toBe(10.9);
    expect(parseLocalNumber('1.234,56')).toBe(1234.56);
    expect(parseLocalNumber('850,5')).toBe(850.5);
  });

  it('parsea decimales con punto cuando no es patrón de miles', () => {
    expect(parseLocalNumber('850.5')).toBe(850.5);
    expect(parseLocalNumber('10.90')).toBe(10.9);
  });

  it('devuelve null para vacío y no numérico', () => {
    expect(parseLocalNumber('')).toBeNull();
    expect(parseLocalNumber('   ')).toBeNull();
    expect(parseLocalNumber('abc')).toBeNull();
  });
});

describe('formatInputNumber', () => {
  it('formatea con miles es-AR y devuelve "" para null', () => {
    expect(formatInputNumber(850000)).toBe('850.000');
    expect(formatInputNumber(1234567)).toBe('1.234.567');
    expect(formatInputNumber(null)).toBe('');
  });

  it('round-trip: lo que formatea, lo puede volver a parsear', () => {
    for (const n of [850, 850000, 1234.56, 2500000]) {
      expect(parseLocalNumber(formatInputNumber(n))).toBe(n);
    }
  });
});

describe('stripThousands', () => {
  it('elimina los puntos de miles', () => {
    expect(stripThousands('1.234.567,89')).toBe('1234567,89');
  });
});