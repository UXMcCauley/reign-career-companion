import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import {
  DAY_NAMES,
  MONTH_NAMES,
  MOCK_SHIFTS,
  getWeekDays,
  formatHour,
  shiftDurationShort,
  type DaySchedule
} from '../data/scheduleData';
import './SchedulePage.css';

const SchedulePage: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const history = useHistory();
  const weekDays = useMemo(() => getWeekDays(today), [today]);

  const schedule: DaySchedule[] = useMemo(
    () => weekDays.map((date) => ({ date, shift: MOCK_SHIFTS[String(date.getDay())] ?? null })),
    [weekDays]
  );

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }, [weekDays]);

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
        <div className="schedule-week-label">{weekLabel}</div>

        <div className="schedule-list">
          {schedule.map(({ date, shift }) => {
            const dayIndex = date.getDay();
            const today_ = isToday(date);

            const barLeftPct = shift ? (shift.startHour / 24) * 100 : 0;
            const barRightPct = shift ? ((24 - shift.endHour) / 24) * 100 : 0;
            const barWidthPct = shift ? ((shift.endHour - shift.startHour) / 24) * 100 : 0;

            return (
              <div className="schedule-day-section" key={dayIndex}>
                <div className={`schedule-day-header${today_ ? ' schedule-day-header--today' : ''}`}>
                  {DAY_NAMES[dayIndex]}, {MONTH_NAMES[date.getMonth()]} {date.getDate()}
                  {shift && <span className="schedule-day-header-role">: {shift.role}</span>}
                </div>

                <div
                  className={[
                    'schedule-day-card',
                    today_ ? 'schedule-day-card--today' : '',
                    !shift ? 'schedule-day-card--off' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={shift ? () => history.push(`/schedule/${shift.id}`) : undefined}
                  style={shift ? { cursor: 'pointer' } : undefined}
                >
                  {shift && (
                    <div
                      className="schedule-shift-bar"
                      style={{ left: `${barLeftPct}%`, width: `${barWidthPct}%` }}
                      aria-hidden="true"
                    />
                  )}

                  {shift ? (
                    <>
                      <div className="schedule-duration-badge">{shiftDurationShort(shift)}</div>

                      <span
                        className="schedule-edge-time schedule-edge-time--start"
                        style={{ left: `${barLeftPct}%` }}
                      >
                        {formatHour(shift.startHour)}
                      </span>
                      <span
                        className="schedule-edge-time schedule-edge-time--end"
                        style={{ right: `${barRightPct}%` }}
                      >
                        {formatHour(shift.endHour)}
                      </span>
                    </>
                  ) : (
                    <div className="schedule-day-off-label">Day Off</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SchedulePage;
