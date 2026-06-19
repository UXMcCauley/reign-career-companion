import { IonButton, IonIcon, useIonAlert } from '@ionic/react';
import {
  addCircleOutline,
  albumsOutline,
  cafeOutline,
  checkmarkCircleOutline,
  restaurantOutline,
  stopCircleOutline,
  timeOutline,
  timerOutline,
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useWorkforce } from '../context/WorkforceContext';
import { formatHour, type Break, type Shift } from '../data/scheduleData';
import { getShiftStatus } from '../data/scheduleResolver';
import { demoEmployeeTalentCards } from '../data/talentCards';
import {
  buildSessionSummary,
  formatHoursMinutes,
  keyCardName,
} from '../lib/sessionMetrics';
import './ShiftClockControls.css';

const MISC = -1;

function formatClockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function breakLabel(b: Break): string {
  return b.type === 'meal' ? '30 min lunch' : `${b.durationMins} min break`;
}

function breakAlertLabel(b: Break): string {
  return b.type === 'meal' ? 'lunch break' : `${b.durationMins}-minute break`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export interface ShiftClockControlsProps {
  shift: Shift;
  shiftDate: Date;
  /** Use schedule-inline card styling inside schedule views. */
  variant?: 'default' | 'inline';
}

const ShiftClockControls: React.FC<ShiftClockControlsProps> = ({
  shift,
  shiftDate,
  variant = 'default',
}) => {
  const [presentAlert] = useIonAlert();
  const [selectedKeyCardId, setSelectedKeyCardId] = useState<string | null>(null);
  const {
    getShiftForDate,
    activeSession,
    isClockedInForShift,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    setActiveKeyCard,
    clockEvents,
  } = useWorkforce();

  const shiftId = shift.id;
  const isClockedIn = isClockedInForShift(shiftId);
  const activeKeyCardId = isClockedIn
    ? (activeSession?.activeKeyCardId ?? null)
    : selectedKeyCardId;
  const activeKeyCardName = useMemo(
    () => (activeKeyCardId ? keyCardName(activeKeyCardId) : null),
    [activeKeyCardId]
  );
  const activeBreakIndex =
    isClockedIn && activeSession?.shiftId === shiftId
      ? (activeSession.activeBreakIndex ?? null)
      : null;

  const isToday = useMemo(() => isSameCalendarDay(shiftDate, new Date()), [shiftDate]);
  const status = useMemo(
    () => getShiftStatus(shiftDate, shift.startHour, shift.endHour),
    [shift, shiftDate]
  );
  const showClockControls = isToday && status !== 'completed';

  const [nowTick, setNowTick] = useState(() => Date.now());
  const sessionForShift = activeSession?.shiftId === shiftId ? activeSession : null;
  useEffect(() => {
    if (!sessionForShift) return;
    setNowTick(Date.now());
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [sessionForShift]);

  const sessionSummary = useMemo(
    () => (sessionForShift ? buildSessionSummary(sessionForShift, clockEvents, nowTick) : null),
    [sessionForShift, clockEvents, nowTick]
  );

  useEffect(() => {
    if (!isClockedIn || activeBreakIndex === null || !showClockControls) return;

    const idx = activeBreakIndex;
    const label = idx === MISC
      ? 'miscellaneous break'
      : shift.breaks[idx] ? breakAlertLabel(shift.breaks[idx]) : 'break';
    presentAlert({
      header: 'Break in progress',
      message: `Your ${label} is still active. Ready to end it?`,
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        {
          text: 'End Break',
          handler: () => {
            void endBreak();
          },
        },
      ],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId, shift, isClockedIn, activeBreakIndex, showClockControls]);

  if (!showClockControls) return null;

  const cardClass = variant === 'inline' ? 'schedule-inline-card' : 'sdc';
  const sectionLabelClass = variant === 'inline' ? 'schedule-inline-section-label' : 'shift-section-label';
  const sectionCardClass = variant === 'inline' ? 'schedule-inline-card schedule-inline-section-card' : 'sdc shift-section-card';
  const noActiveBreak = activeBreakIndex === null;
  const scheduledToday = getShiftForDate(new Date());
  const canClockIn = Boolean(activeKeyCardId) && !isClockedIn;

  const chooseKeyCard = (header: string, onPick: (keyCardId: string) => void) => {
    presentAlert({
      header,
      inputs: demoEmployeeTalentCards.map((card, index) => ({
        type: 'radio' as const,
        name: 'keycard',
        label: card.name,
        value: card.id,
        checked: activeKeyCardId ? activeKeyCardId === card.id : index === 0,
      })),
      buttons: [
        'Cancel',
        {
          text: 'Confirm',
          handler: (data: string | { keycard?: string }) => {
            const selected = (typeof data === 'string' ? data : data?.keycard) ?? demoEmployeeTalentCards[0]?.id;
            if (selected) onPick(selected);
          },
        },
      ],
    });
  };

  const handleSelectKeyCard = () => chooseKeyCard('Select keycard', setSelectedKeyCardId);
  const handleSwitchKeyCard = () =>
    chooseKeyCard('Switch keycard', id => {
      void setActiveKeyCard(id);
    });

  const handleClockIn = () => {
    if (!isToday) {
      presentAlert({
        header: 'Not today',
        message: 'You can only clock in on the day of your scheduled shift.',
      });
      return;
    }
    if (!scheduledToday || scheduledToday.id !== shiftId) {
      presentAlert({
        header: 'Not scheduled',
        message: 'You are not scheduled to work today.',
      });
      return;
    }
    if (!activeKeyCardId) {
      presentAlert({
        header: 'Key card required',
        message: 'Select a key card before clocking in.',
        buttons: ['OK'],
      });
      return;
    }
    void clockIn({ shiftId, keyCardId: activeKeyCardId });
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
            void clockOut();
            setSelectedKeyCardId(null);
          },
        },
      ],
    });
  };

  const handleStartBreak = (index: number) => {
    const label = index === MISC
      ? 'a miscellaneous break'
      : `your ${breakAlertLabel(shift.breaks[index])}`;
    presentAlert({
      header: 'Start Break',
      message: `Ready to start ${label}?`,
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        {
          text: 'Start Break',
          handler: () => {
            void startBreak(index);
          },
        },
      ],
    });
  };

  const handleEndBreak = (index: number) => {
    const label = index === MISC
      ? 'miscellaneous break'
      : breakAlertLabel(shift.breaks[index]);
    presentAlert({
      header: 'End Break',
      message: `End your ${label}?`,
      buttons: [
        { text: 'Stay on break', role: 'cancel' },
        {
          text: 'End Break',
          handler: () => {
            void endBreak();
          },
        },
      ],
    });
  };

  return (
    <div className={`shift-clock-controls${variant === 'inline' ? ' shift-clock-controls--inline' : ''}`}>
      <div className={`${cardClass} shift-keycard-card${activeKeyCardId ? ' is-ready' : ''}`}>
        <div className="shift-keycard-info">
          <IonIcon icon={albumsOutline} className="shift-keycard-icon" />
          <div className="shift-keycard-copy">
            <span className="shift-keycard-label">Key Card</span>
            <span className="shift-keycard-name">
              {activeKeyCardName ?? 'Required before clock in'}
            </span>
          </div>
        </div>
        <IonButton
          fill="outline"
          size="small"
          className="shift-keycard-btn"
          onClick={isClockedIn ? handleSwitchKeyCard : handleSelectKeyCard}
        >
          {isClockedIn ? 'Switch' : 'Select'}
        </IonButton>
      </div>

      {isClockedIn ? (
        <div className={`${cardClass} shift-clockin-card`}>
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
          disabled={!canClockIn}
        >
          <IonIcon icon={timeOutline} slot="start" />
          Clock In
        </IonButton>
      )}

      {sessionSummary && (
        <div className={`${cardClass} shift-session-card`}>
          <div className="shift-session-head">
            <span className={`shift-session-live-dot${sessionSummary.onBreak ? ' on-break' : ''}`} aria-hidden="true" />
            <span className="shift-session-title">{sessionSummary.onBreak ? 'On Break' : 'Live Session'}</span>
          </div>

          <div className="shift-session-primary">
            <div className="shift-session-stat">
              <span className="shift-session-value">${sessionSummary.earnings.toFixed(2)}</span>
              <span className="shift-session-label">Earnings</span>
            </div>
            <div className="shift-session-divider" />
            <div className="shift-session-stat">
              <span className="shift-session-value">{formatHms(sessionSummary.workedSeconds)}</span>
              <span className="shift-session-label">Hours Worked</span>
            </div>
            <div className="shift-session-divider" />
            <div className="shift-session-stat">
              <span className="shift-session-value">{formatHms(sessionSummary.totalBreakSeconds)}</span>
              <span className="shift-session-label">Break Time</span>
            </div>
          </div>

          {sessionSummary.perKeyCard.length > 0 && (
            <div className="shift-session-section">
              <div className="shift-session-section-label">Hours per Key Card</div>
              {sessionSummary.perKeyCard.map(kc => (
                <div key={kc.keyCardId ?? 'none'} className="shift-session-row">
                  <span className="shift-session-row-name">{keyCardName(kc.keyCardId)}</span>
                  <span className="shift-session-row-value">{formatHoursMinutes(kc.seconds)}</span>
                </div>
              ))}
            </div>
          )}

          {sessionSummary.breaks.length > 0 && (
            <div className="shift-session-section">
              <div className="shift-session-section-label">Breaks &amp; Lunch</div>
              {sessionSummary.breaks.map(b => (
                <div key={b.id} className="shift-session-row">
                  <span className="shift-session-row-name">{b.label}</span>
                  <span className="shift-session-row-meta">
                    {formatClockTime(b.startTs)}
                    {b.endTs ? ` – ${formatClockTime(b.endTs)}` : ' · ongoing'}
                  </span>
                  <span className="shift-session-row-value">{formatHoursMinutes(b.seconds)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isClockedIn && (
        <>
          <div className={sectionLabelClass}>Breaks</div>
          <div className={sectionCardClass}>
            {shift.breaks.map((b, i) => {
              const isActive = activeBreakIndex === i;
              const isDisabled = !noActiveBreak && !isActive;
              return (
                <div
                  key={i}
                  className={[
                    'shift-break-row',
                    'shift-break-row--divider',
                    isActive ? 'shift-break-row--active' : '',
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
                    onClick={() => (isActive ? handleEndBreak(i) : handleStartBreak(i))}
                    aria-label={isActive ? 'End break' : 'Start break'}
                  >
                    <IonIcon icon={isActive ? stopCircleOutline : addCircleOutline} />
                  </IonButton>
                </div>
              );
            })}

            {(() => {
              const isActive = activeBreakIndex === MISC;
              const isDisabled = !noActiveBreak && !isActive;
              return (
                <div
                  className={[
                    'shift-break-row',
                    isActive ? 'shift-break-row--active' : '',
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
                    onClick={() => (isActive ? handleEndBreak(MISC) : handleStartBreak(MISC))}
                    aria-label={isActive ? 'End misc break' : 'Start misc break'}
                  >
                    <IonIcon icon={isActive ? stopCircleOutline : addCircleOutline} />
                  </IonButton>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default ShiftClockControls;
