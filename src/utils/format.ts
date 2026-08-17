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