import { Preferences } from '@capacitor/preferences';
import { MOCK_SHIFTS, SCHEDULE_SEED_VERSION, type Shift } from './scheduleData';
import { ensureTodayInSchedule, seedScheduleByDate, toDateKey } from './scheduleResolver';

export type ClockEventType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'keycard_change';

export interface ClockEvent {
  id: string;
  type: ClockEventType;
  shiftId: string;
  shiftDate: string;
  timestamp: number;
  message: string;
  keyCardId?: string | null;
}

export interface ActiveClockSession {
  shiftId: string;
  shiftDate: string;
  clockInTimestamp: number;
  activeKeyCardId: string | null;
  onBreak: boolean;
  breakStartedAt: number | null;
  totalBreakSeconds: number;
  activeBreakIndex: number | null;
}

export interface ShiftRuntimeState {
  isClockedIn: boolean;
  activeBreakIndex: number | null;
}

export type ShiftChangeRequestMap = Record<
  string,
  { mode: 'swap' | 'off'; submittedAt: number; targetName?: string; status?: string }
>;

export interface LocalDatabase {
  version: 1;
  shifts: Record<string, Shift>;
  /** ISO date (YYYY-MM-DD) → shift template id */
  scheduleByDate: Record<string, string>;
  scheduleSeedVersion?: number;
  startOverrides: Record<string, number>;
  activeClockSession: ActiveClockSession | null;
  clockEvents: ClockEvent[];
  shiftRuntime: Record<string, ShiftRuntimeState>;
  changeRequests: ShiftChangeRequestMap;
}

const DB_KEY = 'reign_local_db_v1';

const LEGACY_KEYS = {
  schedule: 'reign_schedule_v1',
  shiftRuntime: 'reign_shift_runtime_v1',
  startOverrides: 'reign_shift_start_overrides_v1',
  clockSession: 'reign_dashboard_clock_session',
  changeRequests: 'reign_shift_change_requests_v1',
} as const;

let memoryCache: LocalDatabase | null = null;

function createEmptyDatabase(): LocalDatabase {
  const shifts = MOCK_SHIFTS;
  return {
    version: 1,
    shifts,
    scheduleByDate: seedScheduleByDate(shifts),
    scheduleSeedVersion: SCHEDULE_SEED_VERSION,
    startOverrides: {},
    activeClockSession: null,
    clockEvents: [],
    shiftRuntime: {},
    changeRequests: {},
  };
}

export function mergeShiftTemplates(db: LocalDatabase): LocalDatabase {
  return {
    ...db,
    shifts: applyStartOverrides({ ...MOCK_SHIFTS }, db.startOverrides),
  };
}

export async function persistShiftStartOverride(
  shiftId: string,
  startHour: number
): Promise<LocalDatabase> {
  if (!Number.isFinite(startHour)) {
    return readLocalDatabase();
  }

  return updateLocalDatabase(db => {
    db.startOverrides = { ...db.startOverrides, [shiftId]: startHour };
    db.shifts = applyStartOverrides({ ...MOCK_SHIFTS }, db.startOverrides);
    return db;
  });
}

export function ensureScheduleAssignments(db: LocalDatabase): LocalDatabase {
  const withShifts = mergeShiftTemplates(db);
  const todayKey = toDateKey(new Date());
  const needsReseed =
    (withShifts.scheduleSeedVersion ?? 1) < SCHEDULE_SEED_VERSION ||
    !withShifts.scheduleByDate ||
    Object.keys(withShifts.scheduleByDate).length === 0 ||
    !withShifts.scheduleByDate[todayKey];

  if (needsReseed) {
    return {
      ...withShifts,
      scheduleByDate: seedScheduleByDate(withShifts.shifts),
      scheduleSeedVersion: SCHEDULE_SEED_VERSION,
    };
  }

  const withToday = ensureTodayInSchedule(withShifts.scheduleByDate, withShifts.shifts);
  if (withToday === withShifts.scheduleByDate) {
    return withShifts;
  }

  return {
    ...withShifts,
    scheduleByDate: withToday,
  };
}

export async function scheduleTodayForTesting(): Promise<LocalDatabase> {
  return updateLocalDatabase(db => {
    const merged = mergeShiftTemplates(db);
    return {
      ...merged,
      scheduleByDate: ensureTodayInSchedule(merged.scheduleByDate, merged.shifts),
    };
  });
}

export function validateActiveClockSession(db: LocalDatabase): LocalDatabase {
  const session = db.activeClockSession;
  if (!session) return db;

  const todayKey = toDateKey(new Date());
  const assignedToday = db.scheduleByDate[todayKey];

  if (session.shiftDate !== todayKey || !assignedToday || assignedToday !== session.shiftId) {
    return {
      ...db,
      activeClockSession: null,
      shiftRuntime: {
        ...db.shiftRuntime,
        [session.shiftId]: { isClockedIn: false, activeBreakIndex: null },
      },
    };
  }

  return db;
}

function normalizeDatabase(db: LocalDatabase): LocalDatabase {
  return validateActiveClockSession(ensureScheduleAssignments(db));
}

function readLegacyJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function applyStartOverrides(
  shifts: Record<string, Shift>,
  overrides: Record<string, number>
): Record<string, Shift> {
  const next = Object.fromEntries(
    Object.entries(shifts).map(([id, shift]) => [
      id,
      {
        ...shift,
        breaks: shift.breaks.map(brk => ({ ...brk })),
        team: shift.team.map(member => ({ ...member })),
      },
    ])
  ) as Record<string, Shift>;

  Object.entries(overrides).forEach(([shiftId, startHour]) => {
    const shift = next[shiftId];
    if (!shift || !Number.isFinite(startHour)) return;
    const delta = startHour - shift.startHour;
    shift.startHour = startHour;
    shift.endHour += delta;
    shift.breaks = shift.breaks.map(brk => ({ ...brk, startHour: brk.startHour + delta }));
  });

  return next;
}

function migrateLegacyData(): LocalDatabase {
  const db = createEmptyDatabase();
  const legacyShifts = readLegacyJson<Record<string, Shift>>(LEGACY_KEYS.schedule);
  const legacyOverrides = readLegacyJson<Record<string, number>>(LEGACY_KEYS.startOverrides) ?? {};
  const legacyRuntime = readLegacyJson<Record<string, ShiftRuntimeState>>(LEGACY_KEYS.shiftRuntime) ?? {};
  const legacyChangeRequests = readLegacyJson<ShiftChangeRequestMap>(LEGACY_KEYS.changeRequests) ?? {};
  const legacySession = readLegacyJson<{
    isClockedIn: boolean;
    clockInTimestamp: number | null;
    onBreak: boolean;
    breakStartedAt: number | null;
    activeKeyCardId: string | null;
    totalBreakSeconds: number;
  }>(LEGACY_KEYS.clockSession);

  db.startOverrides = legacyOverrides;
  db.shifts = applyStartOverrides(legacyShifts ?? MOCK_SHIFTS, legacyOverrides);
  db.scheduleByDate = seedScheduleByDate(db.shifts);
  db.scheduleSeedVersion = SCHEDULE_SEED_VERSION;
  db.shiftRuntime = legacyRuntime;
  db.changeRequests = legacyChangeRequests;

  if (legacySession?.isClockedIn && legacySession.clockInTimestamp) {
    const today = new Date();
    const todayKey = toDateKey(today);
    const todayShiftId = db.scheduleByDate[todayKey];

    if (todayShiftId) {
      db.activeClockSession = {
        shiftId: todayShiftId,
        shiftDate: todayKey,
        clockInTimestamp: legacySession.clockInTimestamp,
        activeKeyCardId: legacySession.activeKeyCardId,
        onBreak: legacySession.onBreak,
        breakStartedAt: legacySession.breakStartedAt,
        totalBreakSeconds: legacySession.totalBreakSeconds ?? 0,
        activeBreakIndex: null,
      };
    }
  }

  return normalizeDatabase(db);
}

export async function readLocalDatabase(): Promise<LocalDatabase> {
  if (memoryCache) return memoryCache;

  const { value } = await Preferences.get({ key: DB_KEY });
  if (value) {
    const parsed = JSON.parse(value) as LocalDatabase;
    const normalized = normalizeDatabase(parsed);
    memoryCache = normalized;
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      await Preferences.set({ key: DB_KEY, value: JSON.stringify(normalized) });
    }
    return memoryCache;
  }

  memoryCache = migrateLegacyData();
  await writeLocalDatabase(memoryCache);
  return memoryCache;
}

export async function writeLocalDatabase(db: LocalDatabase): Promise<void> {
  memoryCache = db;
  await Preferences.set({ key: DB_KEY, value: JSON.stringify(db) });
}

export async function updateLocalDatabase(
  updater: (db: LocalDatabase) => LocalDatabase | void
): Promise<LocalDatabase> {
  const current = await readLocalDatabase();
  const next = updater(current) ?? current;
  await writeLocalDatabase(next);
  return next;
}

export function createClockEvent(
  type: ClockEventType,
  shiftId: string,
  shiftDate: string,
  message: string,
  keyCardId?: string | null
): ClockEvent {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    shiftId,
    shiftDate,
    timestamp: Date.now(),
    message,
    keyCardId: keyCardId ?? null,
  };
}
