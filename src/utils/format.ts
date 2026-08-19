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
 * - El punto SIEMPRE separa miles (se ignora al reconstruir): "1000000" → "1.000.000"
 * - La coma es el separador decimal: "5500,56" → "5.500,56"
 * - Un punto final abre el decimal en curso: "5500." → "5.500,"
 * - Limita los decimales a 2 dígitos.
 * - Devuelve string (no modifica números ya formateados con coma).
 *
 * NOTA: la regla "el punto siempre es miles" evita que al borrar dígitos de un
 * miles incompleto (ej. "1.000" → "1.00") se reinterprete como decimal ("1,00")
 * y el input se trabe sin poder reconstruir los miles.
 */
export function formatInputString(raw: string): string {
  // Si no hay nada que formatear, devolver tal cual
  if (raw === '') return '';

  // La coma es el separador decimal; todo lo anterior es la parte entera
  let integerRaw = raw;
  let decimalPart = '';
  let forceDecimal = false;

  if (raw.includes(',')) {
    const parts = raw.split(',');
    integerRaw = parts[0];
    decimalPart = parts[1] ?? '';
    forceDecimal = true;
  } else if (raw.endsWith('.')) {
    // Punto final: el usuario está por escribir decimales
    integerRaw = raw.slice(0, -1);
    forceDecimal = true;
  }

  // Los puntos de la parte entera SIEMPRE son miles → se descartan
  const integerDigits = integerRaw.replace(/\./g, '').replace(/\D/g, '');
  decimalPart = decimalPart.replace(/\D/g, '').slice(0, 2);

  // Formatear miles con separador es-AR
  const thousands = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  let result = thousands;
  if (forceDecimal) {
    result += ',';
    if (decimalPart) result += decimalPart;
  }
  return result;
}
