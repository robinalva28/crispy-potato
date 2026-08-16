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
    // Sin coma: si hay más de un punto, los puntos son miles; conservar el último como decimal
    const parts = normalized.split('.');
    if (parts.length > 2) {
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