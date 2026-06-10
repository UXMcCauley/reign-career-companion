import {
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
  chevronForwardOutline,
  closeOutline,
  expandOutline,
  locateOutline,
  navigateOutline,
  timeOutline,
} from 'ionicons/icons';
import type { ScrollDetail } from '@ionic/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadShifts } from '../data/blobStorage';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import { formatHour, type Shift } from '../data/scheduleData';
import { demoEmployeeTalentCards } from '../data/talentCards';
import { MapContainer, TileLayer, Circle, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Geolocation } from '@capacitor/geolocation';
import './DashboardPage.css';
import { Capacitor } from '@capacitor/core';
import { ShiftCountdownIsland } from '../components/ShiftCountdownIsland';

const MASTERY_DEMO = [
  { level: 4, fillPercent: 34 },
  { level: 3, fillPercent: 67 },
  { level: 5, fillPercent: 22 },
  { level: 2, fillPercent: 81 },
  { level: 4, fillPercent: 45 },
];

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
const HOURLY_RATE = defaultLoggedInEmployee.resume.stats.hourlyRate;

type WeatherData = { tempF: number; condition: string; windMph: number };

const WMO_CONDITIONS: Record<number, string> = {
  0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy Fog',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm',
};

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
  return earthRadiusMeters * c * FEET_PER_METER;
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

/* Bridges the map instance to an external ref, tracks tile loading, and controls the view. */
const MapController: React.FC<{
  mapRef: { current: L.Map | null };
  userPosition: { latitude: number; longitude: number } | null;
  onTilesLoaded: () => void;
}> = ({ mapRef, userPosition, onTilesLoaded }) => {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    return () => { mapRef.current = null; };
  }, [map, mapRef]);

  useEffect(() => {
    let pending = 0;
    let fired = false;
    const onStart = () => { pending++; };
    const onDone = () => {
      pending = Math.max(0, pending - 1);
      if (pending === 0 && !fired) { fired = true; onTilesLoaded(); }
    };
    map.on('tileloadstart', onStart);
    map.on('tileload', onDone);
    map.on('tileerror', onDone);
    return () => {
      map.off('tileloadstart', onStart);
      map.off('tileload', onDone);
      map.off('tileerror', onDone);
    };
  }, [map, onTilesLoaded]);

  useEffect(() => {
    if (userPosition) {
      const bounds = L.latLngBounds(
        [configuredJobSite.latitude, configuredJobSite.longitude],
        [userPosition.latitude, userPosition.longitude]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }, [map, userPosition]);

  useEffect(() => {
    const persistView = () => {
      const center = map.getCenter();
      localStorage.setItem('reign_map_view', JSON.stringify({
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
      }));
    };

    map.on('moveend', persistView);
    map.on('zoomend', persistView);
    return () => {
      map.off('moveend', persistView);
      map.off('zoomend', persistView);
    };
  }, [map]);

  return null;
};

/* One-shot fit controller for the expanded map — fits bounds once then stays out of the way. */
const ExpandedMapController: React.FC<{
  mapRef: { current: L.Map | null };
  userPosition: { latitude: number; longitude: number } | null;
}> = ({ mapRef, userPosition }) => {
  const map = useMap();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (!userPosition || hasFitted.current) return;
    hasFitted.current = true;
    // ...fitBounds + save
  }, [map, userPosition]);

  useEffect(() => {
    mapRef.current = map;
    return () => { mapRef.current = null; };
  }, [map, mapRef]);

  useEffect(() => {
    if (hasFitted.current || !userPosition) return;
    const bounds = L.latLngBounds(
      [configuredJobSite.latitude, configuredJobSite.longitude],
      [userPosition.latitude, userPosition.longitude]
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    hasFitted.current = true;
  }, [map, userPosition]);


  return null;
};

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
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [clockInTimestamp, setClockInTimestamp] = useState<number | null>(null);
  const [workElapsedSeconds, setWorkElapsedSeconds] = useState(0);
  const { userName } = useAuth();
  const metricsRef = useRef<(HTMLElement | null)[]>([]);
  const totalBreakSecondsRef = useRef(0);
  const mapShellRef = useRef<HTMLDivElement | null>(null);
  const clockBtnRef = useRef<HTMLButtonElement | null>(null);
  const clockBtnIsPinned = useRef(false);
  const clockBtnNaturalPageY = useRef<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapTilesLoaded, setMapTilesLoaded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const expandedMapRef = useRef<L.Map | null>(null);
  const masteryRailRef = useRef<HTMLDivElement | null>(null);
  const [masteryAnim, setMasteryAnim] = useState({
    currentLevel: MASTERY_DEMO[0].level,
    prevLevel: MASTERY_DEMO[0].level,
    animKey: 0,
    dir: 'right' as 'left' | 'right',
  });
  const prevMasteryIndexRef = useRef(0);

  const handleMapTilesLoaded = useCallback(() => setMapTilesLoaded(true), []);
  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleLocate = useCallback(() => {
    if (userPosition && mapRef.current) {
      mapRef.current.flyTo([userPosition.latitude, userPosition.longitude], 17, { duration: 0.7 });
    }
  }, [userPosition]);

  const onContentScroll = useCallback((e: CustomEvent<ScrollDetail>) => {
    const s = e.detail.scrollTop;

    // Metrics fade-out as the hero scrolls up
    metricsRef.current.forEach((el, i) => {
      if (!el) return;
      const start = i < 3 ? 35 : 0;
      const range = i === 6 ? 80 : 110;
      const p = Math.min(1, Math.max(0, (s - start) / range));
      if (p === 0) {
        el.style.opacity = '';
        el.style.filter = '';
        return;
      }
      const L2 = (a: number, b: number) => (a + (b - a) * p).toFixed(3);
      el.style.opacity = L2(1, 0.25);
    });

    // Map: complete fade-out as it scrolls off the top
    if (mapShellRef.current) {
      const mapRect = mapShellRef.current.getBoundingClientRect();
      const scrolledOff = Math.max(0, -mapRect.top);
      const fadeStart = mapRect.height * 0.3;
      const fadeEnd = mapRect.height * 0.62;
      const mapOpacity = scrolledOff <= fadeStart
        ? 1
        : Math.max(0, 1 - (scrolledOff - fadeStart) / (fadeEnd - fadeStart));
      mapShellRef.current.style.opacity = mapOpacity === 1 ? '' : mapOpacity.toFixed(3);
    }

    // Clock button: scale to 50% and pin near top as content scrolls up
    if (clockBtnRef.current) {
      const btn = clockBtnRef.current;
      // PIN_Y = center of button when pinned: 20px top margin + half of 50%-scaled button (110 * 0.5 / 2 = 27.5)
      const PIN_Y = 47.5;
      const SCALE_RANGE = 90; // px over which scaling occurs before/after pin

      if (!clockBtnIsPinned.current) {
        const btnRect = btn.getBoundingClientRect();
        const centerY = btnRect.top + btnRect.height / 2;

        if (centerY <= PIN_Y) {
          // Snap to pinned — store natural page-Y so we can compute it when scrolling back
          clockBtnIsPinned.current = true;
          clockBtnNaturalPageY.current = PIN_Y + s;
          btn.style.position = 'fixed';
          btn.style.top = `${PIN_Y}px`;
          btn.style.left = '50%';
          btn.style.transform = 'translate(-50%, -50%) scale(0.5)';
          btn.style.zIndex = '9999';
        } else {
          const distToPin = centerY - PIN_Y;
          if (distToPin < SCALE_RANGE) {
            const progress = 1 - distToPin / SCALE_RANGE;
            btn.style.transform = `translate(-50%, -50%) scale(${(1 - progress * 0.5).toFixed(3)})`;
          } else if (btn.style.transform) {
            btn.style.transform = '';
          }
        }
      } else {
        // Pinned — check natural viewport Y to decide when to unpin
        const naturalCenterY = (clockBtnNaturalPageY.current ?? 0) - s;

        if (naturalCenterY >= PIN_Y + SCALE_RANGE) {
          // Fully back — reset all inline overrides
          clockBtnIsPinned.current = false;
          btn.style.position = '';
          btn.style.top = '';
          btn.style.left = '';
          btn.style.transform = '';
          btn.style.zIndex = '';
        } else if (naturalCenterY > PIN_Y) {
          // Transitioning back — unpin and apply progressive scale
          clockBtnIsPinned.current = false;
          btn.style.position = '';
          btn.style.top = '';
          btn.style.left = '';
          btn.style.zIndex = '';
          const progress = 1 - (naturalCenterY - PIN_Y) / SCALE_RANGE;
          btn.style.transform = `translate(-50%, -50%) scale(${(1 - progress * 0.5).toFixed(3)})`;
        }
        // else: still fully pinned, no change needed
      }
    }
  }, []);

  const firstName = userName
    ? userName.includes('@') ? userName.split('@')[0] : userName.split(' ')[0]
    : defaultLoggedInEmployee.firstName || 'there';

  const [greeting] = useState(pickGreeting);

  const openProfileMenu = () => {
    const menu = document.querySelector('ion-menu[menu-id="profile-drawer"]') as HTMLIonMenuElement | null;
    menu?.open();
  };

  const onAnnouncementTap = (id: string) => history.push(`/announcements/${id}`);

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

  const handleSelectKeyCard = () => chooseKeyCard('Select keycard', setActiveKeyCardId);
  const handleSwitchKeyCard = () => chooseKeyCard('Switch keycard', setActiveKeyCardId);

  const handleClockIn = () => {
    totalBreakSecondsRef.current = 0;
    setWorkElapsedSeconds(0);
    setClockInTimestamp(Date.now());
    setIsClockedIn(true);
    setOnBreak(false);
    setBreakStartedAt(null);
    setBreakElapsedSeconds(0);
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
    setOnBreak(false);
    setBreakStartedAt(null);
    setBreakElapsedSeconds(0);
    setActiveKeyCardId(null);
    setClockInTimestamp(null);
    setWorkElapsedSeconds(0);
    totalBreakSecondsRef.current = 0;
  };

  const handleBreakToggle = () => {
    if (!isClockedIn) return;
    setOnBreak(current => {
      if (current) {
        totalBreakSecondsRef.current += breakElapsedSeconds;
        setBreakStartedAt(null);
        setBreakElapsedSeconds(0);
        return false;
      }
      setBreakStartedAt(Date.now());
      return true;
    });
  };

  /* Clock tick — every 30s for the header time display */
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  /* Load shifts */
  useEffect(() => {
    let active = true;
    loadShifts().then(loaded => { if (active) setShiftMap(loaded); });
    return () => { active = false; };
  }, []);

  /* GPS watch */
  useEffect(() => {
    let watchId: string | null = null;
    let cancelled = false;

    const startGeolocation = async () => {
      // why this matters: requestPermissions throws "Not implemented" on web —
      // browsers prompt on the first real position request instead
      // if (Capacitor.isNativePlatform()) {
      //   const status = await Geolocation.requestPermissions().catch(() => null);
      //   if (!status || (status.location !== 'granted' && status.coarseLocation !== 'granted')) return;
      // }
  
      // fast cached fix (~50ms) while the fresh GPS lock spins up
      Geolocation.getCurrentPosition({ maximumAge: 300000, enableHighAccuracy: false })
        .then(pos => {
          if (!cancelled) setUserPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        })
        .catch(() => undefined);
  
      watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 },
        pos => {
          if (!pos || cancelled) return;
          const { latitude, longitude } = pos.coords;
          if (!isNaN(latitude) && !isNaN(longitude)) setUserPosition({ latitude, longitude });
        }
      );
    };
  
    void startGeolocation();
  
    return () => {
      cancelled = true;
      if (watchId !== null) Geolocation.clearWatch({ id: watchId });
    };
  }, []);
  /* Break timer */
  useEffect(() => {
    if (!onBreak || !breakStartedAt) return;
    const id = window.setInterval(() => {
      setBreakElapsedSeconds(Math.floor((Date.now() - breakStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [onBreak, breakStartedAt]);

  /* Work timer — pauses automatically while on break */
  useEffect(() => {
    if (!isClockedIn || onBreak || !clockInTimestamp) return;
    const id = window.setInterval(() => {
      const total = Math.floor((Date.now() - clockInTimestamp) / 1000);
      setWorkElapsedSeconds(Math.max(0, total - totalBreakSecondsRef.current));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isClockedIn, onBreak, clockInTimestamp]);

  /* Open-Meteo — free weather API, no key required */
  useEffect(() => {
    const { latitude, longitude } = configuredJobSite;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1`
    )
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: { current: { temperature_2m: number; weather_code: number; wind_speed_10m: number } }) => {
        setWeatherData({
          tempF: Math.round(d.current.temperature_2m),
          condition: WMO_CONDITIONS[d.current.weather_code] ?? 'Unknown',
          windMph: Math.round(d.current.wind_speed_10m),
        });
      })
      .catch(() => undefined);
  }, []);

  /* Mastery rail scroll → active index + swipe direction */
  useEffect(() => {
    const rail = masteryRailRef.current;
    if (!rail) return;
    const handleScroll = () => {
      const cardEl = rail.children[0] as HTMLElement | undefined;
      if (!cardEl) return;
      const cardWidth = cardEl.offsetWidth + 10;
      const newIndex = Math.min(
        Math.round(rail.scrollLeft / cardWidth),
        demoEmployeeTalentCards.length - 1
      );
      if (newIndex !== prevMasteryIndexRef.current) {
        const dir = newIndex > prevMasteryIndexRef.current ? 'right' : 'left';
        setMasteryAnim(prev => ({
          currentLevel: MASTERY_DEMO[newIndex]?.level ?? 4,
          prevLevel: prev.currentLevel,
          animKey: prev.animKey + 1,
          dir,
        }));
        prevMasteryIndexRef.current = newIndex;
      }
    };
    rail.addEventListener('scroll', handleScroll, { passive: true });
    return () => rail.removeEventListener('scroll', handleScroll);
  }, []);

  const timeLabel = useMemo(
    () => currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    [currentTime]
  );

  const dateLabel = useMemo(
    () => currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    [currentTime]
  );

  const upcomingShifts = useMemo(() => {
    const ordered = Object.values(shiftMap).sort((a, b) => Number(a.id) - Number(b.id));
    if (!ordered.length) return [];
    const now = new Date();
    return Array.from({ length: Math.min(6, ordered.length) }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const shift = ordered[i];
      return {
        id: `shift-${i}`,
        shiftId: shift.id,
        title: i === 0 ? 'Today Shift' : `${label} Shift`,
        time: `${formatHour(shift.startHour)} - ${formatHour(shift.endHour)}`,
      };
    });
  }, [currentTime, shiftMap]);

  const activeKeyCardName = useMemo(
    () => demoEmployeeTalentCards.find(c => c.id === activeKeyCardId)?.name ?? null,
    [activeKeyCardId]
  );

  const distanceToJobSiteFeet = useMemo(
    () => userPosition ? distanceInFeet(userPosition, { latitude: configuredJobSite.latitude, longitude: configuredJobSite.longitude }) : null,
    [userPosition]
  );

  /* Gross earnings since clock-in, break time excluded */
  const earnedAmount = useMemo(() => (workElapsedSeconds / 3600) * HOURLY_RATE, [workElapsedSeconds]);

  const isWithinGeofence =
    import.meta.env.VITE_BYPASS_GEOFENCE === 'true' ||
    (distanceToJobSiteFeet !== null && distanceToJobSiteFeet <= GEOFENCE_RADIUS_FEET);
  const canClockIn = Boolean(activeKeyCardId) && isWithinGeofence && !isClockedIn;
  const canUseMainButton = isClockedIn || canClockIn;
  const keyCardActionLabel = isClockedIn ? 'Switch Keycard' : 'Select Keycard';
  const rightActionLabel = isClockedIn ? (onBreak ? 'End Break' : 'Start Break') : 'Shift Details';

  const savedView = (() => {
    try { return JSON.parse(localStorage.getItem('reign_map_view') ?? 'null'); }
    catch { return null; }
  })();

  const handleMainClockButton = () => {
    if (isClockedIn) { handleClockOut(); return; }
    if (canClockIn) handleClockIn();
  };

  const handleRightAction = () => {
    if (isClockedIn) { handleBreakToggle(); return; }
    history.push('/schedule');
  };

  return (
    <IonPage className="dashboard-page">
      <IonContent fullscreen scrollEvents onIonScroll={onContentScroll}>
        <div className="dash-scene">

          {/* ── Hero: Greeting + Metrics ── */}
          <div className="dash-hero">
            <div className="dash-greeting-row">
              <span className="dash-greeting-text">
                {greeting}, <span className="dash-greeting-name">{firstName}</span>
              </span>
              <button className="dash-avatar-btn" onClick={openProfileMenu} aria-label="Open menu">
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

            <div className="dash-mastery-section-label">
              <span className="dash-mastery-section-title">Trade Mastery</span>
              <div className="dash-mastery-level-container">
                {masteryAnim.animKey > 0 && (
                  <span
                    key={`exit-${masteryAnim.animKey}`}
                    className={`dash-mastery-level-inline dash-mastery-level-inline--exit-${masteryAnim.dir === 'right' ? 'left' : 'right'}`}
                  >
                    Level {masteryAnim.prevLevel}
                  </span>
                )}
                <span
                  key={`enter-${masteryAnim.animKey}`}
                  className={masteryAnim.animKey > 0 ? `dash-mastery-level-inline dash-mastery-level-inline--enter-${masteryAnim.dir}` : 'dash-mastery-level-inline'}
                >
                  Level {masteryAnim.currentLevel}
                </span>
              </div>
            </div>
            <div
              className="dash-mastery-rail"
              ref={(el) => {
                metricsRef.current[6] = el as HTMLElement;
                masteryRailRef.current = el;
              }}
            >
              {demoEmployeeTalentCards.map((card, i) => (
                <div key={card.id} className="dash-mastery dash-mastery--card">
                  <div className="dash-mastery-header">
                    <span className="dash-mastery-title">{card.name}</span>
                  </div>
                  <div className="dash-mastery-track">
                    <div className="dash-mastery-fill" style={{ width: `${MASTERY_DEMO[i]?.fillPercent ?? 34}%` }} />
                  </div>
                  <div className="dash-mastery-footer">
                    <span className="dash-mastery-pts">{defaultLoggedInEmployee.dashboard.mastery.pointsLabel}</span>
                    <span className="dash-mastery-remaining">{defaultLoggedInEmployee.dashboard.mastery.remainingLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Panel ── */}
          <div className="dash-panel">
            <div className="dash-panel-handle" />

            {/* ── Clock Module ── */}
            <div className="dash-clock dash-clock-card">

              {/* Map — CartoDB Voyager tiles, free, no key */}
              <div className="clock-map-shell" ref={mapShellRef}>
                <MapContainer
                  preferCanvas={true}
                  center={savedView?.center ?? [configuredJobSite.latitude, configuredJobSite.longitude]}
                  zoom={savedView?.zoom ?? 16}
                  zoomControl={false}
                  attributionControl={false}
                  className="clock-map-canvas"
                  style={{ height: '270px', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                    subdomains="abcd"
                    updateWhenZooming={false}
                    keepBuffer={3}
                  />
                  <Circle
                    center={[configuredJobSite.latitude, configuredJobSite.longitude]}
                    radius={GEOFENCE_RADIUS_FEET / FEET_PER_METER}
                    pathOptions={{ color: '#ff4f8d', fillColor: '#ff4f8d', fillOpacity: 0.14, weight: 2, opacity: 0.58 }}
                  />
                  <CircleMarker
                    center={[configuredJobSite.latitude, configuredJobSite.longitude]}
                    radius={7}
                    pathOptions={{ color: '#ffffff', fillColor: '#ff4f8d', fillOpacity: 1, weight: 1.5 }}
                  />
                  {userPosition && (
                    <CircleMarker
                      center={[userPosition.latitude, userPosition.longitude]}
                      radius={9}
                      pathOptions={{ color: '#ffffff', fillColor: '#1f8fff', fillOpacity: 1, weight: 2.5 }}
                    />
                  )}
                  <MapController mapRef={mapRef} userPosition={userPosition} onTilesLoaded={handleMapTilesLoaded} />
                </MapContainer>

                {/* Skeleton placeholder — fades out once tiles are loaded */}
                <div className={`map-placeholder${mapTilesLoaded ? ' map-placeholder--loaded' : ''}`}>
                  <svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="36" fill="none" stroke="#8b7355" strokeWidth="1.2" strokeDasharray="5 4" />
                    <circle cx="50" cy="50" r="5" fill="#8b7355" />
                    <line x1="50" y1="14" x2="50" y2="22" stroke="#8b7355" strokeWidth="1" />
                    <line x1="50" y1="78" x2="50" y2="86" stroke="#8b7355" strokeWidth="1" />
                    <line x1="14" y1="50" x2="22" y2="50" stroke="#8b7355" strokeWidth="1" />
                    <line x1="78" y1="50" x2="86" y2="50" stroke="#8b7355" strokeWidth="1" />
                  </svg>
                  <span>Loading map…</span>
                </div>

                {/* Zoom controls */}
                <div className="map-zoom-controls">
                  <button className="map-zoom-btn" onClick={handleZoomIn} aria-label="Zoom in">+</button>
                  <button className="map-zoom-btn" onClick={handleZoomOut} aria-label="Zoom out">−</button>
                </div>

                {/* Locate — centres the view on the employee's position */}
                <button
                  className={`map-locate-btn${userPosition ? ' is-active' : ''}`}
                  onClick={handleLocate}
                  aria-label="Center on my location"
                >
                  <IonIcon icon={locateOutline} />
                </button>

                {/* Live weather — Open-Meteo free API */}
                {weatherData && (
                  <div className="clock-weather-chip">
                    <span className="clock-weather-temp">{weatherData.tempF}&deg;F</span>
                    <span className="clock-weather-sep" aria-hidden="true">·</span>
                    <span className="clock-weather-cond">{weatherData.condition}</span>
                    <span className="clock-weather-wind">{weatherData.windMph}&nbsp;mph</span>
                  </div>
                )}

                {/* Distance chip */}
                {distanceToJobSiteFeet !== null && (
                  <div className={`clock-distance-chip${isWithinGeofence ? ' in-range' : ''}`}>
                    <IonIcon icon={navigateOutline} />
                    {isWithinGeofence ? (
                      <span>In geofence</span>
                    ) : (
                      <span className="clock-distance-chip__out">
                        <span>{Math.round(Math.max(0, distanceToJobSiteFeet - GEOFENCE_RADIUS_FEET))} ft from geofence</span>
                        <a
                          className="clock-distance-chip__directions"
                          href={`maps://maps.apple.com/?daddr=${configuredJobSite.latitude},${configuredJobSite.longitude}&dirflg=d`}
                          onClick={e => e.stopPropagation()}
                        >
                          Directions
                        </a>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Big clock button — sits at arch peak between map and bowl ── */}
              <button
                ref={clockBtnRef}
                type="button"
                className={`clock-main-btn${canClockIn ? ' is-ready' : ''}${isClockedIn ? ' is-clockout' : ''}`}
                onClick={handleMainClockButton}
                disabled={!canUseMainButton}
                aria-disabled={!canUseMainButton}
              >
                <IonIcon icon={timeOutline} />
                <span>{isClockedIn ? 'Clock Out' : 'Clock In'}</span>
              </button>

              {/* ── Bowl — arched hump at top ── */}
              <div className="clock-bowl">

                {/* Live earnings counter — visible while clocked in */}
                {isClockedIn && (
                  <div className="clock-live-stats">
                    <div className="clock-live-stat">
                      <span className="clock-live-value">${earnedAmount.toFixed(2)}</span>
                      <span className="clock-live-label">Earned</span>
                    </div>
                    <div className="clock-live-divider" />
                    <div className="clock-live-stat">
                      <span className="clock-live-value">{formatDuration(workElapsedSeconds)}</span>
                      <span className="clock-live-label">Work Time</span>
                    </div>
                    {onBreak && (
                      <>
                        <div className="clock-live-divider" />
                        <div className="clock-live-stat clock-live-stat--break">
                          <span className="clock-live-value">{formatDuration(breakElapsedSeconds)}</span>
                          <span className="clock-live-label">On Break</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* <div className="clock-readiness-list">
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
                </div> */}

                <div className={`clock-alert${isClockedIn ? ' clock-alert--info' : ''}`}>
                  <div className="clock-note">
                    {/* Row 1 — date and time, same style, justified */}
                    <div className="clock-note-datetime">
                      <span className="clock-note-label-date">{dateLabel}</span>
                      <span className="clock-note-label-time">{timeLabel}</span>
                    </div>
                    {/* Row 2 — keycard name + shift status inline */}
                    <div className="clock-note-value">
                      <span
                        key={activeKeyCardId ?? 'none'}
                        className="clock-note-value-keycard"
                      >
                        {activeKeyCardName ?? 'No keycard selected'}
                      </span>

                    </div>
                  </div>
                </div>
              </div>

              {/* ── Floating action buttons — 20 px from each viewport edge ── */}
              <div className="clock-float-btn-container">
                <button
                  type="button"
                  className="clock-float-btn clock-float-btn--keycard"
                  onClick={isClockedIn ? handleSwitchKeyCard : handleSelectKeyCard}
                >
                  <IonIcon icon={albumsOutline} />
                  <span>{keyCardActionLabel}</span>
                </button>

                <button
                  type="button"
                  className="clock-float-btn clock-float-btn--map"
                  onClick={() => setMapExpanded(true)}
                >
                  <IonIcon icon={expandOutline} />
                  <span>Map</span>
                </button>

                <button
                  type="button"
                  className="clock-float-btn clock-float-btn--action"
                  onClick={handleRightAction}
                >
                  <IonIcon icon={isClockedIn ? cafeOutline : timeOutline} />
                  <span>{rightActionLabel}</span>
                </button>
              </div>

            </div>

            {/* ── Shifts ── */}
            <div className="dash-section-header">
              <span className="dash-section-label dash-section-label--shifts">Shifts This Week</span>
            </div>
            <div className="shift-rail">
              {upcomingShifts.map(shift => (
                <IonCard
                  key={shift.id}
                  button
                  className="shift-card ios-surface"
                  onClick={() => history.push(`/schedule/${shift.shiftId}`)}
                >
                  <IonCardHeader>
                    <IonCardTitle>{shift.title}</IonCardTitle>
                    <IonCardSubtitle><IonIcon icon={timeOutline} /> {shift.time}</IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
              ))}
              <button className="shift-view-all">
                <IonIcon icon={chevronForwardOutline} />
                <span>View all</span>
              </button>
            </div>

            {/* ── Contests ── */}
            <div className="dash-section-header">
              <span className="dash-section-label dash-section-label--contests">Contests &amp; Skill Building</span>
            </div>
            <div className="contest-rail">
              {activeContests.map(contest => (
                <IonCard
                  key={contest.id}
                  button
                  className="contest-card ios-surface"
                  onClick={() => history.push(`/contests/${contest.id}`)}
                >
                  <IonCardHeader>
                    <IonCardSubtitle>{contest.subtitle}</IonCardSubtitle>
                    <IonCardTitle>{contest.title}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p>{contest.details}</p>
                    <button className="contest-enter-btn" type="button" onClick={e => e.stopPropagation()}>{contest.cta}</button>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>

            {/* ── Announcements ── */}
            <div className="dash-section-header">
              <span className="dash-section-label dash-section-label--announcements">What's Happening</span>
            </div>
            <div className="announcement-rail">
              {announcements.map(announcement => (
                <IonCard
                  key={announcement.id}
                  button
                  className="announcement-card ios-surface"
                  onClick={() => onAnnouncementTap(announcement.id)}
                >
                  <img alt={announcement.title} src={announcement.image} />
                  <IonCardHeader>
                    <IonCardTitle>{announcement.title}</IonCardTitle>
                    <IonCardSubtitle><IonIcon icon={timeOutline} /> {announcement.time}</IonCardSubtitle>
                  </IonCardHeader>
                </IonCard>
              ))}
            </div>

          </div>
        </div>
      </IonContent>
      {mapExpanded && (
        <div className="map-expanded-overlay">
          <MapContainer
            center={[configuredJobSite.latitude, configuredJobSite.longitude]}
            zoom={16}
            zoomControl={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              subdomains="abcd"
              updateWhenZooming={false}
              keepBuffer={3}
            />
            <Circle
              center={[configuredJobSite.latitude, configuredJobSite.longitude]}
              radius={GEOFENCE_RADIUS_FEET / FEET_PER_METER}
              pathOptions={{ color: '#ff4f8d', fillColor: '#ff4f8d', fillOpacity: 0.14, weight: 2, opacity: 0.58 }}
            />
            <CircleMarker
              center={[configuredJobSite.latitude, configuredJobSite.longitude]}
              radius={7}
              pathOptions={{ color: '#ffffff', fillColor: '#ff4f8d', fillOpacity: 1, weight: 1.5 }}
            />
            {userPosition && (
              <CircleMarker
                center={[userPosition.latitude, userPosition.longitude]}
                radius={9}
                pathOptions={{ color: '#ffffff', fillColor: '#1f8fff', fillOpacity: 1, weight: 2.5 }}
              />
            )}
            <ExpandedMapController mapRef={expandedMapRef} userPosition={userPosition} />
          </MapContainer>

          {/* Close */}
          <button
            className="map-expanded-close-btn"
            onClick={() => setMapExpanded(false)}
            aria-label="Close map"
          >
            <IonIcon icon={closeOutline} />
          </button>

          {/* Zoom controls */}
          <div className="map-zoom-controls map-expanded-zoom-controls">
            <button className="map-zoom-btn" onClick={() => expandedMapRef.current?.zoomIn()} aria-label="Zoom in">+</button>
            <button className="map-zoom-btn" onClick={() => expandedMapRef.current?.zoomOut()} aria-label="Zoom out">−</button>
          </div>

          {/* Locate */}
          <button
            className={`map-locate-btn map-expanded-locate-btn${userPosition ? ' is-active' : ''}`}
            onClick={() => {
              if (userPosition && expandedMapRef.current) {
                expandedMapRef.current.flyTo([userPosition.latitude, userPosition.longitude], 17, { duration: 0.7 });
              }
            }}
            aria-label="Center on my location"
          >
            <IonIcon icon={locateOutline} />
          </button>

          {/* Directions to job site */}
          <a
            className="map-expanded-directions-btn"
            href={`maps://maps.apple.com/?daddr=${configuredJobSite.latitude},${configuredJobSite.longitude}&dirflg=d`}
          >
            <IonIcon icon={navigateOutline} />
            <span>Directions</span>
          </a>
        </div>
      )}
      <ShiftCountdownIsland />
    </IonPage>
  );
};

export default DashboardPage;
