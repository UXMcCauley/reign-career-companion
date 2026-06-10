import {
  IonBadge,
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
  albumsOutline,
  cafeOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  locateOutline,
  navigateOutline,
  timeOutline,
} from 'ionicons/icons';
import type { ScrollDetail } from '@ionic/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import type { Feature, Polygon } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '../context/AuthContext';
import { loadShifts } from '../data/blobStorage';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import { formatHour, type Shift } from '../data/scheduleData';
import { demoEmployeeTalentCards } from '../data/talentCards';
import './DashboardPage.css';

const metrics = defaultLoggedInEmployee.dashboard.metrics;
const announcements = defaultLoggedInEmployee.dashboard.announcements;
const activeContests = [
  {
    id: 'contest-peak-service',
    title: 'Peak Service Sprint',
    subtitle: '7-day challenge',
    details: 'Complete 5 shift check-ins on time and keep guest feedback above 4.7.',
    cta: 'Join Sprint',
  },
  {
    id: 'contest-gamecation-ops',
    title: 'Ops Gamecation League',
    subtitle: 'Team game vacation',
    details: 'Pair with 2 teammates, clear weekly ops quests, and unlock leaderboard badges.',
    cta: 'Enter League',
  },
  {
    id: 'contest-upsell-arcade',
    title: 'Upsell Arcade',
    subtitle: 'Sales mini-season',
    details: 'Hit 12 premium add-ons this week to earn bonus points and profile flair.',
    cta: 'Play Now',
  },
  {
    id: 'contest-rescue-run',
    title: 'Shift Rescue Run',
    subtitle: 'Flex challenge',
    details: 'Pick up one optional shift and finish all close-out tasks for extra XP.',
    cta: 'Accept Mission',
  },
];

const FEET_PER_METER = 3.28084;
const GEOFENCE_RADIUS_FEET = 100;
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const configuredJobSite = (() => {
  const lat = Number(import.meta.env.VITE_JOB_SITE_LAT);
  const lng = Number(import.meta.env.VITE_JOB_SITE_LNG);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      name: (import.meta.env.VITE_JOB_SITE_NAME as string | undefined) ?? 'Configured Job Site',
      latitude: lat,
      longitude: lng,
    };
  }
  return {
    name: 'Downtown Job Site',
    latitude: 43.052639,
    longitude: -87.896407,
  };
})();

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceInFeet(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = earthRadiusMeters * c;
  return distanceMeters * FEET_PER_METER;
}

function buildGeofencePolygon(
  center: { latitude: number; longitude: number },
  radiusFeet: number,
  points = 72
): Feature<Polygon> {
  const radiusMeters = radiusFeet / FEET_PER_METER;
  const earthRadiusMeters = 6371000;
  const centerLatRad = toRadians(center.latitude);
  const centerLngRad = toRadians(center.longitude);
  const angularDistance = radiusMeters / earthRadiusMeters;
  const coordinates: [number, number][] = [];

  for (let i = 0; i <= points; i += 1) {
    const bearing = (2 * Math.PI * i) / points;
    const sinLat = Math.sin(centerLatRad) * Math.cos(angularDistance) +
      Math.cos(centerLatRad) * Math.sin(angularDistance) * Math.cos(bearing);
    const lat = Math.asin(sinLat);
    const y = Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLatRad);
    const x = Math.cos(angularDistance) - Math.sin(centerLatRad) * Math.sin(lat);
    const lng = centerLngRad + Math.atan2(y, x);
    coordinates.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

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
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [activeKeyCardId, setActiveKeyCardId] = useState<string | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartedAt, setBreakStartedAt] = useState<number | null>(null);
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0);
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [shiftMap, setShiftMap] = useState<Record<string, Shift>>({});
  const { userName } = useAuth();
  const metricsRef = useRef<(HTMLElement | null)[]>([]);
  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasFitBoundsRef = useRef(false);

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
        return;
      }

      const L = (a: number, b: number) => (a + (b - a) * p).toFixed(3);
      el.style.opacity      = L(1, 0.25);
      el.style.filter       = `blur(${(p * 6).toFixed(2)}px)`;
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
          handler: (data: { keycard?: string }) => {
            const selected = data?.keycard ?? demoEmployeeTalentCards[0]?.id;
            if (selected) onPick(selected);
          },
        },
      ],
    });
  };

  const handleSelectKeyCard = () => {
    chooseKeyCard('Select key card', (selectedId) => {
      setActiveKeyCardId(selectedId);
    });
  };

  const handleClockIn = () => {
    setIsClockedIn(true);
    setOnBreak(false);
    setBreakStartedAt(null);
    setBreakElapsedSeconds(0);
  };

  const handleSwitchKeyCard = () => {
    chooseKeyCard('Switch key card', (selectedId) => {
      setActiveKeyCardId(selectedId);
    });
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
    setOnBreak(false);
    setBreakStartedAt(null);
    setBreakElapsedSeconds(0);
    setActiveKeyCardId(null);
  };

  const handleBreakToggle = () => {
    if (!isClockedIn) return;
    setOnBreak(current => {
      if (current) {
        setBreakStartedAt(null);
        setBreakElapsedSeconds(0);
        return false;
      }
      setBreakStartedAt(Date.now());
      return true;
    });
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadShifts();
      if (active) setShiftMap(loaded);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 15000,
      }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (!mapboxToken || !mapCanvasRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapCanvasRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [configuredJobSite.longitude, configuredJobSite.latitude],
      zoom: 15.3,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      map.addSource('geofence', {
        type: 'geojson',
        data: buildGeofencePolygon(configuredJobSite, GEOFENCE_RADIUS_FEET),
      });
      map.addLayer({
        id: 'geofence-fill',
        type: 'fill',
        source: 'geofence',
        paint: {
          'fill-color': '#ff4f8d',
          'fill-opacity': 0.14,
        },
      });
      map.addLayer({
        id: 'geofence-outline',
        type: 'line',
        source: 'geofence',
        paint: {
          'line-color': '#ff4f8d',
          'line-width': 2,
          'line-opacity': 0.58,
        },
      });
      map.addSource('geofence-center', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Point',
                coordinates: [configuredJobSite.longitude, configuredJobSite.latitude],
              },
            },
          ],
        },
      });
      map.addLayer({
        id: 'geofence-center-dot',
        type: 'circle',
        source: 'geofence-center',
        paint: {
          'circle-color': '#ff4f8d',
          'circle-radius': 7,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      });
    });

    const markerEl = document.createElement('div');
    markerEl.className = 'clock-user-dot';
    userMarkerRef.current = new mapboxgl.Marker({
      element: markerEl,
      anchor: 'center',
    }).setLngLat([configuredJobSite.longitude, configuredJobSite.latitude]).addTo(map);

    mapRef.current = map;

    return () => {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!userPosition || !mapRef.current || !userMarkerRef.current) return;
    const map = mapRef.current;
    const userLngLat: [number, number] = [userPosition.longitude, userPosition.latitude];
    userMarkerRef.current.setLngLat(userLngLat);
    if (!hasFitBoundsRef.current) {
      const bounds = new mapboxgl.LngLatBounds(
        [configuredJobSite.longitude, configuredJobSite.latitude],
        [configuredJobSite.longitude, configuredJobSite.latitude]
      );
      bounds.extend(userLngLat);
      map.fitBounds(bounds, {
        padding: { top: 55, right: 55, bottom: 95, left: 55 },
        duration: 700,
        maxZoom: 16.8,
      });
      hasFitBoundsRef.current = true;
    }
  }, [userPosition]);

  useEffect(() => {
    if (!onBreak || !breakStartedAt) return;
    const timer = window.setInterval(() => {
      setBreakElapsedSeconds(Math.floor((Date.now() - breakStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onBreak, breakStartedAt]);

  const timeLabel = useMemo(
    () =>
      currentTime.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      }),
    [currentTime]
  );

  const upcomingShifts = useMemo(() => {
    const orderedShifts = Object.values(shiftMap)
      .sort((a, b) => Number(a.id) - Number(b.id));
    if (orderedShifts.length === 0) return [];
    const now = new Date();
    const shiftCards = [];
    for (let i = 0; i < Math.min(6, orderedShifts.length); i += 1) {
      const shiftDate = new Date(now);
      shiftDate.setDate(now.getDate() + i);
      const label = shiftDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const shift = orderedShifts[i];
      shiftCards.push({
        id: `shift-${i}`,
        title: i === 0 ? 'Today Shift' : `${label} Shift`,
        time: `${formatHour(shift.startHour)} - ${formatHour(shift.endHour)}`,
      });
    }
    return shiftCards;
  }, [currentTime, shiftMap]);

  const activeKeyCardName = useMemo(
    () => demoEmployeeTalentCards.find(card => card.id === activeKeyCardId)?.name ?? 'No key card selected',
    [activeKeyCardId]
  );

  const distanceToJobSiteFeet = useMemo(
    () =>
      userPosition
        ? distanceInFeet(userPosition, {
            latitude: configuredJobSite.latitude,
            longitude: configuredJobSite.longitude,
          })
        : null,
    [userPosition]
  );

  const isWithinGeofence = distanceToJobSiteFeet !== null && distanceToJobSiteFeet <= GEOFENCE_RADIUS_FEET;
  const canClockIn = Boolean(activeKeyCardId) && isWithinGeofence && !isClockedIn;
  const canUseMainButton = isClockedIn || canClockIn;
  const breakTimerLabel = onBreak ? formatDuration(breakElapsedSeconds) : null;
  const keyCardActionLabel = isClockedIn ? 'Switch Key Card' : 'Select Key Card';
  const rightActionLabel = isClockedIn ? (onBreak ? 'End Break' : 'Start Break') : 'Shift Details';

  const handleMainClockButton = () => {
    if (isClockedIn) {
      handleClockOut();
      return;
    }
    if (canClockIn) handleClockIn();
  };

  const handleRightAction = () => {
    if (isClockedIn) {
      handleBreakToggle();
      return;
    }
    history.push('/schedule');
  };

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
                  className="metric-card"
                  ref={(el) => { metricsRef.current[index] = el as HTMLElement; }}
                >
                  <IonCardHeader>
                    <div className="metric-header-row">
                      <IonCardSubtitle>{metric.label}</IonCardSubtitle>
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
            <div className="dash-clock dash-clock-card ios-surface">
              <div className="clock-map-shell">
                {mapboxToken ? (
                  <div ref={mapCanvasRef} className="clock-map-canvas" aria-label="Interactive geofence map" />
                ) : (
                  <div className="clock-map-fallback" />
                )}
              
              </div>

              <div className="clock-bowl">
                <button
                  type="button"
                  className={`clock-main-btn${canClockIn ? ' is-ready' : ''}${isClockedIn ? ' is-clockout' : ''}`}
                  onClick={handleMainClockButton}
                  disabled={!canUseMainButton}
                  aria-disabled={!canUseMainButton}
                >
                  <IonIcon icon={checkmarkCircleOutline} />
                  <span>{isClockedIn ? 'Clock Out' : 'Clock In'}</span>
                </button>

                <div className="clock-bowl-actions">
                  <button
                    type="button"
                    className="clock-bowl-action"
                    onClick={isClockedIn ? handleSwitchKeyCard : handleSelectKeyCard}
                  >
                    <IonIcon icon={albumsOutline} />
                    <span>{keyCardActionLabel}</span>
                  </button>
                  <button type="button" className="clock-bowl-action" onClick={handleRightAction}>
                    <IonIcon icon={isClockedIn ? cafeOutline : timeOutline} />
                    <span>{rightActionLabel}</span>
                    {breakTimerLabel ? <IonBadge color="light">{breakTimerLabel}</IonBadge> : null}
                  </button>
                </div>
              </div>

              <div className="clock-readiness-list">
                <div className={`clock-readiness-item${activeKeyCardId ? ' is-ready' : ''}`}>
                  <IonIcon icon={albumsOutline} />
                  <span>Key card selected</span>
                  <strong>{activeKeyCardId ? activeKeyCardName : 'Required'}</strong>
                </div>
                <div className={`clock-readiness-item${isWithinGeofence ? ' is-ready' : ''}`}>
                  <IonIcon icon={locateOutline} />
                  <span>Within 100ft geofence</span>
                  <strong>{isWithinGeofence ? 'Ready' : 'Required'}</strong>
                </div>
              </div>

              <div className={`clock-alert ${isClockedIn ? 'clock-alert--info' : 'clock-alert--warning'}`}>
                {isClockedIn ? (
                  <p className="clock-note">
                    <span className="clock-note-label">Current Keycard</span>
                    <span className="clock-note-value">{activeKeyCardName}</span>
                    {onBreak ? <span className="clock-note-meta">On break for {formatDuration(breakElapsedSeconds)}</span> : null}
                  </p>
                ) : (
                  <p className="clock-note">{defaultLoggedInEmployee.dashboard.clockAlert}</p>
                )}
              </div>
              <div className="clock-meta-row">
                <span>{dateLabel}</span>
                <span>{timeLabel}</span>
              </div>
            </div>

            {/* Shift cards */}
            <div className="dash-section-header">
              <span className="dash-section-label dash-section-label--shifts">Shifts This Week</span>
            </div>
            <div className="shift-rail">
              {upcomingShifts.map((shift) => (
                <IonCard key={shift.id} className="shift-card ios-surface">
                  <IonCardHeader>
                    <IonCardTitle>{shift.title}</IonCardTitle>
                    <IonCardSubtitle>
                      <IonIcon icon={timeOutline} /> {shift.time}
                    </IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
              ))}
              <button className="shift-view-all">
                <IonIcon icon={chevronForwardOutline} />
                <span>View all</span>
              </button>
            </div>

            <div className="dash-section-header">
              <span className="dash-section-label dash-section-label--contests">Contests &amp; Gamecations</span>
            </div>
            <div className="contest-rail">
              {activeContests.map(contest => (
                <IonCard key={contest.id} className="contest-card ios-surface">
                  <IonCardHeader>
                    <IonCardSubtitle>{contest.subtitle}</IonCardSubtitle>
                    <IonCardTitle>{contest.title}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>{contest.details}</p>
                    <button className="contest-enter-btn" type="button">
                      {contest.cta}
                    </button>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>

            {/* Announcements */}
            <div className="dash-section-header">
              <span className="dash-section-label dash-section-label--announcements">What's Happening</span>
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

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
