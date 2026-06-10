import {
  IonBackButton,
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonAlert
} from '@ionic/react';
import {
  addCircleOutline,
  cafeOutline,
  chatbubbleEllipsesOutline,
  chatbubbleOutline,
  checkmarkCircleOutline,
  restaurantOutline,
  stopCircleOutline,
  swapHorizontalOutline,
  timeOutline,
  timerOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { loadEmployees, loadShifts, loadShiftRuntime, saveShiftRuntime } from '../data/blobStorage';
import {
  DAY_NAMES,
  MONTH_NAMES,
  formatHour,
  shiftDuration,
  type Shift,
  type Break
} from '../data/scheduleData';
import type { DemoEmployee } from '../data/employees';
import './ShiftDetailPage.css';

type ShiftStatus = 'upcoming' | 'in-progress' | 'completed';
type ChangeRequestMode = 'swap' | 'off';
type ShiftChangeRequestMap = Record<string, { mode: ChangeRequestMode; submittedAt: number; targetName?: string }>;

const MISC = -1;
const SHIFT_CHANGE_REQUESTS_LOCAL_KEY = 'reign_shift_change_requests_v1';

function getShiftDateForShiftId(id: string): Date {
  const numericId = parseInt(id, 10);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);
  if (Number.isNaN(numericId)) return weekStart;
  const resolved = new Date(weekStart);
  resolved.setDate(weekStart.getDate() + Math.max(0, numericId - 1));
  return resolved;
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

function breakAlertLabel(b: Break): string {
  return b.type === 'meal' ? 'lunch break' : `${b.durationMins}-minute break`;
}

const STATUS_LABELS: Record<ShiftStatus, string> = {
  upcoming: 'UPCOMING',
  'in-progress': 'IN PROGRESS',
  completed: 'COMPLETED',
};

const ShiftDetailPage: React.FC = () => {
  const { shiftId } = useParams<{ shiftId: string }>();
  const history = useHistory();
  const [presentAlert] = useIonAlert();
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [hasLoadedShifts, setHasLoadedShifts] = useState(false);
  const [employees, setEmployees] = useState<DemoEmployee[]>([]);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeSearch, setChangeSearch] = useState('');
  const [changeMode, setChangeMode] = useState<ChangeRequestMode>('swap');
  const [changeRequests, setChangeRequests] = useState<ShiftChangeRequestMap>({});
  const shift = shifts[shiftId];

  const [isClockedIn, setIsClockedIn] = useState(false);
  // null = no active break, MISC (-1) = misc/away, 0+ = scheduled break index
  const [activeBreakIndex, setActiveBreakIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadShifts();
      if (active) {
        setShifts(loaded);
        setHasLoadedShifts(true);
      }
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

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadEmployees();
      if (active) setEmployees(loaded);
    })();
    return () => {
      active = false;
    };
  }, []);

  const shiftDate = useMemo(() => getShiftDateForShiftId(shiftId), [shiftId]);
  const status = useMemo(
    () => (shift ? getStatus(shiftDate, shift.startHour, shift.endHour) : 'upcoming'),
    [shift, shiftDate]
  );
  const countdown = useMemo(
    () => (shift && status === 'upcoming' ? formatCountdown(shiftDate, shift.startHour) : null),
    [shift, shiftDate, status]
  );
  const isToday = useMemo(() => {
    const now = new Date();
    return now.toDateString() === shiftDate.toDateString();
  }, [shiftDate]);

  const dayOfWeek = shiftDate.getDay();
  const headerTitle = `${DAY_NAMES[dayOfWeek]}, ${MONTH_NAMES[shiftDate.getMonth()]} ${shiftDate.getDate()}`;

  // Restore persisted state and surface active-break prompt on each visit
  useEffect(() => {
    (async () => {
      const runtime = await loadShiftRuntime(shiftId);
      setIsClockedIn(runtime.isClockedIn);

      if (runtime.activeBreakIndex !== null) {
        const idx = runtime.activeBreakIndex;
        const currentShift = shifts[shiftId];
        if (!currentShift) return;

        setActiveBreakIndex(idx);
        const label = idx === MISC
          ? 'miscellaneous break'
          : currentShift.breaks[idx] ? breakAlertLabel(currentShift.breaks[idx]) : 'break';
        presentAlert({
          header: 'Break in progress',
          message: `Your ${label} is still active. Ready to end it?`,
          buttons: [
            { text: 'Not yet', role: 'cancel' },
            {
              text: 'End Break',
              handler: () => {
                setActiveBreakIndex(null);
                void saveShiftRuntime(shiftId, { isClockedIn: runtime.isClockedIn, activeBreakIndex: null });
              }
            }
          ]
        });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId, shifts]);

  const persistRuntime = (clockedIn: boolean, breakIndex: number | null) => {
    void saveShiftRuntime(shiftId, { isClockedIn: clockedIn, activeBreakIndex: breakIndex });
  };

  // ── Clock in / out ──
  const handleClockIn = () => {
    setIsClockedIn(true);
    persistRuntime(true, activeBreakIndex);
  };

  const handleClockOut = () => {
    presentAlert({
      header: 'Clock Out',
      message: 'Are you sure you want to clock out?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Clock Out',
          cssClass: 'alert-button-danger',
          handler: () => {
            setIsClockedIn(false);
            persistRuntime(false, activeBreakIndex);
          }
        }
      ]
    });
  };

  // ── Break controls ──
  const handleStartBreak = (index: number) => {
    const label = index === MISC
      ? 'a miscellaneous break'
      : `your ${breakAlertLabel(shift!.breaks[index])}`;
    presentAlert({
      header: 'Start Break',
      message: `Ready to start ${label}?`,
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        {
          text: 'Start Break',
          handler: () => {
            setActiveBreakIndex(index);
            persistRuntime(isClockedIn, index);
          }
        }
      ]
    });
  };

  const handleEndBreak = (index: number) => {
    const label = index === MISC
      ? 'miscellaneous break'
      : breakAlertLabel(shift!.breaks[index]);
    presentAlert({
      header: 'End Break',
      message: `End your ${label}?`,
      buttons: [
        { text: 'Stay on break', role: 'cancel' },
        {
          text: 'End Break',
          handler: () => {
            setActiveBreakIndex(null);
            persistRuntime(isClockedIn, null);
          }
        }
      ]
    });
  };

  const onChatWithMember = (name: string) => {
    history.push('/chat', { chatWith: name });
  };

  const matchingChangeEmployees = useMemo(() => {
    if (!shift) return [];
    const shiftRole = shift.role.toLowerCase();
    const shiftTokens = shiftRole.split(/\s+/).filter(token => token.length > 3);
    const keyCardMatches = employees.filter(employee => {
      const employeeRole = employee.role.toLowerCase();
      if (employeeRole.includes(shiftRole) || shiftRole.includes(employeeRole)) return true;
      return shiftTokens.some(token => employeeRole.includes(token));
    });
    const query = changeSearch.trim().toLowerCase();
    return keyCardMatches.filter(employee =>
      !query ||
      employee.name.toLowerCase().includes(query) ||
      employee.role.toLowerCase().includes(query)
    );
  }, [changeSearch, employees, shift]);

  const hasSubmittedChangeRequest = Boolean(changeRequests[shiftId]);

  const onRequestChange = () => {
    setChangeSearch('');
    setChangeMode('swap');
    setIsChangeModalOpen(true);
  };

  const saveChangeRequest = (payload: { mode: ChangeRequestMode; targetName?: string }) => {
    setChangeRequests(prev => {
      const next = {
        ...prev,
        [shiftId]: {
          mode: payload.mode,
          submittedAt: Date.now(),
          ...(payload.targetName ? { targetName: payload.targetName } : {}),
        },
      };
      localStorage.setItem(SHIFT_CHANGE_REQUESTS_LOCAL_KEY, JSON.stringify(next));
      return next;
    });
  };

  const onChooseChangeEmployee = (employee: DemoEmployee) => {
    setIsChangeModalOpen(false);
    saveChangeRequest({ mode: 'swap', targetName: employee.name });
    presentAlert({
      header: 'Shift change request sent',
      message: `We sent a request to ${employee.name} for this ${shift?.role ?? 'shift'}.`,
      buttons: ['OK'],
    });
  };

  const onSubmitAskOff = () => {
    setIsChangeModalOpen(false);
    saveChangeRequest({ mode: 'off' });
    presentAlert({
      header: 'Time-off request sent',
      message: 'Your ask-off request has been submitted for this shift.',
      buttons: ['OK'],
    });
  };

  if (!hasLoadedShifts) {
    return (
      <IonPage>
        <IonHeader translucent>
          <IonToolbar className="shift-detail-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/schedule" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="shift-detail-content">
          <div className="shift-detail-empty">Loading shift details...</div>
        </IonContent>
      </IonPage>
    );
  }

  if (!shift) {
    return (
      <IonPage>
        <IonHeader translucent>
          <IonToolbar className="shift-detail-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/schedule" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="shift-detail-content">
          <div className="shift-detail-empty-wrap">
            <div className="shift-detail-empty-emoji" aria-hidden="true">🌼</div>
            <div className="shift-detail-empty-title">Woopsie Daisy!</div>
            <div className="shift-detail-empty-copy">
              There doesn&apos;t seem to be a shift for you on that day.
            </div>
            <IonButton fill="outline" className="shift-detail-empty-btn" onClick={() => history.push('/schedule')}>
              Back to Schedule
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const breakRows = shift.breaks;
  const noActiveBreak = activeBreakIndex === null;

  return (
    <IonPage className="shift-detail-page">
      <IonHeader translucent className="shift-detail-header">
        <IonToolbar className="shift-detail-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/schedule" className="shift-detail-back" />
          </IonButtons>
          <IonTitle className="shift-detail-title">{headerTitle}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="shift-detail-content">
        <div className="shift-detail-body">

          {/* Hero card */}
          <div className="sdc sdc--hero">
            <IonButton
              fill="clear"
              size="small"
              className={`shift-hero-request${hasSubmittedChangeRequest ? ' shift-hero-request--submitted' : ''}`}
              onClick={onRequestChange}
            >
              <IonIcon icon={hasSubmittedChangeRequest ? checkmarkCircleOutline : swapHorizontalOutline} slot="start" />
              {hasSubmittedChangeRequest ? 'Request Submitted' : 'Request Change'}
            </IonButton>
            <div className={`shift-status-pill shift-status-pill--${status}`}>
              {STATUS_LABELS[status]}
            </div>
            <div className="shift-hero-time">
              {formatHour(shift.startHour)}
              <span className="shift-hero-arrow"> → </span>
              {formatHour(shift.endHour)}
            </div>
            <div className="shift-hero-duration">{shiftDuration(shift)}</div>
            {countdown && <div className="shift-hero-countdown">{countdown}</div>}
          </div>

          {/* Clock In / Out — today's shift only */}
          {isToday && (
            isClockedIn ? (
              <div className="sdc shift-clockin-card">
                <div className="shift-clockin-status">
                  <IonIcon icon={checkmarkCircleOutline} className="shift-clockin-check" />
                  <span className="shift-clockin-label">Clocked in</span>
                </div>
                <IonButton
                  expand="block"
                  fill="outline"
                  className="shift-clockout-btn"
                  onClick={handleClockOut}
                >
                  Clock Out
                </IonButton>
              </div>
            ) : (
              <IonButton
                expand="block"
                color="success"
                className="shift-clockin-btn"
                onClick={handleClockIn}
              >
                <IonIcon icon={timeOutline} slot="start" />
                Clock In
              </IonButton>
            )
          )}

          {/* 3-up info tiles */}
          <div className="shift-info-row">
            <div className="sdc shift-info-tile">
              <div className="shift-info-label">Key Card</div>
              <div className="shift-info-value">{shift.role}</div>
            </div>
            <div className="sdc shift-info-tile">
              <div className="shift-info-label">Project</div>
              <div className="shift-info-value">{shift.location}</div>
            </div>
            <div className="sdc shift-info-tile">
              <div className="shift-info-label">Team</div>
              <div className="shift-info-value">{shift.manager}</div>
            </div>
          </div>

          {/* Breaks (only while actively clocked in today) */}
          {isToday && isClockedIn ? (
            <>
              <div className="shift-section-label">Breaks</div>
              <div className="sdc shift-section-card">
                {breakRows.map((b, i) => {
                  const isActive = activeBreakIndex === i;
                  const isDisabled = !noActiveBreak && !isActive;
                  return (
                    <div
                      key={i}
                      className={[
                        'shift-break-row',
                        i < breakRows.length - 1 || true ? 'shift-break-row--divider' : '',
                        isActive ? 'shift-break-row--active' : ''
                      ].filter(Boolean).join(' ')}
                    >
                      <IonIcon
                        icon={b.type === 'meal' ? restaurantOutline : cafeOutline}
                        className="shift-break-icon"
                      />
                      <span className="shift-break-label">{breakLabel(b)}</span>
                      <span className="shift-break-time">{formatHour(b.startHour)}</span>
                      <IonButton
                        fill="clear"
                        size="small"
                        disabled={isDisabled}
                        className={`shift-break-action${isActive ? ' shift-break-action--active' : ''}`}
                        onClick={() => isActive ? handleEndBreak(i) : handleStartBreak(i)}
                        aria-label={isActive ? 'End break' : 'Start break'}
                      >
                        <IonIcon icon={isActive ? stopCircleOutline : addCircleOutline} />
                      </IonButton>
                    </div>
                  );
                })}

                {/* Misc / away row */}
                {(() => {
                  const isActive = activeBreakIndex === MISC;
                  const isDisabled = !noActiveBreak && !isActive;
                  return (
                    <div
                      className={[
                        'shift-break-row',
                        isActive ? 'shift-break-row--active' : ''
                      ].filter(Boolean).join(' ')}
                    >
                      <IonIcon icon={timerOutline} className="shift-break-icon shift-break-icon--misc" />
                      <span className="shift-break-label">Misc / Away</span>
                      <span className="shift-break-time">—</span>
                      <IonButton
                        fill="clear"
                        size="small"
                        disabled={isDisabled}
                        className={`shift-break-action${isActive ? ' shift-break-action--active' : ''}`}
                        onClick={() => isActive ? handleEndBreak(MISC) : handleStartBreak(MISC)}
                        aria-label={isActive ? 'End misc break' : 'Start misc break'}
                      >
                        <IonIcon icon={isActive ? stopCircleOutline : addCircleOutline} />
                      </IonButton>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : null}

          {/* Team */}
          <div className="shift-section-header">
            <span className="shift-section-label">Team</span>
            <IonButton fill="clear" size="small" className="shift-message-button">
              <IonIcon icon={chatbubbleEllipsesOutline} slot="start" />
              Message Team
            </IonButton>
          </div>
          <div className="sdc shift-section-card">
            {shift.team.map((member, i) => (
              <div key={i} className={`shift-team-row${i < shift.team.length - 1 ? ' shift-team-row--divider' : ''}`}>
                <span className="shift-team-name">{member.name}</span>
                <span className="shift-team-role">{member.role}</span>
                <IonButton
                  fill="clear"
                  size="small"
                  className="shift-team-chat-btn"
                  onClick={() => onChatWithMember(member.name)}
                  aria-label={`Chat with ${member.name}`}
                >
                  <IonIcon icon={chatbubbleOutline} />
                </IonButton>
              </div>
            ))}
          </div>

          {/* Notes */}
          {shift.notes && (
            <>
              <div className="shift-section-label">Notes</div>
              <div className="sdc shift-section-card">
                <p className="shift-notes-text">{shift.notes}</p>
              </div>
            </>
          )}


        </div>
      </IonContent>

      <IonModal isOpen={isChangeModalOpen} onDidDismiss={() => setIsChangeModalOpen(false)}>
        <div className="shift-change-modal">
          <div className="shift-change-modal-header">
            <h3>Request Shift Change</h3>
            <IonButton fill="clear" size="small" onClick={() => setIsChangeModalOpen(false)}>
              Close
            </IonButton>
          </div>
          <div className="shift-change-mode-toggle">
            <button
              type="button"
              className={`shift-change-mode-btn${changeMode === 'swap' ? ' active' : ''}`}
              onClick={() => setChangeMode('swap')}
            >
              Find Swap
            </button>
            <button
              type="button"
              className={`shift-change-mode-btn${changeMode === 'off' ? ' active' : ''}`}
              onClick={() => setChangeMode('off')}
            >
              Ask Off
            </button>
          </div>
          <p className="shift-change-modal-subtitle">
            {changeMode === 'swap'
              ? <>Type to find teammates with the <strong>{shift.role}</strong> key card.</>
              : 'Submit a direct request to be off for this shift.'}
          </p>
          {changeMode === 'swap' ? (
            <>
              <input
                className="shift-change-search"
                type="search"
                placeholder="Search employees"
                value={changeSearch}
                onChange={event => setChangeSearch(event.target.value)}
              />
              <div className="shift-change-list">
                {matchingChangeEmployees.length ? (
                  matchingChangeEmployees.map(employee => (
                    <button
                      key={employee.id}
                      type="button"
                      className="shift-change-item"
                      onClick={() => onChooseChangeEmployee(employee)}
                    >
                      <span className="shift-change-item-name">{employee.name}</span>
                      <span className="shift-change-item-role">{employee.role}</span>
                    </button>
                  ))
                ) : (
                  <div className="shift-change-empty">No matching employees found for this key card.</div>
                )}
              </div>
            </>
          ) : (
            <IonButton expand="block" className="shift-change-askoff-btn" onClick={onSubmitAskOff}>
              Submit Ask-Off Request
            </IonButton>
          )}
        </div>
      </IonModal>
    </IonPage>
  );
};

export default ShiftDetailPage;
