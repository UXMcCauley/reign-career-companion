import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { calendarOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { loadShifts } from '../data/blobStorage';
import {
  DAY_NAMES,
  MONTH_NAMES,
  formatHour,
  shiftDurationShort,
  type DaySchedule,
  type Shift,
} from '../data/scheduleData';
import './SchedulePage.css';

type ViewMode = 'week' | 'month';
type MonthCell = { date: Date | null; shift: Shift | null; isToday: boolean };

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

function buildWeekDays(cursorDate: Date): Date[] {
  const weekStart = startOfWeek(cursorDate);
  return Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
}

function buildMonthDays(cursorDate: Date): Date[] {
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, idx) => new Date(year, month, idx + 1));
}

const SchedulePage: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const history = useHistory();
  const [cursorDate, setCursorDate] = useState(today);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [shifts, setShifts] = useState<Record<string, DaySchedule['shift']>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadShifts();
      if (active) setShifts(loaded);
    })();
    return () => {
      active = false;
    };
  }, []);

  const orderedShifts = useMemo(
    () => Object.values(shifts as Record<string, Shift>).sort((a, b) => Number(a.id) - Number(b.id)),
    [shifts]
  );

  const anchorWeekStart = useMemo(() => startOfWeek(today), [today]);

  const visibleDays = useMemo(
    () => (viewMode === 'week' ? buildWeekDays(cursorDate) : buildMonthDays(cursorDate)),
    [cursorDate, viewMode]
  );

  const resolveShiftForDate = (date: Date): Shift | null => {
    if (orderedShifts.length === 0) return null;
    const offset = daysBetween(date, anchorWeekStart);
    if (offset < 0 || offset >= orderedShifts.length) return null;
    return orderedShifts[offset];
  };

  const schedule: DaySchedule[] = useMemo(
    () => visibleDays.map((date) => ({ date, shift: resolveShiftForDate(date) })),
    [visibleDays, orderedShifts, anchorWeekStart]
  );

  const monthCells = useMemo<MonthCell[]>(() => {
    if (viewMode !== 'month') return [];
    const firstDayOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const leadingBlanks = firstDayOfMonth.getDay();
    const cells: MonthCell[] = [];
    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push({ date: null, shift: null, isToday: false });
    }
    schedule.forEach(({ date, shift }) => {
      cells.push({ date, shift, isToday: isToday(date) });
    });
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, shift: null, isToday: false });
    }
    return cells;
  }, [cursorDate, schedule, viewMode]);

  const rangeLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTH_NAMES[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
    }
    const start = visibleDays[0];
    const end = visibleDays[visibleDays.length - 1];
    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }, [cursorDate, visibleDays, viewMode]);

  const moveRange = (direction: -1 | 1) => {
    setCursorDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'week') next.setDate(prev.getDate() + (direction * 7));
      else next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return (
    <IonPage>
      <IonHeader translucent className="schedule-header">
        <IonToolbar className="schedule-toolbar">
          <IonTitle className="schedule-title">Schedule</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="schedule-content">
        <div className="schedule-range-controls">
          <IonButton fill="clear" className="schedule-nav-btn" onClick={() => moveRange(-1)} aria-label="Previous range">
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <div className="schedule-week-label">{rangeLabel}</div>
          <IonButton fill="clear" className="schedule-nav-btn" onClick={() => moveRange(1)} aria-label="Next range">
            <IonIcon icon={chevronForwardOutline} />
          </IonButton>
        </div>
        <div className="schedule-view-toggle">
          <button
            type="button"
            className={`schedule-view-btn${viewMode === 'week' ? ' active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`schedule-view-btn${viewMode === 'month' ? ' active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            <IonIcon icon={calendarOutline} />
            Month
          </button>
        </div>

        {viewMode === 'week' ? (
          <div className="schedule-list schedule-list--week">
            {schedule.map(({ date, shift }, index) => {
              const dayIndex = date.getDay();
              const today_ = isToday(date);
              const startPct = shift ? Math.max(0, Math.min(100, (shift.startHour / 24) * 100)) : 0;
              const endPct = shift ? Math.max(0, Math.min(100, (Math.min(24, shift.endHour) / 24) * 100)) : 0;

              return (
                <div className="schedule-day-section" key={`${date.toISOString()}-${index}`}>
                  <div className={`schedule-day-header${today_ ? ' schedule-day-header--today' : ''}`}>
                    <span>{DAY_NAMES[dayIndex]}, {MONTH_NAMES[date.getMonth()]} {date.getDate()}</span>
                    <span className={`schedule-day-duration${!shift ? ' schedule-day-duration--off' : ''}`}>
                      {shift ? shiftDurationShort(shift) : 'Day Off'}
                    </span>
                  </div>

                  {shift ? (
                    <button
                      className={[
                        'schedule-day-card',
                        today_ ? 'schedule-day-card--today' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => history.push(`/schedule/${shift.id}`)}
                      type="button"
                    >
                      <div className="schedule-timeline" aria-hidden="true">
                        <div className="schedule-timeline-half-hour-ticks" />
                        <div className="schedule-timeline-hour-ticks" />
                        <div
                          className="schedule-shift-bar"
                          style={{
                            left: `${startPct}%`,
                            width: `${Math.max(1.5, endPct - startPct)}%`,
                          }}
                        />
                        <span
                          className="schedule-shift-marker schedule-shift-marker--start"
                          style={{ left: `${startPct}%` }}
                        >
                          {formatHour(shift.startHour)}
                        </span>
                        <span
                          className="schedule-shift-marker schedule-shift-marker--end"
                          style={{ left: `${endPct}%` }}
                        >
                          {formatHour(Math.min(24, shift.endHour))}
                        </span>
                      </div>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="schedule-month">
            <div className="schedule-month-weekdays">
              {DAY_NAMES.map(day => (
                <span key={day} className="schedule-month-weekday">{day.slice(0, 3)}</span>
              ))}
            </div>
            <div className="schedule-month-grid">
              {monthCells.map((cell, index) => {
                if (!cell.date) return <div key={`blank-${index}`} className="schedule-month-cell schedule-month-cell--blank" />;
                const shift = cell.shift;
                return (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    className={`schedule-month-cell${cell.isToday ? ' schedule-month-cell--today' : ''}${shift ? ' has-shift' : ''}`}
                    onClick={shift ? () => history.push(`/schedule/${shift.id}`) : undefined}
                    disabled={!shift}
                  >
                    <span className="schedule-month-day">{cell.date.getDate()}</span>
                    <span className="schedule-month-meta">
                      {shift ? shiftDurationShort(shift) : 'Off'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SchedulePage;
