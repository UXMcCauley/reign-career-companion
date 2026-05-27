import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  useIonAlert,
  IonToolbar
} from '@ionic/react';
import { checkmarkCircleOutline, helpCircleOutline, timeOutline } from 'ionicons/icons';
import type { ScrollDetail } from '@ionic/core';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import logo from '../assets/reignos-logo.png';
import './DashboardPage.css';

const metrics = [
  {
    label: 'PPI',
    value: '1.0',
    total: '/5',
    description: 'Predictive Performance Indicator projects consistency and expected delivery quality.'
  },
  {
    label: 'OTS',
    value: '132',
    total: '/365',
    description: 'On-time Streak tracks how many shifts you started on schedule in the rolling year.'
  },
  {
    label: 'Daily',
    value: '0.0',
    total: '/10',
    description: 'Daily score summarizes your current shift performance using attendance and outcomes.'
  },
  {
    label: 'Team',
    value: '8.7',
    total: '/10',
    description: 'Team score reflects overall performance quality across your assigned work group.'
  },
  {
    label: 'Success',
    value: '87.9%',
    description: 'Success estimates your likelihood of completing key goals based on trend signals.'
  },
  {
    label: 'Productivity',
    value: '93.3%',
    description: 'Productivity measures output efficiency relative to expected effort and pace.'
  }
];

const announcements = [
  {
    id: 'cricket-game',
    title: 'Cricket Game after work',
    time: '6:00 PM',
    image:
      'https://images.unsplash.com/photo-1593766788306-28561086694e?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'team-townhall',
    title: 'Team Townhall Broadcast',
    time: '9:30 AM',
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'coaching-clinic',
    title: 'AI Coaching Clinic',
    time: '2:15 PM',
    image:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'shift-swaps',
    title: 'Shift Swap Window Open',
    time: '4:45 PM',
    image:
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80'
  }
];

const DashboardPage: React.FC = () => {
  const history = useHistory();
  const [presentAlert] = useIonAlert();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);

  const onAnnouncementTap = (announcementId: string) => {
    history.push(`/announcements/${announcementId}`);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const timeZoneLabel = useMemo(() => {
    const timezonePart = Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(currentTime)
      .find((part) => part.type === 'timeZoneName');
    return timezonePart?.value ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [currentTime]);

  const timeLabel = useMemo(
    () =>
      currentTime.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
      }),
    [currentTime]
  );

  const onMetricHelpTap = (label: string, description: string) => {
    presentAlert({
      header: `${label} metric`,
      message: description,
      buttons: ['Got it']
    });
  };

  const onContentScroll = (event: CustomEvent<ScrollDetail>) => {
    setIsHeaderCompact(event.detail.scrollTop > 36);
  };

  return (
    <IonPage>
      <IonHeader translucent className={isHeaderCompact ? 'dashboard-header dashboard-header--compact' : 'dashboard-header'}>
        <IonToolbar className="dashboard-toolbar">
          <img alt="ReignOS" src={logo} className="dashboard-logo" />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen scrollEvents onIonScroll={onContentScroll}>
        <div className="dashboard-content">
          <div className="dashboard-section">
            <IonCard className="clock-card ios-surface">
              <IonCardHeader>
                <IonCardTitle>{timeLabel}</IonCardTitle>
                <IonCardSubtitle>{timeZoneLabel}</IonCardSubtitle>
              </IonCardHeader>
              <IonCardContent>
                <IonButton expand="block" color="success">
                  <IonIcon icon={checkmarkCircleOutline} slot="start" />
                  Clock In
                </IonButton>
                <IonText color="medium">
                  <p className="clock-note">
                    You have not been added to a team yet. Please contact your employer.
                  </p>
                </IonText>
              </IonCardContent>
            </IonCard>
          </div>

          <div className="dashboard-section">
            <div className="metrics-grid">
              {metrics.map((metric) => (
                <IonCard key={metric.label} className="metric-card ios-surface">
                  <IonCardHeader>
                    <div className="metric-header-row">
                      <IonCardSubtitle>{metric.label}</IonCardSubtitle>
                      <IonButton
                        aria-label={`More about ${metric.label}`}
                        className="metric-help-button"
                        fill="clear"
                        size="small"
                        onClick={() => onMetricHelpTap(metric.label, metric.description)}
                      >
                        <IonIcon icon={helpCircleOutline} />
                      </IonButton>
                    </div>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className="metric-reading">
                      <span className="metric-value">{metric.value}</span>
                      {metric.total ? <span className="metric-total">{metric.total}</span> : null}
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          </div>

          <div className="announcement-rail">
            {announcements.map((announcement) => (
              <IonCard
                key={announcement.id}
                button
                className="announcement-card ios-surface"
                onClick={() => onAnnouncementTap(announcement.id)}
              >
                <img alt={announcement.title} src={announcement.image} />
                <IonCardHeader>
                  <IonCardTitle>{announcement.title}</IonCardTitle>
                  <IonCardSubtitle>
                    <IonIcon icon={timeOutline} /> {announcement.time}
                  </IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent>Tap to open details</IonCardContent>
              </IonCard>
            ))}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
