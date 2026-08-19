/**
 * Helpers para carga de montos en formato es-AR
 * (acepta "1.234,56", "1234.56", "1234,56" → 1234.56)
 */

/** Separa el texto agrupador de miles (punto en es-AR) para obtener string numérica. */
export function stripThousands(input: string): string {
  return input.replace(/\./g, '');
}

/**
 * Convierte una string escrita por el usuario a number.
 * Acepta separador de miles (punto) y decimal (coma o punto).
 */
export function parseLocalNumber(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  let normalized = trimmed;
  // Si hay coma, es el separador decimal
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, ''); // quitar miles
    normalized = normalized.replace(',', '.'); // coma → punto decimal
  } else {
    // Sin coma:
    // - "850.000" y "1.234.567" → los puntos son separadores de miles (formato es-AR)
    // - "850.5" / "10.90" / "850" → un solo punto es decimal (o no hay)
    if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
      normalized = normalized.replace(/\./g, '');
    } else if (normalized.split('.').length > 2) {
      // Varios puntos que no siguen el patrón de miles: conservar el último como decimal
      const parts = normalized.split('.');
      normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Formatea un número con formato es-AR para el input (punto de miles, coma decimal). */
export function formatInputNumber(value: number | null, decimals = 2): string {
  if (value == null) return '';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formatea el texto de un input de monto EN VIVO mientras se escribe (es-AR):
 * - Separa miles con "." automáticamente: "1000000" → "1.000.000"
 * - Acepta "." o "," como separador decimal: "5500.56" → "5.500,56"
 * - Mantiene el decimal en curso ("5,") y limita a 2 decimales.
 * - Devuelve string (no modifica números ya formateados con coma).
 */
export function formatInputString(raw: string): string {
  // Si no hay nada que formatear, devolver tal cual
  if (raw === '') return '';

  // Normalizar: ambos separadores decimales ('.' o ',') pasan a cuenta propia
  let hasDecimal = raw.includes(',');
  let integerPart = '';
  let decimalPart = '';

  if (hasDecimal) {
    const parts = raw.split(',');
    integerPart = parts[0].replace(/\./g, '');
    decimalPart = parts[1];
  } else {
    // Sin coma: puntos pueden ser miles o un decimal suelto.
    const dotCount = (raw.match(/\./g) || []).length;
    if (dotCount > 0) {
      const parts = raw.split('.');
      // Si el patrón es de miles puro (1.234.567) → sin decimal
      if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
        integerPart = raw.replace(/\./g, '');
        decimalPart = '';
      } else {
        // Caso decimal: la última parte después del último punto es decimal
        integerPart = parts.slice(0, -1).join('').replace(/\./g, '');
        decimalPart = parts[parts.length - 1];
        hasDecimal = true;
      }
    } else {
      integerPart = raw;
      decimalPart = '';
    }
  }

  // Limpiar caracteres no numéricos
  integerPart = integerPart.replace(/\D/g, '');
  decimalPart = decimalPart.replace(/\D/g, '').slice(0, 2);

  // Formatear miles con separador es-AR
  const thousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Armar el resultado
  let result = thousands;
  if (hasDecimal || raw.endsWith(',') || raw.endsWith('.')) {
    result += ',';
    if (decimalPart) result += decimalPart;
  }
  return result;
}
