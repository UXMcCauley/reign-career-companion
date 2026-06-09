import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonTitle,
  IonToolbar,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  calendarOutline,
  chatbubbleEllipsesOutline,
  gridOutline,
  logOutOutline,
  personCircleOutline,
  sparklesOutline
} from 'ionicons/icons';
import ChatArchivedPage from './pages/ChatArchivedPage';
import ChatNewPage from './pages/ChatNewPage';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';
import SchedulePage from './pages/SchedulePage';
import ShiftDetailPage from './pages/ShiftDetailPage';
import { AuthProvider, useAuth } from './context/AuthContext';

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

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const tabDefs = [
  { id: 'dashboard', href: '/dashboard', icon: gridOutline },
  { id: 'chat', href: '/chat', icon: chatbubbleEllipsesOutline },
  { id: 'schedule', href: '/schedule', icon: calendarOutline },
  { id: 'ai-coach', href: '/ai-coach', icon: sparklesOutline },
  { id: 'profile-menu', href: null, icon: personCircleOutline },
] as const;

const tabPathPrefixes: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/chat': 'chat',
  '/schedule': 'schedule',
  '/ai-coach': 'ai-coach',
};

function resolveTab(pathname: string): string {
  for (const [prefix, tab] of Object.entries(tabPathPrefixes)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return tab;
  }
  return 'dashboard';
}

const FloatingTabBar: React.FC<{
  currentTab: string;
  onProfileTap: () => void;
}> = ({ currentTab, onProfileTap }) => {
  const history = useHistory();
  const activeIndex = tabDefs.findIndex(t => t.id === currentTab);

  const handleTap = (tab: (typeof tabDefs)[number]) => {
    if (tab.id === 'profile-menu') {
      onProfileTap();
    } else if (tab.href) {
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
          </button>
        ))}
      </div>
    </div>
  );
};

const AppTabs: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const { logout } = useAuth();

  const currentTab = resolveTab(location.pathname);

  const onProfileTap = () => {
    const profileMenu = document.querySelector('ion-menu[menu-id="profile-drawer"]') as
      | HTMLIonMenuElement
      | null;
    profileMenu?.open();
  };

  const onMenuItemTap = async (destination: string) => {
    const profileMenu = document.querySelector('ion-menu[menu-id="profile-drawer"]') as
      | HTMLIonMenuElement
      | null;
    await profileMenu?.close();
    history.push(destination);
  };

  const handleLogout = async () => {
    const profileMenu = document.querySelector('ion-menu[menu-id="profile-drawer"]') as
      | HTMLIonMenuElement
      | null;
    await profileMenu?.close();
    logout();
  };

  return (
    <>
      <IonMenu
        side="end"
        type="overlay"
        menuId="profile-drawer"
        contentId="main-content"
        className="profile-drawer"
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Menu</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            <IonItem button detail onClick={() => onMenuItemTap('/announcements')}>
              Announcements
            </IonItem>
            <IonItem button detail onClick={() => onMenuItemTap('/notifications')}>
              Notifications
            </IonItem>
            <IonItem button detail onClick={() => onMenuItemTap('/settings')}>
              Settings
            </IonItem>
            <IonItem button detail onClick={() => onMenuItemTap('/profile')}>
              Profile
            </IonItem>
            <IonItem button detail onClick={() => onMenuItemTap('/real-time-resume')}>
              Real-time Resume
            </IonItem>
            <IonItem button onClick={handleLogout} style={{ marginTop: '16px' }}>
              <IonIcon icon={logOutOutline} slot="start" color="danger" />
              <IonLabel color="danger">Sign Out</IonLabel>
            </IonItem>
          </IonList>
        </IonContent>
      </IonMenu>

      <IonTabs>
        <IonRouterOutlet id="main-content">
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
            <PlaceholderPage
              title="AI Coach"
              subtitle="Training plans, prompts, and progress insights go here."
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
            <PlaceholderPage
              title="Settings"
              subtitle="Account and app preferences."
            />
          </Route>
          <Route exact path="/profile">
            <PlaceholderPage
              title="Profile"
              subtitle="Personal details, goals, and account status."
            />
          </Route>
          <Route exact path="/real-time-resume">
            <PlaceholderPage
              title="Real-time Resume"
              subtitle="Live achievements, milestones, and impact snapshots."
            />
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

      <FloatingTabBar currentTab={currentTab} onProfileTap={onProfileTap} />
    </>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppTabs /> : <LoginPage />;
};

const App: React.FC = () => (
  <AuthProvider>
    <IonApp>
      <IonReactRouter>
        <AppContent />
      </IonReactRouter>
    </IonApp>
  </AuthProvider>
);

export default App;
