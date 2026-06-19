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
  chatbubbleEllipsesOutline,
  chatbubbleOutline,
  checkmarkCircleOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import ShiftClockControls from '../components/ShiftClockControls';
import { useHistory, useParams } from 'react-router-dom';
import { useWorkforce } from '../context/WorkforceContext';
import { loadEmployees } from '../data/blobStorage';
import {
  getShiftDateForShiftId,
  getShiftStatus,
} from '../data/scheduleResolver';
import {
  DAY_NAMES,
  MONTH_NAMES,
  formatHour,
  shiftDuration,
} from '../data/scheduleData';
import type { DemoEmployee } from '../data/employees';
import './ShiftDetailPage.css';

type ChangeRequestMode = 'swap' | 'off';

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

const STATUS_LABELS = {
  upcoming: 'UPCOMING',
  'in-progress': 'IN PROGRESS',
  completed: 'COMPLETED',
} as const;

const ShiftDetailPage: React.FC = () => {
  const { shiftId } = useParams<{ shiftId: string }>();
  const history = useHistory();
  const [presentAlert] = useIonAlert();
  const {
    shifts,
    isLoading,
    anchorWeekStart,
    scheduleByDate,
    changeRequests,
    saveChangeRequest,
  } = useWorkforce();
  const [employees, setEmployees] = useState<DemoEmployee[]>([]);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeSearch, setChangeSearch] = useState('');
  const [changeMode, setChangeMode] = useState<ChangeRequestMode>('swap');
  const shift = shifts[shiftId];

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

  const shiftDate = useMemo(
    () => getShiftDateForShiftId(shiftId, anchorWeekStart, scheduleByDate),
    [shiftId, anchorWeekStart, scheduleByDate]
  );
  const status = useMemo(
    () => (shift ? getShiftStatus(shiftDate, shift.startHour, shift.endHour) : 'upcoming'),
    [shift, shiftDate]
  );
  const countdown = useMemo(
    () => (shift && status === 'upcoming' ? formatCountdown(shiftDate, shift.startHour) : null),
    [shift, shiftDate, status]
  );
  const dayOfWeek = shiftDate.getDay();
  const headerTitle = `${DAY_NAMES[dayOfWeek]}, ${MONTH_NAMES[shiftDate.getMonth()]} ${shiftDate.getDate()}`;

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

  const submitChangeRequest = (payload: { mode: ChangeRequestMode; targetName?: string }) => {
    void saveChangeRequest(shiftId, {
      mode: payload.mode,
      submittedAt: Date.now(),
      ...(payload.targetName ? { targetName: payload.targetName } : {}),
    });
  };

  const onChooseChangeEmployee = (employee: DemoEmployee) => {
    setIsChangeModalOpen(false);
    submitChangeRequest({ mode: 'swap', targetName: employee.name });
    presentAlert({
      header: 'Shift change request sent',
      message: `We sent a request to ${employee.name} for this ${shift?.role ?? 'shift'}.`,
      buttons: ['OK'],
    });
  };

  const onSubmitAskOff = () => {
    setIsChangeModalOpen(false);
    submitChangeRequest({ mode: 'off' });
    presentAlert({
      header: 'Time-off request sent',
      message: 'Your ask-off request has been submitted for this shift.',
      buttons: ['OK'],
    });
  };

  if (isLoading) {
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

          <ShiftClockControls shift={shift} shiftDate={shiftDate} />

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
