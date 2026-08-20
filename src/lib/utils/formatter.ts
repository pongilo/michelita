export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
});

export const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export const weekdayShortFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
});

export const weekdayNarrowFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "narrow",
});

export const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
});

export const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

export function formatMonthYearLabel(date: Date) {
  const formatted = monthYearFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// e.g. "17 a 23 de agosto de 2026" or, spanning two months, "28 de julho a 03 de agosto de 2026".
// `endDateKeyExclusive` is the day after the week ends (matches the range used to query data).
export function formatWeekRangeLabel(startDateKey: string, endDateKeyExclusive: string) {
  const start = new Date(`${startDateKey}T00:00:00Z`);
  const end = new Date(`${endDateKeyExclusive}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 1);

  const startDay = String(start.getUTCDate()).padStart(2, "0");
  const endDay = String(end.getUTCDate()).padStart(2, "0");
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();

  const label = sameMonth
    ? `${startDay} a ${endDay} de ${monthYearFormatter.format(end)}`
    : `${startDay} de ${monthFormatter.format(start)} a ${endDay} de ${monthYearFormatter.format(end)}`;

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDayLabel(date: Date) {
  const formatted = dayLabelFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const fullDayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatFullDayLabel(date: Date) {
  const formatted = fullDayLabelFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatFullDate(date: Date) {
  const formatted = fullDateFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const weekdayLongFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
});

// e.g. "Segunda-feira, 10/08 às 14:32"
export function formatWeekdayDateTime(date: Date) {
  const weekday = weekdayLongFormatter.format(date);
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${capitalized}, ${day}/${month} às ${timeFormatter.format(date)}`;
}

// Takes the raw date and time apart from a stored datetime (Date or ISO string) and
// rebuilds a Date from those exact digits, dropping any "Z"/offset — so formatting it
// with a plain (non-UTC) formatter shows precisely what's in the database, with no
// timezone conversion in either direction.
export function toExactDatetime(value: Date | string): Date {
  const iso = value instanceof Date ? value.toISOString() : value;
  const [datePart, rawTime] = iso.split("T");
  const timePart = (rawTime ?? "00:00:00").replace(/Z$|[+-]\d{2}:?\d{2}$/, "");
  return new Date(`${datePart}T${timePart}`);
}

// Extracts just the YYYY-MM-DD portion of a stored datetime (Date or ISO string).
export function toDateOnly(value: Date | string): string {
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.split("T")[0];
}

export function localDatetime() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

