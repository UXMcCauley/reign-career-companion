import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonPage,
  useIonAlert,
} from '@ionic/react';
import {
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  helpCircleOutline,
  timeOutline,
} from 'ionicons/icons';
import type { ScrollDetail } from '@ionic/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import './DashboardPage.css';

const metrics = defaultLoggedInEmployee.dashboard.metrics;
const announcements = defaultLoggedInEmployee.dashboard.announcements;

function pickGreeting(): string {
  const h = new Date().getHours();
  const morning = ['Good morning', 'Rise and shine', 'Morning'];
  const afternoon = ['Good afternoon', 'Hey there', 'Afternoon'];
  const evening = ['Good evening', 'Evening', 'Hey'];
  const anytime = ['Welcome back', 'Great to see you', "Let's go"];
  const pool = [...(h < 12 ? morning : h < 17 ? afternoon : evening), ...anytime];
  return pool[Math.floor(Math.random() * pool.length)];
}

const DashboardPage: React.FC = () => {
  const history = useHistory();
  const [presentAlert] = useIonAlert();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { userName } = useAuth();
  const metricsRef = useRef<(HTMLElement | null)[]>([]);

  const onContentScroll = useCallback((e: CustomEvent<ScrollDetail>) => {
    const s = e.detail.scrollTop;
    metricsRef.current.forEach((el, i) => {
      if (!el) return;
      // i=6 → mastery bar; i=3-5 → bottom row; i=0-2 → top row (fades last)
      const start = i < 3 ? 35 : 0;
      const range = i === 6 ? 80 : 110;
      const p = Math.min(1, Math.max(0, (s - start) / range));

      if (p === 0) {
        el.style.opacity = '';
        el.style.filter = '';
        el.style.boxShadow = '';
        el.style.borderColor = '';
        return;
      }

      const L = (a: number, b: number) => (a + (b - a) * p).toFixed(3);
      el.style.opacity      = L(1, 0.25);
      el.style.filter       = `blur(${(p * 6).toFixed(2)}px)`;
      el.style.boxShadow    = `0 ${L(14, 2)}px ${L(38, 5)}px rgba(0,0,0,${L(0.28, 0.05)}),inset 0 1px 0 rgba(255,255,255,${L(0.14, 0.02)})`;
      el.style.borderColor  = `rgba(255,255,255,${L(0.15, 0.02)})`;
    });
  }, []);

  const firstName = userName
    ? userName.includes('@')
      ? userName.split('@')[0]
      : userName.split(' ')[0]
    : defaultLoggedInEmployee.firstName || 'there';

  const [greeting] = useState(pickGreeting);

  const openProfileMenu = () => {
    const menu = document.querySelector('ion-menu[menu-id="profile-drawer"]') as HTMLIonMenuElement | null;
    menu?.open();
  };

  const onAnnouncementTap = (announcementId: string) => {
    history.push(`/announcements/${announcementId}`);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const timeLabel = useMemo(
    () =>
      currentTime.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      }),
    [currentTime]
  );

  const dateLabel = useMemo(
    () =>
      currentTime.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [currentTime]
  );

  const onMetricHelpTap = (label: string, description: string) => {
    presentAlert({ header: `${label} metric`, message: description, buttons: ['Got it'] });
  };

  return (
    <IonPage className="dashboard-page">
      <IonContent fullscreen scrollEvents onIonScroll={onContentScroll}>
        <div className="dash-scene">

          {/* ── Hero: Greeting + Metrics Grid ── */}
          <div className="dash-hero">

            {/* Greeting row — single line, avatar centered with text */}
            <div className="dash-greeting-row">
              <span className="dash-greeting-text">
                {greeting}, <span className="dash-greeting-name">{firstName}</span>
              </span>
              <button
                className="dash-avatar-btn"
                onClick={openProfileMenu}
                aria-label="Open menu"
              >
                {firstName.charAt(0).toUpperCase()}
              </button>
            </div>

            <div className="dash-hero-glow" />
            <div className="metrics-grid">
              {metrics.map((metric, index) => (
                <IonCard
                  key={metric.label}
                  className="metric-card ios-surface"
                  ref={(el) => { metricsRef.current[index] = el as HTMLElement; }}
                >
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

            {/* Trade Mastery XP bar */}
            <div
              className="dash-mastery"
              ref={(el) => { metricsRef.current[6] = el as HTMLElement; }}
            >
              <div className="dash-mastery-header">
                <span className="dash-mastery-title">{defaultLoggedInEmployee.dashboard.mastery.title}</span>
                <span className="dash-mastery-level">{defaultLoggedInEmployee.dashboard.mastery.levelLabel}</span>
              </div>
              <div className="dash-mastery-track">
                <div
                  className="dash-mastery-fill"
                  style={{ width: `${defaultLoggedInEmployee.dashboard.mastery.fillPercent}%` }}
                />
              </div>
              <div className="dash-mastery-footer">
                <span className="dash-mastery-pts">{defaultLoggedInEmployee.dashboard.mastery.pointsLabel}</span>
                <span className="dash-mastery-remaining">{defaultLoggedInEmployee.dashboard.mastery.remainingLabel}</span>
              </div>
            </div>
          </div>

          {/* ── Panel: Clock In, Announcements, Chat Notifications ── */}
          <div className="dash-panel">
            <div className="dash-panel-handle" />

            {/* Clock In module */}
            <div className="dash-clock">
              <div className="dash-time">{timeLabel}</div>
              <div className="dash-date">{dateLabel}</div>
              <IonButton expand="block" color="success" className="dash-clock-btn">
                <IonIcon icon={checkmarkCircleOutline} slot="start" />
                Clock In
              </IonButton>
              <div className="clock-alert">
                <p className="clock-note">
                  {defaultLoggedInEmployee.dashboard.clockAlert}
                </p>
              </div>
            </div>

            {/* Announcements */}
            <div className="dash-section-header">
              <span className="dash-section-label">Announcements</span>
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
                </IonCard>
              ))}
            </div>

            {/* Chat Notifications */}
            <div className="dash-section-header">
              <span className="dash-section-label">New Messages</span>
            </div>
            <div className="dash-chat-notifs">
              <div className="dash-chat-empty">
                <IonIcon icon={chatbubbleEllipsesOutline} />
                <span>No new messages</span>
              </div>
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
