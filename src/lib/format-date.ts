/**
 * Locale-safe date formatters.
 *
 * `toLocaleDateString` produces different output depending on the runtime
 * locale (Node on the server vs. the user's browser), which causes React
 * hydration mismatches. These helpers parse the ISO string directly and
 * build a fixed Spanish string — identical on server and client.
 */

const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const WEEKDAYS_LONG = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** "5 de enero de 2025" */
export function formatDateLong(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} de ${MONTHS_LONG[month - 1]} de ${year}`;
}

/** "5 ene 2025" */
export function formatDateShort(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** "DD/MM/YYYY" */
export function formatDateNumeric(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** "lunes, 5 de enero de 2025" */
export function formatDateWithWeekday(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  // Use UTC noon to avoid any timezone shift when computing the weekday
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS_LONG[weekday]}, ${day} de ${MONTHS_LONG[month - 1]} de ${year}`;
}
