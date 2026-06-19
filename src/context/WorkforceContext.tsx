import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadShifts as loadShiftsFromBlob, saveShiftStartOverride as saveShiftStartOverrideBlob } from '../data/blobStorage';
import {
  ensureScheduleAssignments,
  mergeShiftTemplates,
  scheduleTodayForTesting,
  validateActiveClockSession,
  createClockEvent,
  readLocalDatabase,
  updateLocalDatabase,
  writeLocalDatabase,
  type ActiveClockSession,
  type ClockEvent,
  type ShiftChangeRequestMap,
} from '../data/localDatabase';
import {
  buildWeekSchedule,
  getShiftDateForShiftId,
  getShiftStatus,
  isSameDay,
  resolveShiftForDate,
  startOfWeek,
  toDateKey,
  type ShiftStatus,
} from '../data/scheduleResolver';
import type { DaySchedule, Shift } from '../data/scheduleData';

interface WorkforceContextValue {
  shifts: Record<string, Shift>;
  isLoading: boolean;
  refreshShifts: () => Promise<void>;
  anchorWeekStart: Date;
  weekSchedule: DaySchedule[];
  scheduleByDate: Record<string, string>;
  getShiftForDate: (date: Date) => Shift | null;
  todayShift: Shift | null;
  hasShiftToday: boolean;
  getShiftStatusForDate: (date: Date, shift: Shift) => ShiftStatus;
  activeSession: ActiveClockSession | null;
  isClockedIn: boolean;
  isClockedInForShift: (shiftId: string) => boolean;
  clockEvents: ClockEvent[];
  changeRequests: ShiftChangeRequestMap;
  clockIn: (params: { shiftId: string; keyCardId: string | null }) => Promise<boolean>;
  clockOut: () => Promise<void>;
  startBreak: (breakIndex?: number | null) => Promise<void>;
  endBreak: () => Promise<void>;
  setActiveKeyCard: (keyCardId: string | null) => Promise<void>;
  saveShiftStartOverride: (shiftId: string, startHour: number) => Promise<void>;
  scheduleTodayForTesting: () => Promise<void>;
  refreshSchedule: () => Promise<void>;
  saveChangeRequest: (shiftId: string, request: ShiftChangeRequestMap[string]) => Promise<void>;
}

const WorkforceContext = createContext<WorkforceContextValue | null>(null);

async function syncShiftsFromBlob(): Promise<Record<string, Shift>> {
  try {
    await loadShiftsFromBlob();
  } catch {
    // Offline or blob unavailable — local DB is source of truth.
  }
  return updateLocalDatabase(db => mergeShiftTemplates(db)).then(saved => saved.shifts);
}

export function WorkforceProvider({ children }: { children: ReactNode }) {
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [scheduleByDate, setScheduleByDate] = useState<Record<string, string>>({});
  const [activeSession, setActiveSession] = useState<ActiveClockSession | null>(null);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [changeRequests, setChangeRequests] = useState<ShiftChangeRequestMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleTick, setScheduleTick] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      const todayKey = toDateKey(new Date());
      setScheduleTick(prev => (prev === todayKey ? prev : todayKey));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const anchorWeekStart = useMemo(() => startOfWeek(new Date()), [scheduleTick]);

  const hydrate = useCallback(async () => {
    setIsLoading(true);
    try {
      let db = await readLocalDatabase();
      db = ensureScheduleAssignments(db);
      db = validateActiveClockSession(db);
      await writeLocalDatabase(db);

      const syncedShifts = await syncShiftsFromBlob();
      db = await readLocalDatabase();
      db = ensureScheduleAssignments({
        ...db,
        shifts: syncedShifts,
      });
      db = validateActiveClockSession(db);
      await writeLocalDatabase(db);

      setShifts(db.shifts);
      setScheduleByDate(db.scheduleByDate);
      setActiveSession(db.activeClockSession);
      setClockEvents(db.clockEvents);
      setChangeRequests(db.changeRequests);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const getShiftForDate = useCallback(
    (date: Date) => resolveShiftForDate(date, shifts, scheduleByDate, anchorWeekStart),
    [shifts, scheduleByDate, anchorWeekStart]
  );

  const todayShift = useMemo(() => getShiftForDate(new Date()), [getShiftForDate]);
  const hasShiftToday = todayShift !== null;

  const weekSchedule = useMemo(
    () => buildWeekSchedule(getShiftForDate, anchorWeekStart),
    [getShiftForDate, anchorWeekStart]
  );

  const getShiftStatusForDate = useCallback((date: Date, shift: Shift) => {
    return getShiftStatus(date, shift.startHour, shift.endHour);
  }, []);

  const isClockedIn = activeSession !== null;

  const isClockedInForShift = useCallback(
    (shiftId: string) => activeSession?.shiftId === shiftId,
    [activeSession]
  );

  const clockIn = useCallback(
    async ({ shiftId, keyCardId }: { shiftId: string; keyCardId: string | null }) => {
      const shift = shifts[shiftId];
      if (!shift) return false;

      const shiftDate = getShiftDateForShiftId(shiftId, anchorWeekStart, scheduleByDate);
      if (!isSameDay(shiftDate, new Date())) return false;

      const shiftDateKey = toDateKey(shiftDate);
      const assignedId = scheduleByDate[shiftDateKey];
      if (!assignedId || assignedId !== shiftId) return false;

      const scheduled = shifts[assignedId];
      if (!scheduled) return false;

      const db = await updateLocalDatabase(current => {
        if (current.activeClockSession) return current;

        const shiftDateKey = toDateKey(shiftDate);
        const session: ActiveClockSession = {
          shiftId,
          shiftDate: shiftDateKey,
          clockInTimestamp: Date.now(),
          activeKeyCardId: keyCardId,
          onBreak: false,
          breakStartedAt: null,
          totalBreakSeconds: 0,
          activeBreakIndex: null,
        };

        current.activeClockSession = session;
        current.shiftRuntime[shiftId] = { isClockedIn: true, activeBreakIndex: null };
        current.clockEvents = [
          ...current.clockEvents,
          createClockEvent(
            'clock_in',
            shiftId,
            shiftDateKey,
            `Clocked in for ${shift.location}`,
            keyCardId
          ),
        ];
        return current;
      });

      setActiveSession(db.activeClockSession);
      setClockEvents(db.clockEvents);
      return true;
    },
    [shifts, scheduleByDate, anchorWeekStart]
  );

  const clockOut = useCallback(async () => {
    const db = await updateLocalDatabase(current => {
      const session = current.activeClockSession;
      if (!session) return current;

      const shift = current.shifts[session.shiftId];
      current.clockEvents = [
        ...current.clockEvents,
        createClockEvent(
          'clock_out',
          session.shiftId,
          session.shiftDate,
          `Clocked out from ${shift?.location ?? 'shift'}`
        ),
      ];
      current.shiftRuntime[session.shiftId] = {
        isClockedIn: false,
        activeBreakIndex: null,
      };
      current.activeClockSession = null;
      return current;
    });

    setActiveSession(db.activeClockSession);
    setClockEvents(db.clockEvents);
  }, []);

  const startBreak = useCallback(async (breakIndex: number | null = null) => {
    const db = await updateLocalDatabase(current => {
      const session = current.activeClockSession;
      if (!session || session.onBreak) return current;

      session.onBreak = true;
      session.breakStartedAt = Date.now();
      session.activeBreakIndex = breakIndex;
      current.shiftRuntime[session.shiftId] = {
        isClockedIn: true,
        activeBreakIndex: breakIndex,
      };
      // Label the event by break type so the shift detail page can show
      // "Lunch"/"Break"/"Misc" start times distinctly.
      const breakDef = breakIndex != null && breakIndex >= 0
        ? current.shifts[session.shiftId]?.breaks[breakIndex]
        : null;
      const label = breakIndex === -1
        ? 'Misc / Away started'
        : breakDef?.type === 'meal'
          ? 'Lunch started'
          : 'Break started';
      current.clockEvents = [
        ...current.clockEvents,
        createClockEvent('break_start', session.shiftId, session.shiftDate, label),
      ];
      return current;
    });

    setActiveSession(db.activeClockSession);
    setClockEvents(db.clockEvents);
  }, []);

  const endBreak = useCallback(async () => {
    const db = await updateLocalDatabase(current => {
      const session = current.activeClockSession;
      if (!session || !session.onBreak || !session.breakStartedAt) return current;

      const elapsed = Math.max(0, Math.floor((Date.now() - session.breakStartedAt) / 1000));
      session.totalBreakSeconds += elapsed;
      session.onBreak = false;
      session.breakStartedAt = null;
      session.activeBreakIndex = null;
      current.shiftRuntime[session.shiftId] = {
        isClockedIn: true,
        activeBreakIndex: null,
      };
      current.clockEvents = [
        ...current.clockEvents,
        createClockEvent('break_end', session.shiftId, session.shiftDate, 'Break ended'),
      ];
      return current;
    });

    setActiveSession(db.activeClockSession);
    setClockEvents(db.clockEvents);
  }, []);

  const setActiveKeyCard = useCallback(async (keyCardId: string | null) => {
    const db = await updateLocalDatabase(current => {
      const session = current.activeClockSession;
      if (!session) return current;
      // Record the switch so per-keycard worked time can be reconstructed.
      if (session.activeKeyCardId !== keyCardId) {
        current.clockEvents = [
          ...current.clockEvents,
          createClockEvent('keycard_change', session.shiftId, session.shiftDate, 'Switched key card', keyCardId),
        ];
      }
      session.activeKeyCardId = keyCardId;
      return current;
    });
    setActiveSession(db.activeClockSession);
    setClockEvents(db.clockEvents);
  }, []);

  const refreshSchedule = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const scheduleToday = useCallback(async () => {
    const db = await scheduleTodayForTesting();
    setShifts(db.shifts);
    setScheduleByDate(db.scheduleByDate);
  }, []);

  const saveShiftStartOverride = useCallback(async (shiftId: string, startHour: number) => {
    await saveShiftStartOverrideBlob(shiftId, startHour);
    const db = await readLocalDatabase();
    setShifts(db.shifts);
  }, []);

  const saveChangeRequest = useCallback(
    async (shiftId: string, request: ShiftChangeRequestMap[string]) => {
      const db = await updateLocalDatabase(current => {
        current.changeRequests[shiftId] = request;
        return current;
      });
      setChangeRequests(db.changeRequests);
    },
    []
  );

  const value = useMemo<WorkforceContextValue>(
    () => ({
      shifts,
      isLoading,
      refreshShifts: hydrate,
      anchorWeekStart,
      weekSchedule,
      scheduleByDate,
      getShiftForDate,
      todayShift,
      hasShiftToday,
      getShiftStatusForDate,
      activeSession,
      isClockedIn,
      isClockedInForShift,
      clockEvents,
      changeRequests,
      clockIn,
      clockOut,
      startBreak,
      endBreak,
      setActiveKeyCard,
      saveShiftStartOverride,
      scheduleTodayForTesting: scheduleToday,
      refreshSchedule,
      saveChangeRequest,
    }),
    [
      shifts,
      isLoading,
      hydrate,
      anchorWeekStart,
      weekSchedule,
      scheduleByDate,
      getShiftForDate,
      todayShift,
      hasShiftToday,
      getShiftStatusForDate,
      activeSession,
      isClockedIn,
      isClockedInForShift,
      clockEvents,
      changeRequests,
      clockIn,
      clockOut,
      startBreak,
      endBreak,
      setActiveKeyCard,
      saveShiftStartOverride,
      scheduleToday,
      refreshSchedule,
      saveChangeRequest,
    ]
  );

  return <WorkforceContext.Provider value={value}>{children}</WorkforceContext.Provider>;
}

export function useWorkforce(): WorkforceContextValue {
  const ctx = useContext(WorkforceContext);
  if (!ctx) {
    throw new Error('useWorkforce must be used within WorkforceProvider');
  }
  return ctx;
}
