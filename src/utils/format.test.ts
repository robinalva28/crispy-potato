import { describe, it, expect } from 'vitest';
import { parseLocalNumber, formatInputNumber, formatInputString, stripThousands } from './format.ts';

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

describe('formatInputString', () => {
  it('formatea miles automáticamente sin separadores', () => {
    expect(formatInputString('1000000')).toBe('1.000.000');
    expect(formatInputString('850')).toBe('850');
    expect(formatInputString('')).toBe('');
  });

  it('mantiene los miles ya formateados', () => {
    expect(formatInputString('1.000.000')).toBe('1.000.000');
    expect(formatInputString('5.500')).toBe('5.500');
  });

  it('acepta coma como decimal (es-AR)', () => {
    expect(formatInputString('5500,56')).toBe('5.500,56');
    expect(formatInputString('1234,5')).toBe('1.234,5');
  });

  it('un punto final abre el decimal en curso', () => {
    expect(formatInputString('5500.')).toBe('5.500,');
    expect(formatInputString('1234,')).toBe('1.234,');
  });

  it('limita los decimales a 2 dígitos', () => {
    expect(formatInputString('1234,567')).toBe('1.234,56');
  });

  it('no se traba al borrar dígitos de un miles incompleto (bug: 1.00 → 100)', () => {
    // Tras borrar un 0 de "1.000" queda "1.00": debe seguir siendo miles incompletos
    expect(formatInputString('1.00')).toBe('100');
    // Y al agregar el próximo dígito reconstruye los miles
    expect(formatInputString('1.000')).toBe('1.000');
    expect(formatInputString('8.')).toBe('8,');
    expect(formatInputString('85.')).toBe('85,');
    expect(formatInputString('850.')).toBe('850,');
  });

  it('ignora puntos en medio sin romper el entero (punto = miles)', () => {
    expect(formatInputString('12.34')).toBe('1.234');
    expect(formatInputString('1.234.5')).toBe('12.345');
  });
});
