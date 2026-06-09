import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  useIonAlert,
} from '@ionic/react';
import {
  cafeOutline,
  calendarOutline,
  chatbubbleOutline,
  checkmarkCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeCircleOutline,
  paperPlaneOutline,
  restaurantOutline,
  swapHorizontalOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { loadShifts } from '../data/blobStorage';
import {
  DAY_NAMES,
  MONTH_NAMES,
  formatHour,
  shiftDuration,
  shiftDurationShort,
  type DaySchedule,
  type Break,
  type Shift,
} from '../data/scheduleData';
import './SchedulePage.css';

type ViewMode = 'week' | 'month';
type MonthCell = { date: Date | null; shift: Shift | null; isToday: boolean };
type ShiftRequestStatus = 'submitted' | 'approved' | 'denied';
type ShiftChangeRequestMap = Record<string, { mode: 'swap' | 'off'; submittedAt: number; targetName?: string; status: ShiftRequestStatus }>;
type ShiftStatus = 'upcoming' | 'in-progress' | 'completed';
const SHIFT_CHANGE_REQUESTS_LOCAL_KEY = 'reign_shift_change_requests_v1';
const STATUS_LABELS: Record<ShiftStatus, string> = {
  upcoming: 'UPCOMING',
  'in-progress': 'IN PROGRESS',
  completed: 'COMPLETED',
};

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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getStatus(shiftDate: Date, startHour: number, endHour: number): ShiftStatus {
  const now = new Date();
  const start = new Date(shiftDate);
  start.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  const end = new Date(shiftDate);
  end.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
  if (now < start) return 'upcoming';
  if (now > end) return 'completed';
  return 'in-progress';
}

function formatCountdown(shiftDate: Date, startHour: number): string | null {
  const now = new Date();
  const start = new Date(shiftDate);
  start.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0 || diffMs > 12 * 60 * 60 * 1000) return null;
  const totalMins = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `Starts in ${m}m`;
  return m === 0 ? `Starts in ${h}h` : `Starts in ${h}h ${m}m`;
}

function breakLabel(b: Break): string {
  return b.type === 'meal' ? '30 min lunch' : `${b.durationMins} min break`;
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
  const [presentAlert] = useIonAlert();
  const [cursorDate, setCursorDate] = useState(today);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [shifts, setShifts] = useState<Record<string, DaySchedule['shift']>>({});
  const [changeRequests, setChangeRequests] = useState<ShiftChangeRequestMap>({});
  const [selectedWeekDate, setSelectedWeekDate] = useState(startOfDay(today));

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SHIFT_CHANGE_REQUESTS_LOCAL_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ShiftChangeRequestMap;
      setChangeRequests(parsed);
    } catch {
      // Ignore malformed local request state.
    }
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

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

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

  useEffect(() => {
    if (viewMode !== 'week') return;
    const weekDay = schedule.find(({ date }) => isSameDay(date, selectedWeekDate));
    if (weekDay) return;
    const todayInWeek = schedule.find(({ date }) => isSameDay(date, today));
    setSelectedWeekDate(startOfDay(todayInWeek ? todayInWeek.date : schedule[0]?.date ?? today));
  }, [schedule, selectedWeekDate, today, viewMode]);

  const selectedWeekEntry = useMemo(
    () => (viewMode === 'week' ? schedule.find(({ date }) => isSameDay(date, selectedWeekDate)) ?? null : null),
    [schedule, selectedWeekDate, viewMode]
  );
  const selectedWeekShift = selectedWeekEntry?.shift ?? null;
  const selectedStatus = useMemo(
    () => (selectedWeekEntry?.shift ? getStatus(selectedWeekEntry.date, selectedWeekEntry.shift.startHour, selectedWeekEntry.shift.endHour) : null),
    [selectedWeekEntry]
  );
  const selectedCountdown = useMemo(
    () => (selectedWeekEntry?.shift && selectedStatus === 'upcoming' ? formatCountdown(selectedWeekEntry.date, selectedWeekEntry.shift.startHour) : null),
    [selectedStatus, selectedWeekEntry]
  );

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

  const saveRequest = (shiftId: string, status: ShiftRequestStatus = 'submitted') => {
    setChangeRequests(prev => {
      const next: ShiftChangeRequestMap = {
        ...prev,
        [shiftId]: {
          mode: 'off',
          submittedAt: Date.now(),
          status,
        },
      };
      localStorage.setItem(SHIFT_CHANGE_REQUESTS_LOCAL_KEY, JSON.stringify(next));
      return next;
    });
  };

  const requestOff = (preferredShiftId?: string) => {
    const options = schedule
      .filter(item => item.shift)
      .map(item => ({
        date: item.date,
        shift: item.shift as Shift,
        label: `${DAY_NAMES[item.date.getDay()]}, ${MONTH_NAMES[item.date.getMonth()]} ${item.date.getDate()} · ${shiftDurationShort(item.shift as Shift)}`,
      }));

    if (!options.length) {
      presentAlert({ header: 'No shifts', message: 'No shifts are available in this view to request off.', buttons: ['OK'] });
      return;
    }

    presentAlert({
      header: 'Request Off',
      message: 'Pick a shift day to submit your request.',
      inputs: options.map((option, index) => ({
        type: 'radio' as const,
        name: 'shiftDay',
        label: option.label,
        value: option.shift.id,
        checked: preferredShiftId ? option.shift.id === preferredShiftId : index === 0,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Submit',
          handler: (data: { shiftDay?: string }) => {
            const selectedShiftId = data?.shiftDay || preferredShiftId || options[0]?.shift.id;
            if (!selectedShiftId) return;
            saveRequest(selectedShiftId, 'submitted');
            presentAlert({
              header: 'Request Submitted',
              message: 'Your request off was submitted.',
              buttons: ['OK'],
            });
          },
        },
      ],
    });
  };

  const navigateToShift = (
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
    shiftId: string
  ) => {
    const target = event.currentTarget;
    window.requestAnimationFrame(() => {
      target.blur();
      history.push(`/schedule/${shiftId}`);
    });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="schedule-content">
        <div className="schedule-controls-row">
          <div className="schedule-range-inline">{rangeLabel}</div>
          <div className="schedule-view-toggle list-filter-tabs">
            <div
              className="list-filter-slider schedule-view-slider"
              style={{ left: viewMode === 'week' ? '3px' : 'calc(50% - 1.5px)', width: 'calc(50% - 3px)' }}
            />
            <button
              type="button"
              className={`list-filter-btn schedule-view-btn${viewMode === 'week' ? ' active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              type="button"
              className={`list-filter-btn schedule-view-btn${viewMode === 'month' ? ' active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              <IonIcon icon={calendarOutline} />
              Month
            </button>
          </div>
          {/* <div className="schedule-range-inline">{rangeLabel}</div> */}
          {viewMode === 'month' ? (
            <div className="schedule-month-nav-inline">
              <IonButton fill="clear" className="schedule-nav-btn" onClick={() => moveRange(-1)} aria-label="Previous range">
                <IonIcon icon={chevronBackOutline} />
              </IonButton>
              <IonButton fill="clear" className="schedule-nav-btn" onClick={() => moveRange(1)} aria-label="Next range">
                <IonIcon icon={chevronForwardOutline} />
              </IonButton>
            </div>
          ) : null}
        </div>

        {viewMode === 'week' ? (
          <div className="schedule-week-layout">
            <div className="schedule-week-detail">
              {selectedWeekShift ? (
                <>
                  <div className="schedule-inline-card schedule-inline-hero">
                    <IonButton
                      fill="clear"
                      size="small"
                      className={`schedule-inline-request${changeRequests[selectedWeekShift.id] ? ' schedule-inline-request--submitted' : ''}`}
                      onClick={() => requestOff(selectedWeekShift.id)}
                    >
                      <IonIcon icon={changeRequests[selectedWeekShift.id] ? checkmarkCircleOutline : swapHorizontalOutline} slot="start" />
                      {changeRequests[selectedWeekShift.id] ? 'Request Submitted' : 'Request Change'}
                    </IonButton>
                    {selectedStatus ? <div className={`schedule-inline-status schedule-inline-status--${selectedStatus}`}>{STATUS_LABELS[selectedStatus]}</div> : null}
                    <div className="schedule-inline-time">
                      {formatHour(selectedWeekShift.startHour)}
                      <span className="schedule-inline-arrow"> → </span>
                      {formatHour(selectedWeekShift.endHour)}
                    </div>
                    <div className="schedule-inline-duration">{shiftDuration(selectedWeekShift)}</div>
                    {selectedCountdown ? <div className="schedule-inline-countdown">{selectedCountdown}</div> : null}
                  </div>

                  <div className="schedule-inline-info-row">
                    <div className="schedule-inline-card schedule-inline-info-tile">
                      <div className="schedule-inline-info-label">Key Card</div>
                      <div className="schedule-inline-info-value">{selectedWeekShift.role}</div>
                    </div>
                    <div className="schedule-inline-card schedule-inline-info-tile">
                      <div className="schedule-inline-info-label">Project</div>
                      <div className="schedule-inline-info-value">{selectedWeekShift.location}</div>
                    </div>
                    <div className="schedule-inline-card schedule-inline-info-tile">
                      <div className="schedule-inline-info-label">Team</div>
                      <div className="schedule-inline-info-value">{selectedWeekShift.manager}</div>
                    </div>
                  </div>

                  <div className="schedule-inline-section-label">Breaks</div>
                  <div className="schedule-inline-card schedule-inline-section-card">
                    {selectedWeekShift.breaks.map((b, i) => (
                      <div
                        key={`${selectedWeekShift.id}-break-${i}`}
                        className={`schedule-inline-break-row${i < selectedWeekShift.breaks.length - 1 ? ' schedule-inline-break-row--divider' : ''}`}
                      >
                        <IonIcon icon={b.type === 'meal' ? restaurantOutline : cafeOutline} className="schedule-inline-break-icon" />
                        <span className="schedule-inline-break-label">{breakLabel(b)}</span>
                        <span className="schedule-inline-break-time">{formatHour(b.startHour)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="schedule-inline-section-label">Team</div>
                  <div className="schedule-inline-card schedule-inline-section-card">
                    {selectedWeekShift.team.map((member, i) => (
                      <div
                        key={`${selectedWeekShift.id}-member-${member.name}-${i}`}
                        className={`schedule-inline-team-row${i < selectedWeekShift.team.length - 1 ? ' schedule-inline-team-row--divider' : ''}`}
                      >
                        <span className="schedule-inline-team-name">{member.name}</span>
                        <span className="schedule-inline-team-role">{member.role}</span>
                        <IonButton
                          fill="clear"
                          size="small"
                          className="schedule-inline-team-chat-btn"
                          onClick={() => history.push('/chat', { chatWith: member.name })}
                          aria-label={`Chat with ${member.name}`}
                        >
                          <IonIcon icon={chatbubbleOutline} />
                        </IonButton>
                      </div>
                    ))}
                  </div>

                  {selectedWeekShift.notes ? (
                    <>
                      <div className="schedule-inline-section-label">Notes</div>
                      <div className="schedule-inline-card schedule-inline-section-card">
                        <p className="schedule-inline-notes-text">{selectedWeekShift.notes}</p>
                      </div>
                    </>
                  ) : null}

                  <button
                    type="button"
                    className="schedule-inline-open-btn"
                    onClick={(event) => navigateToShift(event, selectedWeekShift.id)}
                  >
                    Open Full Shift View
                  </button>
                </>
              ) : (
                <div className="schedule-week-off-card">
                  <span>Day Off</span>
                  <small>No shift scheduled for this day.</small>
                </div>
              )}
            </div>

            <div className="schedule-week-dock">
              <IonButton fill="clear" className="schedule-week-dock-nav schedule-week-dock-nav--left" onClick={() => moveRange(-1)} aria-label="Previous week">
                <IonIcon icon={chevronBackOutline} />
              </IonButton>
              <IonButton fill="clear" className="schedule-week-dock-nav schedule-week-dock-nav--right" onClick={() => moveRange(1)} aria-label="Next week">
                <IonIcon icon={chevronForwardOutline} />
              </IonButton>
              {selectedWeekEntry ? (
                <div className="schedule-week-selected-date-line">
                  {DAY_NAMES[selectedWeekEntry.date.getDay()]}, {MONTH_NAMES[selectedWeekEntry.date.getMonth()]} {selectedWeekEntry.date.getDate()}, {selectedWeekEntry.date.getFullYear()}
                </div>
              ) : null}

              <div className="schedule-weekday-strip">
                {schedule.map(({ date, shift }) => {
                  const active = isSameDay(date, selectedWeekDate);
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className={`schedule-weekday-dot-btn${active ? ' active' : ''}`}
                      onClick={() => setSelectedWeekDate(startOfDay(date))}
                    >
                      <span className="schedule-weekday-letter">{DAY_NAMES[date.getDay()].charAt(0)}</span>
                      {shift ? <span className="schedule-weekday-scheduled-dot" /> : <span className="schedule-weekday-scheduled-dot schedule-weekday-scheduled-dot--off" />}
                    </button>
                  );
                })}
              </div>
            </div>
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
                const request = shift ? changeRequests[shift.id] : undefined;
                const requestStatusClass = request?.status ? ` schedule-month-request--${request.status}` : '';
                return (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    className={`schedule-month-cell${cell.isToday ? ' schedule-month-cell--today' : ''}${shift ? ' has-shift' : ''}`}
                    onClick={shift ? (event) => navigateToShift(event, shift.id) : undefined}
                    disabled={!shift}
                  >
                    <span className="schedule-month-day">{cell.date.getDate()}</span>
                    {request ? (
                      <span className={`schedule-month-request${requestStatusClass}`} aria-label={`Request ${request.status}`}>
                        <IonIcon icon={request.status === 'approved' ? checkmarkCircleOutline : request.status === 'denied' ? closeCircleOutline : paperPlaneOutline} />
                      </span>
                    ) : null}
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
