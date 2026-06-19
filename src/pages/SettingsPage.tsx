import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkforce } from '../context/WorkforceContext';
import { formatHour } from '../data/scheduleData';
import {
  decimalHourFromDate,
  decimalHourMinutesAgo,
  decimalHourMinutesFromNow,
  decimalHourToTimeValue,
  timeValueToDecimalHour,
} from '../lib/shiftTimeUtils';
import './SettingsPage.css';

const START_PRESETS = [
  { id: 'now', label: 'Start now', getHour: () => decimalHourMinutesAgo(1) },
  { id: '30ago', label: 'Started 30m ago', getHour: () => decimalHourMinutesAgo(30) },
  { id: '5ahead', label: 'Starts in 5m', getHour: () => decimalHourMinutesFromNow(5) },
] as const;

const SettingsPage: React.FC = () => {
  const [presentAlert] = useIonAlert();
  const {
    todayShift,
    hasShiftToday,
    isLoading,
    getShiftStatusForDate,
    saveShiftStartOverride,
    scheduleTodayForTesting,
    refreshSchedule,
  } = useWorkforce();
  const [startTimeValue, setStartTimeValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!todayShift) {
      setStartTimeValue('');
      return;
    }
    setStartTimeValue(decimalHourToTimeValue(todayShift.startHour));
  }, [todayShift]);

  const selectedStartHour = useMemo(
    () => timeValueToDecimalHour(startTimeValue),
    [startTimeValue]
  );

  const todayStatus = useMemo(
    () => (todayShift ? getShiftStatusForDate(new Date(), todayShift) : null),
    [todayShift, getShiftStatusForDate]
  );

  const applyStartHour = async (startHour: number, label: string) => {
    if (!todayShift || !Number.isFinite(startHour)) return;
    setIsSaving(true);
    setStartTimeValue(decimalHourToTimeValue(startHour));
    await saveShiftStartOverride(todayShift.id, startHour);
    setIsSaving(false);
    presentAlert({
      header: 'Shift start updated',
      message: `Today's shift (${todayShift.role}) now starts at ${formatHour(startHour)} — ${label}.`,
      buttons: ['OK'],
    });
  };

  const onSave = async () => {
    if (selectedStartHour === null) return;
    await applyStartHour(selectedStartHour, 'saved');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding settings-page">
        <IonCard className="settings-card">
          <IonCardHeader>
            <IonCardSubtitle>Demo Shift Testing</IonCardSubtitle>
            <IonCardTitle>Today&apos;s Shift Start Time</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p className="settings-help-copy">
              Adjust when today&apos;s scheduled shift starts. Changes sync to the schedule,
              dashboard clock bowl, and shift detail pages immediately.
            </p>
            {isLoading ? (
              <p className="settings-empty-state">Loading schedule…</p>
            ) : hasShiftToday && todayShift ? (
              <>
                <div className="settings-shift-summary">
                  <span className="settings-shift-role">{todayShift.role}</span>
                  <span className="settings-shift-location">{todayShift.location}</span>
                  {todayStatus && (
                    <span className={`settings-shift-status settings-shift-status--${todayStatus}`}>
                      {todayStatus.replace('-', ' ')}
                    </span>
                  )}
                </div>

                <p className="settings-section-label">Quick presets</p>
                <div className="settings-preset-row">
                  {START_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className="settings-preset-btn"
                      disabled={isSaving}
                      onClick={() => void applyStartHour(preset.getHour(), preset.label)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <label className="settings-time-label" htmlFor="today-shift-start-time">
                  Custom start time
                </label>
                <input
                  id="today-shift-start-time"
                  className="settings-time-input"
                  type="time"
                  step={60}
                  value={startTimeValue}
                  onChange={event => setStartTimeValue(event.target.value)}
                />
                <p className="settings-current-value">
                  Current: <strong>{formatHour(todayShift.startHour)}</strong>
                  {' · '}
                  Now: <strong>{formatHour(decimalHourFromDate(new Date()))}</strong>
                </p>
                <IonButton
                  expand="block"
                  onClick={() => void onSave()}
                  disabled={isSaving || selectedStartHour === null}
                >
                  {isSaving ? 'Saving…' : 'Save Start Time'}
                </IonButton>
              </>
            ) : (
              <div className="settings-empty-actions">
                <p className="settings-empty-state">
                  No shift is assigned for today in your local schedule.
                </p>
                <IonButton
                  expand="block"
                  onClick={() => void scheduleTodayForTesting()}
                >
                  Schedule today (demo)
                </IonButton>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={() => void refreshSchedule()}
                >
                  Refresh schedule data
                </IonButton>
              </div>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
