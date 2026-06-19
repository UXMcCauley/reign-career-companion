import {
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useWorkforce } from '../context/WorkforceContext';
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
import {
  addDays,
  getShiftStatus,
  isSameDay,
  startOfDay,
  startOfWeek,
} from '../data/scheduleResolver';
import './SchedulePage.css';

const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON_FIRST_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STRIP_MONTHS_BACK = 12;
const STRIP_MONTHS_FORWARD = 12;

type ViewMode = 'week' | 'month';
type MonthCell = { date: Date | null; shift: Shift | null; isToday: boolean };
type ShiftRequestStatus = 'submitted' | 'approved' | 'denied';
type ShiftChangeRequestMap = Record<string, { mode: 'swap' | 'off'; submittedAt: number; targetName?: string; status: ShiftRequestStatus }>;
type ShiftStatus = 'upcoming' | 'in-progress' | 'completed';
const STATUS_LABELS: Record<ShiftStatus, string> = {
  upcoming: 'UPCOMING',
  'in-progress': 'IN PROGRESS',
  completed: 'COMPLETED',
};

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
  const {
    getShiftForDate,
    changeRequests,
    saveChangeRequest,
  } = useWorkforce();

  const [cursorDate, setCursorDate] = useState(today);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedWeekDate, setSelectedWeekDate] = useState(startOfDay(today));
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingFromCode = useRef(false);

  const stripMonths = useMemo(() => {
    return Array.from({ length: STRIP_MONTHS_BACK + 1 + STRIP_MONTHS_FORWARD }, (_, i) => {
      const offset = i - STRIP_MONTHS_BACK;
      const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      return { year: d.getFullYear(), month: d.getMonth(), index: i };
    });
  }, [today]);

  const visibleDays = useMemo(
    () => (viewMode === 'week' ? buildWeekDays(cursorDate) : buildMonthDays(cursorDate)),
    [cursorDate, viewMode]
  );

  const schedule: DaySchedule[] = useMemo(
    () => visibleDays.map((date) => ({ date, shift: getShiftForDate(date) })),
    [visibleDays, getShiftForDate]
  );

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  // Mon-first month cells
  const monthCells = useMemo<MonthCell[]>(() => {
    if (viewMode !== 'month') return [];
    const firstDayOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    // Mon-first: Sun=0→6, Mon=1→0, Tue=2→1, ...
    const leadingBlanks = (firstDayOfMonth.getDay() + 6) % 7;
    const cells: MonthCell[] = [];
    for (let i = 0; i < leadingBlanks; i++) {
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

  const selectedMonthShift = useMemo(
    () => (selectedDayDate ? getShiftForDate(selectedDayDate) : null),
    [selectedDayDate, getShiftForDate]
  );

  const selectedMonthStatus = useMemo(
    () => (selectedDayDate && selectedMonthShift
      ? getShiftStatus(selectedDayDate, selectedMonthShift.startHour, selectedMonthShift.endHour)
      : null),
    [selectedDayDate, selectedMonthShift]
  );

  const selectedMonthCountdown = useMemo(
    () => (selectedDayDate && selectedMonthShift && selectedMonthStatus === 'upcoming'
      ? formatCountdown(selectedDayDate, selectedMonthShift.startHour)
      : null),
    [selectedDayDate, selectedMonthShift, selectedMonthStatus]
  );

  const initStripScroll = useCallback(() => {
    if (!stripRef.current) return;
    const container = stripRef.current;
    const targetIndex = stripMonths.findIndex(
      m => m.year === cursorDate.getFullYear() && m.month === cursorDate.getMonth()
    );
    if (targetIndex < 0) return;
    const itemWidth = container.clientWidth / 3;
    isScrollingFromCode.current = true;
    container.scrollLeft = Math.max(0, (targetIndex - 1) * itemWidth);
    setTimeout(() => { isScrollingFromCode.current = false; }, 250);
  }, [stripMonths, cursorDate]);

  // Scroll strip to current month when switching to month view
  useEffect(() => {
    if (viewMode !== 'month') return;
    const frame = requestAnimationFrame(initStripScroll);
    return () => cancelAnimationFrame(frame);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sheet when month changes
  useEffect(() => {
    setIsSheetOpen(false);
    setSelectedDayDate(null);
  }, [cursorDate.getMonth(), cursorDate.getFullYear()]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStripScroll = useCallback(() => {
    if (isScrollingFromCode.current) return;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      if (!stripRef.current) return;
      const container = stripRef.current;
      const itemWidth = container.clientWidth / 3;
      const centerX = container.scrollLeft + container.clientWidth / 2;
      const N = Math.round(centerX / itemWidth - 0.5);
      const clamped = Math.max(0, Math.min(stripMonths.length - 1, N));
      const m = stripMonths[clamped];
      if (m) {
        setCursorDate(new Date(m.year, m.month, 1));
      }
    }, 80);
  }, [stripMonths]);

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
    () => (selectedWeekEntry?.shift ? getShiftStatus(selectedWeekEntry.date, selectedWeekEntry.shift.startHour, selectedWeekEntry.shift.endHour) : null),
    [selectedWeekEntry]
  );
  const selectedCountdown = useMemo(
    () => (selectedWeekEntry?.shift && selectedStatus === 'upcoming' ? formatCountdown(selectedWeekEntry.date, selectedWeekEntry.shift.startHour) : null),
    [selectedStatus, selectedWeekEntry]
  );

  const rangeLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${FULL_MONTH_NAMES[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
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
    void saveChangeRequest(shiftId, {
      mode: 'off',
      submittedAt: Date.now(),
      status,
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

  const openDaySheet = (date: Date) => {
    setSelectedDayDate(date);
    setIsSheetOpen(true);
  };

  return (
    <IonPage className="schedule-page">
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
          <div className="schedule-month-view">
            {/* Swipeable month strip */}
            <div
              className="month-strip"
              ref={stripRef}
              onScroll={handleStripScroll}
            >
              {stripMonths.map(({ year, month, index }) => {
                const isActive = year === cursorDate.getFullYear() && month === cursorDate.getMonth();
                return (
                  <div
                    key={`${year}-${month}`}
                    className={`month-strip-item${isActive ? ' active' : ''}`}
                  >
                    {FULL_MONTH_NAMES[month]}
                  </div>
                );
              })}
            </div>

            {/* Calendar grid */}
            <div className="schedule-month">
              <div className="schedule-month-weekdays">
                {MON_FIRST_DAYS.map(day => (
                  <span key={day} className="schedule-month-weekday">{day}</span>
                ))}
              </div>
              <div className="schedule-month-grid">
                {monthCells.map((cell, index) => {
                  if (!cell.date) {
                    return <div key={`blank-${index}`} className="schedule-month-cell schedule-month-cell--blank" />;
                  }
                  const shift = cell.shift;
                  return (
                    <button
                      key={cell.date.toISOString()}
                      type="button"
                      className="schedule-month-cell"
                      onClick={() => openDaySheet(cell.date!)}
                    >
                      <span className={`schedule-month-day-num${cell.isToday ? ' today' : ''}`}>
                        {cell.date.getDate()}
                      </span>
                      <div className="schedule-month-dots">
                        {shift && <span className="schedule-month-shift-dot" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shift detail bottom sheet */}
            <IonModal
              isOpen={isSheetOpen}
              onDidDismiss={() => { setIsSheetOpen(false); setSelectedDayDate(null); }}
              initialBreakpoint={0.62}
              breakpoints={[0, 0.62, 1]}
              handle={true}
              className="shift-detail-sheet"
            >
              <IonContent className="schedule-sheet-content">
                {selectedDayDate && (
                  <div className="schedule-sheet-header">
                    <div className="schedule-sheet-date">
                      {DAY_NAMES[selectedDayDate.getDay()]}, {FULL_MONTH_NAMES[selectedDayDate.getMonth()]} {selectedDayDate.getDate()}
                    </div>
                  </div>
                )}

                {selectedMonthShift ? (
                  <div className="schedule-week-detail schedule-sheet-body">
                    <div className="schedule-inline-card schedule-inline-hero">
                      <IonButton
                        fill="clear"
                        size="small"
                        className={`schedule-inline-request${changeRequests[selectedMonthShift.id] ? ' schedule-inline-request--submitted' : ''}`}
                        onClick={() => requestOff(selectedMonthShift.id)}
                      >
                        <IonIcon icon={changeRequests[selectedMonthShift.id] ? checkmarkCircleOutline : swapHorizontalOutline} slot="start" />
                        {changeRequests[selectedMonthShift.id] ? 'Request Submitted' : 'Request Change'}
                      </IonButton>
                      {selectedMonthStatus ? (
                        <div className={`schedule-inline-status schedule-inline-status--${selectedMonthStatus}`}>
                          {STATUS_LABELS[selectedMonthStatus]}
                        </div>
                      ) : null}
                      <div className="schedule-inline-time">
                        {formatHour(selectedMonthShift.startHour)}
                        <span className="schedule-inline-arrow"> → </span>
                        {formatHour(selectedMonthShift.endHour)}
                      </div>
                      <div className="schedule-inline-duration">{shiftDuration(selectedMonthShift)}</div>
                      {selectedMonthCountdown ? <div className="schedule-inline-countdown">{selectedMonthCountdown}</div> : null}
                    </div>

                    <div className="schedule-inline-info-row">
                      <div className="schedule-inline-card schedule-inline-info-tile">
                        <div className="schedule-inline-info-label">Key Card</div>
                        <div className="schedule-inline-info-value">{selectedMonthShift.role}</div>
                      </div>
                      <div className="schedule-inline-card schedule-inline-info-tile">
                        <div className="schedule-inline-info-label">Project</div>
                        <div className="schedule-inline-info-value">{selectedMonthShift.location}</div>
                      </div>
                      <div className="schedule-inline-card schedule-inline-info-tile">
                        <div className="schedule-inline-info-label">Team</div>
                        <div className="schedule-inline-info-value">{selectedMonthShift.manager}</div>
                      </div>
                    </div>

                    <div className="schedule-inline-section-label">Breaks</div>
                    <div className="schedule-inline-card schedule-inline-section-card">
                      {selectedMonthShift.breaks.map((b, i) => (
                        <div
                          key={`sheet-break-${i}`}
                          className={`schedule-inline-break-row${i < selectedMonthShift.breaks.length - 1 ? ' schedule-inline-break-row--divider' : ''}`}
                        >
                          <IonIcon icon={b.type === 'meal' ? restaurantOutline : cafeOutline} className="schedule-inline-break-icon" />
                          <span className="schedule-inline-break-label">{breakLabel(b)}</span>
                          <span className="schedule-inline-break-time">{formatHour(b.startHour)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="schedule-inline-section-label">Team</div>
                    <div className="schedule-inline-card schedule-inline-section-card">
                      {selectedMonthShift.team.map((member, i) => (
                        <div
                          key={`sheet-member-${i}`}
                          className={`schedule-inline-team-row${i < selectedMonthShift.team.length - 1 ? ' schedule-inline-team-row--divider' : ''}`}
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

                    {selectedMonthShift.notes ? (
                      <>
                        <div className="schedule-inline-section-label">Notes</div>
                        <div className="schedule-inline-card schedule-inline-section-card">
                          <p className="schedule-inline-notes-text">{selectedMonthShift.notes}</p>
                        </div>
                      </>
                    ) : null}

                    <button
                      type="button"
                      className="schedule-inline-open-btn"
                      onClick={() => {
                        setIsSheetOpen(false);
                        history.push(`/schedule/${selectedMonthShift.id}`);
                      }}
                    >
                      Open Full Shift View
                    </button>
                  </div>
                ) : (
                  <div className="schedule-week-off-card schedule-sheet-off-card">
                    <span>Day Off</span>
                    <small>No shift scheduled for this day.</small>
                  </div>
                )}
              </IonContent>
            </IonModal>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SchedulePage;
