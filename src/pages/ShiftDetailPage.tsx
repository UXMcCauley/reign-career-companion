import {
  IonBackButton,
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
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
import { loadShifts, loadShiftRuntime, saveShiftRuntime } from '../data/blobStorage';
import {
  DAY_NAMES,
  MONTH_NAMES,
  formatHour,
  shiftDuration,
  getWeekDays,
  type Shift,
  type Break
} from '../data/scheduleData';
import './ShiftDetailPage.css';

type ShiftStatus = 'upcoming' | 'in-progress' | 'completed';

const MISC = -1;

function getShiftDateForDayId(id: string): Date {
  const dayOfWeek = parseInt(id, 10);
  return getWeekDays(new Date())[dayOfWeek];
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
  const shift = shifts[shiftId];

  const [isClockedIn, setIsClockedIn] = useState(false);
  // null = no active break, MISC (-1) = misc/away, 0+ = scheduled break index
  const [activeBreakIndex, setActiveBreakIndex] = useState<number | null>(null);

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

  const shiftDate = useMemo(() => getShiftDateForDayId(shiftId), [shiftId]);
  const status = useMemo(
    () => (shift ? getStatus(shiftDate, shift.startHour, shift.endHour) : 'upcoming'),
    [shift, shiftDate]
  );
  const countdown = useMemo(
    () => (shift && status === 'upcoming' ? formatCountdown(shiftDate, shift.startHour) : null),
    [shift, shiftDate, status]
  );
  const isToday = useMemo(() => new Date().getDay() === parseInt(shiftId, 10), [shiftId]);

  const dayOfWeek = parseInt(shiftId, 10);
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
          <div className="shift-detail-empty">No shift found.</div>
        </IonContent>
      </IonPage>
    );
  }

  const breakRows = shift.breaks;
  const noActiveBreak = activeBreakIndex === null;

  return (
    <IonPage>
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
            <IonButton fill="clear" size="small" className="shift-hero-request">
              <IonIcon icon={swapHorizontalOutline} slot="start" />
              Request Change
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

          {/* Breaks */}
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
    </IonPage>
  );
};

export default ShiftDetailPage;
