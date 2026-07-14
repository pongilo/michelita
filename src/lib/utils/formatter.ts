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

export const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
});

export function formatDayLabel(date: Date) {
  const formatted = dayLabelFormatter.format(date);
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

