/** Decimal hour from a Date (e.g. 14.5 = 2:30 PM). */
export function decimalHourFromDate(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

export function decimalHourToTimeValue(decimalHour: number): string {
  const safe = Number.isFinite(decimalHour) ? decimalHour : 0;
  const normalized = ((safe % 24) + 24) % 24;
  const hours = Math.floor(normalized);
  const mins = Math.round((normalized - hours) * 60) % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function timeValueToDecimalHour(value: string): number | null {
  const [hRaw, mRaw] = value.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h + m / 60;
}

export function decimalHourMinutesAgo(minutes: number): number {
  const date = new Date(Date.now() - minutes * 60_000);
  return decimalHourFromDate(date);
}

export function decimalHourMinutesFromNow(minutes: number): number {
  const date = new Date(Date.now() + minutes * 60_000);
  return decimalHourFromDate(date);
}
