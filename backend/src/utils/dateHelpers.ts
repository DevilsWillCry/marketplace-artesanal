/**
 * Añade días a una fecha y devuelve la nueva fecha.
 * @param date - Fecha base (tipo Date o string ISO).
 * @param days - Número de días a añadir (puede ser negativo).
 * @returns Nueva fecha con los días añadidos.
 */
export function addDays(date: Date | string, days: number): Date {
  const result = new Date(date); // Crea una copia para no modificar la original
  result.setDate(result.getDate() + days);
  return result;
}