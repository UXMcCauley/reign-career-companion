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
import { loadShifts, saveShiftStartOverride } from '../data/blobStorage';
import { formatHour, type Shift } from '../data/scheduleData';
import './SettingsPage.css';

function decimalHourToTimeValue(decimalHour: number): string {
  const safe = Number.isFinite(decimalHour) ? decimalHour : 0;
  const normalized = ((safe % 24) + 24) % 24;
  const hours = Math.floor(normalized);
  const mins = Math.round((normalized - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function timeValueToDecimalHour(value: string): number | null {
  const [hRaw, mRaw] = value.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h + (m / 60);
}

const SettingsPage: React.FC = () => {
  const [presentAlert] = useIonAlert();
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [startTimeValue, setStartTimeValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadShifts();
      if (!active) return;
      const ordered = Object.values(loaded).sort((a, b) => Number(a.id) - Number(b.id));
      const todayIndex = new Date().getDay();
      const shift = ordered[todayIndex] ?? null;
      setTodayShift(shift);
      if (shift) setStartTimeValue(decimalHourToTimeValue(shift.startHour));
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedStartHour = useMemo(
    () => timeValueToDecimalHour(startTimeValue),
    [startTimeValue]
  );

  const onSave = async () => {
    if (!todayShift || selectedStartHour === null) return;
    setIsSaving(true);
    await saveShiftStartOverride(todayShift.id, selectedStartHour);
    setTodayShift(prev => (prev ? { ...prev, startHour: selectedStartHour } : prev));
    setIsSaving(false);
    presentAlert({
      header: 'Saved',
      message: `Alex Rivera's shift now starts at ${formatHour(selectedStartHour)} today.`,
      buttons: ['OK'],
    });
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
            <IonCardTitle>Alex Rivera Shift Start Time</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p className="settings-help-copy">
              Set today's shift start time for the demo account. This drives countdown behavior in the app.
            </p>
            {todayShift ? (
              <>
                <label className="settings-time-label" htmlFor="alex-shift-start-time">
                  Start time
                </label>
                <input
                  id="alex-shift-start-time"
                  className="settings-time-input"
                  type="time"
                  step={60}
                  value={startTimeValue}
                  onChange={event => setStartTimeValue(event.target.value)}
                />
                <p className="settings-current-value">
                  Current: <strong>{formatHour(todayShift.startHour)}</strong>
                </p>
                <IonButton
                  expand="block"
                  onClick={onSave}
                  disabled={isSaving || selectedStartHour === null}
                >
                  {isSaving ? 'Saving...' : 'Save Start Time'}
                </IonButton>
              </>
            ) : (
              <p className="settings-empty-state">No shift found for today.</p>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
