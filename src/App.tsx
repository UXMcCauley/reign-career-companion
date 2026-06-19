import { useEffect, useState, useSyncExternalStore } from 'react';
import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';
import {
  AnimationBuilder,
  IonApp,
  IonContent,
  IonIcon,
  IonMenu,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonToggle,
  createAnimation,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  albumsOutline,
  calendarOutline,
  chatbubbleEllipsesOutline,
  chevronForwardOutline,
  documentTextOutline,
  gridOutline,
  locateOutline,
  logOutOutline,
  megaphoneOutline,
  notificationsOutline,
  personOutline,
  settingsOutline,
  sparklesOutline,
} from 'ionicons/icons';
import ChatArchivedPage from './pages/ChatArchivedPage';
import ChatNewPage from './pages/ChatNewPage';
import ChatPage from './pages/ChatPage';
import AICoachPage from './pages/AICoachPage';
import DashboardPage from './pages/DashboardPage';
import KeycardsPage from './pages/KeycardsPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import RealTimeResumePage from './pages/RealTimeResumePage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import ShiftDetailPage from './pages/ShiftDetailPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GeofenceTestProvider, useGeofenceTest } from './context/GeofenceTestContext';
import { WorkforceProvider } from './context/WorkforceContext';
import { getChatUnreadCount, subscribeChatUnread, syncAppBadge } from './lib/chatUnread';
import { readStoredProfile, PROFILE_STORAGE_KEY } from './data/profileData';
/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

 import '@ionic/react/css/palettes/dark.always.css'; 
 import '@ionic/react/css/palettes/dark.class.css'; 
import '@ionic/react/css/palettes/dark.system.css';
  
/* Theme variables */
import './theme/variables.css';
import './ProfileDrawer.css';
import { ShiftCountdownIsland } from './components/ShiftCountdownIsland';
import { Capacitor } from '@capacitor/core';
import {  } from '@ionic/pwa-elements';

import Example from './pages/Example';

setupIonicReact();

const EXIT_DURATION_MS = 170;
const ENTER_DURATION_MS = 210;

const buildSequentialPageTransition: AnimationBuilder = (_, opts) => {
  const enteringEl = opts.enteringEl;
  const leavingEl = opts.leavingEl;
  const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  const rootAnimation = createAnimation().duration(EXIT_DURATION_MS + ENTER_DURATION_MS).easing(easing);

  if (leavingEl) {
    const leaveAnimation = createAnimation()
      .addElement(leavingEl)
      .duration(EXIT_DURATION_MS)
      .fromTo('opacity', '1', '0')
      .fromTo('transform', 'translate3d(0, 0, 0)', 'translate3d(-6%, 0, 0)');

    rootAnimation.addAnimation(leaveAnimation);
  }

  if (enteringEl) {
    const enterAnimation = createAnimation()
      .addElement(enteringEl)
      .delay(leavingEl ? EXIT_DURATION_MS : 0)
      .duration(ENTER_DURATION_MS)
      .fromTo('opacity', '0', '1')
      .fromTo('transform', 'translate3d(6%, 0, 0)', 'translate3d(0, 0, 0)');

    rootAnimation.addAnimation(enterAnimation);
  }

  return rootAnimation;
};

const tabDefs = [
  { id: 'dashboard', href: '/dashboard', icon: gridOutline },
  { id: 'chat', href: '/chat', icon: chatbubbleEllipsesOutline },
  { id: 'schedule', href: '/schedule', icon: calendarOutline },
  { id: 'keycards', href: '/keycards', icon: albumsOutline },
  { id: 'ai-coach', href: '/ai-coach', icon: sparklesOutline },
  // { id: 'example', href: '/example', icon: sparklesOutline },
] as const;

const tabPathPrefixes: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/chat': 'chat',
  '/schedule': 'schedule',
  '/keycards': 'keycards',
  '/ai-coach': 'ai-coach',
  // '/example': 'example',
};

function resolveTab(pathname: string): string {
  for (const [prefix, tab] of Object.entries(tabPathPrefixes)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return tab;
  }
  return 'dashboard';
}

const FloatingTabBar: React.FC<{
  currentTab: string;
}> = ({ currentTab }) => {
  const history = useHistory();
  const activeIndex = tabDefs.findIndex(t => t.id === currentTab);
  const chatUnread = useSyncExternalStore(subscribeChatUnread, getChatUnreadCount);

  const handleTap = (tab: (typeof tabDefs)[number]) => {
    if (tab.href) {
      history.push(tab.href);
    }
  };

  return (
    <div className="floating-tab-bar">
      <div className="floating-tab-bar-track">
        <div
          className="tab-indicator"
          style={{ transform: `translateX(${Math.max(0, activeIndex) * 100}%)` }}
        >
          <div className="tab-indicator-circle" />
        </div>
        {tabDefs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${currentTab === tab.id ? ' active' : ''}`}
            onClick={() => handleTap(tab)}
            aria-label={tab.id.replace(/-/g, ' ')}
          >
            <IonIcon icon={tab.icon} />
            {tab.id === 'chat' && chatUnread > 0 ? <span className="tab-notification-dot" aria-hidden /> : null}
          </button>
        ))}
      </div>
    </div>
  );
};

const NAV_ITEMS = [
  { label: 'Profile',          icon: personOutline,       path: '/profile',           iconBg: 'rgba(140, 80, 255, 0.22)',  iconColor: 'rgba(185, 150, 255, 0.95)' },
  { label: 'Announcements',    icon: megaphoneOutline,    path: '/announcements',     iconBg: 'rgba(255, 60, 140, 0.18)',  iconColor: 'rgba(255, 130, 190, 0.95)' },
  { label: 'Notifications',    icon: notificationsOutline,path: '/notifications',     iconBg: 'rgba(30, 130, 255, 0.20)',  iconColor: 'rgba(110, 200, 255, 0.95)' },
  { label: 'Real-time Resume', icon: documentTextOutline, path: '/real-time-resume',  iconBg: 'rgba(20, 190, 130, 0.18)',  iconColor: 'rgba(80, 230, 170, 0.95)'  },
  { label: 'Settings',         icon: settingsOutline,     path: '/settings',          iconBg: 'rgba(255, 180, 30, 0.16)',  iconColor: 'rgba(255, 210, 100, 0.95)' },
] as const;

const AppTabs: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const { logout, userName } = useAuth();
  const { proximityTestEnabled, setProximityTestEnabled } = useGeofenceTest();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerHeadshotUrl, setDrawerHeadshotUrl] = useState<string>('');
  const [drawerDisplayName, setDrawerDisplayName] = useState<string>('');

  useEffect(() => {
    const p = readStoredProfile(userName);
    setDrawerHeadshotUrl(p.headshotDataUrl);
    setDrawerDisplayName(p.displayName);
  }, [userName]);

  const currentTab = resolveTab(location.pathname);

  const effectiveName = drawerDisplayName || userName || '';
  const drawerFirstName = effectiveName
    ? (effectiveName.includes('@') ? effectiveName.split('@')[0] : effectiveName.split(' ')[0])
    : 'User';
  const drawerInitial = drawerFirstName.charAt(0).toUpperCase();

  const getMenu = () =>
    document.querySelector('ion-menu[menu-id="profile-drawer"]') as HTMLIonMenuElement | null;

  const onMenuItemTap = async (destination: string) => {
    await getMenu()?.close();
    history.push(destination);
  };

  const handleLogout = async () => {
    await getMenu()?.close();
    logout();
  };

  const handleProximityTestToggle = async (enabled: boolean) => {
    setProximityTestEnabled(enabled);
    if (enabled) {
      await getMenu()?.close();
      history.push('/dashboard');
    }
  };

  return (
    <>

      <IonMenu
        side="end"
        type="overlay"
        menuId="profile-drawer"
        contentId="main-content"
        className="profile-drawer"
        onIonWillOpen={() => {
          const p = readStoredProfile(userName);
          setDrawerHeadshotUrl(p.headshotDataUrl);
          setDrawerDisplayName(p.displayName);
          setDrawerOpen(true);
        }}
        onIonDidClose={() => setDrawerOpen(false)}
      >
        <IonContent scrollY>
          <div className={`drawer-inner${drawerOpen ? ' drawer-inner--open' : ''}`}>
            <div className="drawer-glow" />
            <div className="drawer-glow-bottom" />

            {/* ── Avatar + identity ── */}
            <div className="drawer-hero">
              <div className="drawer-avatar-large">
                {drawerHeadshotUrl
                  ? <img src={drawerHeadshotUrl} alt={drawerFirstName} className="drawer-avatar-photo" />
                  : drawerInitial
                }
              </div>
              <span className="drawer-name">{drawerFirstName}</span>
              <span className="drawer-role">Team Member</span>
            </div>

            {/* ── Nav items ── */}
            <nav className="drawer-nav">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.path}
                  className="drawer-nav-item"
                  onClick={() => onMenuItemTap(item.path)}
                >
                  <span
                    className="drawer-nav-icon-wrap"
                    style={{ background: item.iconBg }}
                  >
                    <IonIcon icon={item.icon} style={{ color: item.iconColor }} />
                  </span>
                  <span className="drawer-nav-label">{item.label}</span>
                  <IonIcon icon={chevronForwardOutline} className="drawer-nav-chevron" />
                </button>
              ))}
            </nav>

            <div className="drawer-divider" />

            {/* ── Proximity test toggle ── */}
            <div className="drawer-setting">
              <span
                className="drawer-nav-icon-wrap"
                style={{ background: 'rgba(6, 119, 240, 0.20)' }}
              >
                <IonIcon icon={locateOutline} style={{ color: 'rgba(103, 208, 255, 0.95)' }} />
              </span>
              <div className="drawer-setting-text">
                <span className="drawer-setting-label">Proximity Test</span>
                <span className="drawer-setting-sub">Simulate walking toward job site</span>
              </div>
              <IonToggle
                checked={proximityTestEnabled}
                onIonChange={e => void handleProximityTestToggle(e.detail.checked)}
              />
            </div>

            {/* ── Sign out ── */}
            <button className="drawer-signout" onClick={handleLogout}>
              <IonIcon icon={logOutOutline} />
              <span>Sign Out</span>
            </button>
          </div>
        </IonContent>
      </IonMenu>

      <IonTabs>
        <IonRouterOutlet id="main-content" animation={buildSequentialPageTransition}>
          <Route exact path="/dashboard">
            <DashboardPage />
          </Route>
          <Route exact path="/chat">
            <ChatPage />
          </Route>
          <Route exact path="/chat/archived">
            <ChatArchivedPage />
          </Route>
          <Route exact path="/chat/new">
            <ChatNewPage />
          </Route>
          <Route exact path="/schedule">
            <SchedulePage />
          </Route>
          <Route exact path="/schedule/:shiftId">
            <ShiftDetailPage />
          </Route>
          <Route exact path="/ai-coach">
            <AICoachPage />
          </Route>
          {/* <Route exact path="/example">
            <Example />
          </Route> */}
          <Route exact path="/keycards">
            <KeycardsPage />
          </Route>
          <Route exact path="/projects">
            <Redirect to="/keycards" />
          </Route>
          <Route exact path="/contests/:contestId">
            <PlaceholderPage
              title="Contest Details"
              subtitle="Contest rules, leaderboard, and progress."
            />
          </Route>
          <Route exact path="/announcements">
            <PlaceholderPage
              title="Announcements"
              subtitle="Latest platform and team updates."
            />
          </Route>
          <Route exact path="/announcements/:announcementId">
            <PlaceholderPage
              title="Announcement Details"
              subtitle="Full announcement content and follow-up actions."
            />
          </Route>
          <Route exact path="/notifications">
            <PlaceholderPage
              title="Notifications"
              subtitle="Unread alerts and activity updates."
            />
          </Route>
          <Route exact path="/settings">
            <SettingsPage />
          </Route>
          <Route exact path="/profile">
            <ProfilePage />
          </Route>
          <Route exact path="/real-time-resume">
            <RealTimeResumePage />
          </Route>
          <Route exact path="/">
            <Redirect to="/dashboard" />
          </Route>
        </IonRouterOutlet>

        {/* Hidden — keeps Ionic tab routing state intact */}
        <IonTabBar slot="bottom" style={{ display: 'none' }}>
          {tabDefs.map(t => (
            <IonTabButton key={t.id} tab={t.id} href={t.href ?? '/dashboard'} />
          ))}
        </IonTabBar>
      </IonTabs>

      <FloatingTabBar currentTab={currentTab} />
    </>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Reflect any persisted unread chats on the home-screen icon badge at launch.
  useEffect(() => {
    syncAppBadge();
  }, []);

  if (location.pathname.startsWith('/profile/public/')) {
    return <PublicProfilePage />;
  }

  return isAuthenticated ? <AppTabs /> : <LoginPage />;
};

const App: React.FC = () => (
  <AuthProvider>
    <WorkforceProvider>
    <GeofenceTestProvider>
    {/* <IonHeader>
    {
        Capacitor.getPlatform() === 'ios' && (
          <ShiftCountdownIsland />
        ) 
      }
    </IonHeader> */}
    
    <IonApp>
    
      <IonReactRouter>
        <AppContent />
      </IonReactRouter>
    </IonApp>
    </GeofenceTestProvider>
    </WorkforceProvider>
  </AuthProvider>
);

export default App;
