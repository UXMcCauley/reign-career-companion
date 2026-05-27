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
  personCircleOutline,
  sparklesOutline
} from 'ionicons/icons';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';

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

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const tabByPath: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/chat': 'chat',
  '/schedule': 'schedule',
  '/ai-coach': 'ai-coach'
};

const AppTabs: React.FC = () => {
  const location = useLocation();
  const history = useHistory();

  const currentTab = tabByPath[location.pathname] ?? 'dashboard';

  const onProfileTap = (event: CustomEvent) => {
    event.preventDefault();
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
          </IonList>
        </IonContent>
      </IonMenu>

      <IonTabs>
        <IonRouterOutlet id="main-content">
          <Route exact path="/dashboard">
            <DashboardPage />
          </Route>
          <Route exact path="/chat">
            <PlaceholderPage
              title="Chat"
              subtitle="Conversations and coaching threads will live here."
            />
          </Route>
          <Route exact path="/schedule">
            <PlaceholderPage
              title="Schedule"
              subtitle="Calendar, sessions, and reminders will be organized here."
            />
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

        <IonTabBar slot="bottom" className="app-tab-bar">
          <IonTabButton selected={currentTab === 'dashboard'} tab="dashboard" href="/dashboard">
            <IonIcon aria-hidden="true" icon={gridOutline} />
            <IonLabel>Dashboard</IonLabel>
          </IonTabButton>
          <IonTabButton selected={currentTab === 'chat'} tab="chat" href="/chat">
            <IonIcon aria-hidden="true" icon={chatbubbleEllipsesOutline} />
            <IonLabel>Chat</IonLabel>
          </IonTabButton>
          <IonTabButton selected={currentTab === 'schedule'} tab="schedule" href="/schedule">
            <IonIcon aria-hidden="true" icon={calendarOutline} />
            <IonLabel>Schedule</IonLabel>
          </IonTabButton>
          <IonTabButton selected={currentTab === 'ai-coach'} tab="ai-coach" href="/ai-coach">
            <IonIcon aria-hidden="true" icon={sparklesOutline} />
            <IonLabel>AI Coach</IonLabel>
          </IonTabButton>
          <IonTabButton tab="profile-menu" href="/dashboard" onClick={onProfileTap}>
            <IonIcon aria-hidden="true" icon={personCircleOutline} />
            <IonLabel>Menu</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </>
  );
};

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <AppTabs />
    </IonReactRouter>
  </IonApp>
);

export default App;
