import type { Shift } from './scheduleData';
import {
  DEMO_WEEK_PATTERNS,
  SCHEDULE_WEEKS_BACK,
  SCHEDULE_WEEKS_FORWARD,
} from './scheduleData';

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDateKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildWeekDays(anchorWeekStart: Date = startOfWeek(new Date())): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(anchorWeekStart, index));
}

export function buildWeekSchedule(
  getShiftForDate: (date: Date) => Shift | null,
  anchorWeekStart: Date = startOfWeek(new Date())
): { date: Date; shift: Shift | null }[] {
  return buildWeekDays(anchorWeekStart).map(date => ({
    date,
    shift: getShiftForDate(date),
  }));
}

export function orderedShiftsFromMap(shifts: Record<string, Shift>): Shift[] {
  return Object.values(shifts).sort((a, b) => Number(a.id) - Number(b.id));
}

export function defaultShiftIdForDate(date: Date): string {
  return String(date.getDay() + 1);
}

export function ensureTodayInSchedule(
  scheduleByDate: Record<string, string>,
  shifts: Record<string, Shift>,
  date: Date = new Date()
): Record<string, string> {
  const dateKey = toDateKey(date);
  if (scheduleByDate[dateKey]) return scheduleByDate;

  const shiftId = defaultShiftIdForDate(date);
  if (!shifts[shiftId]) return scheduleByDate;

  return { ...scheduleByDate, [dateKey]: shiftId };
}

export function seedScheduleByDate(
  shifts: Record<string, Shift>,
  options: {
    weeksBack?: number;
    weeksForward?: number;
    fromWeekStart?: Date;
    weekPatterns?: (string | null)[][];
  } = {}
): Record<string, string> {
  const {
    weeksBack = SCHEDULE_WEEKS_BACK,
    weeksForward = SCHEDULE_WEEKS_FORWARD,
    fromWeekStart = startOfWeek(new Date()),
    weekPatterns = DEMO_WEEK_PATTERNS,
  } = options;

  const assignments: Record<string, string> = {};
  const totalWeeks = weeksBack + weeksForward;
  const startWeek = addDays(fromWeekStart, -weeksBack * 7);

  const patternForWeek = (weekStart: Date): (string | null)[] => {
    const weekOffset = Math.round(daysBetween(weekStart, fromWeekStart) / 7);
    if (weekOffset === 0) return weekPatterns[0];
    const altPatterns = weekPatterns.slice(1);
    if (altPatterns.length === 0) return weekPatterns[0];
    return altPatterns[(Math.abs(weekOffset) - 1) % altPatterns.length];
  };

  for (let week = 0; week < totalWeeks; week += 1) {
    const weekStart = addDays(startWeek, week * 7);
    const pattern = patternForWeek(weekStart);
    pattern.forEach((shiftId, dayOffset) => {
      if (!shiftId || !shifts[shiftId]) return;
      assignments[toDateKey(addDays(weekStart, dayOffset))] = shiftId;
    });
  }

  return assignments;
}

export function resolveShiftForDate(
  date: Date,
  shifts: Record<string, Shift>,
  scheduleByDate: Record<string, string> = {},
  anchorWeekStart: Date = startOfWeek(new Date())
): Shift | null {
  const dateKey = toDateKey(date);
  const assignedId = scheduleByDate[dateKey];
  if (assignedId) {
    return shifts[assignedId] ?? null;
  }

  const ordered = orderedShiftsFromMap(shifts);
  if (ordered.length === 0) return null;
  const offset = daysBetween(date, anchorWeekStart);
  if (offset < 0 || offset >= 7) return null;
  const legacyId = ordered[offset]?.id;
  return legacyId ? (shifts[legacyId] ?? null) : null;
}

export function getShiftDateForShiftId(
  shiftId: string,
  anchorWeekStart: Date = startOfWeek(new Date()),
  scheduleByDate: Record<string, string> = {}
): Date {
  const weekStart = startOfDay(anchorWeekStart);

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(weekStart, offset);
    if (scheduleByDate[toDateKey(date)] === shiftId) {
      return date;
    }
  }

  const numericId = parseInt(shiftId, 10);
  if (Number.isNaN(numericId)) return weekStart;
  return addDays(weekStart, Math.max(0, Math.min(6, numericId - 1)));
}

export type ShiftStatus = 'upcoming' | 'in-progress' | 'completed';

export function getShiftStatus(shiftDate: Date, startHour: number, endHour: number): ShiftStatus {
  const now = new Date();
  const start = new Date(shiftDate);
  start.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  const end = new Date(shiftDate);
  end.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
  if (now < start) return 'upcoming';
  if (now > end) return 'completed';
  return 'in-progress';
}
