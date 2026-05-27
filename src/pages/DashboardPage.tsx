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
  IonToolbar
} from '@ionic/react';
import { checkmarkCircleOutline, timeOutline } from 'ionicons/icons';
import logo from '../assets/reignos-logo.png';
import './DashboardPage.css';

const metrics = [
  { label: 'PPI', title: 'Predictive Performance Indicator', value: '1.0', total: '/5' },
  { label: 'OTS', title: 'On-time Punch Streak', value: '132', total: '/365' },
  { label: 'Performance', title: 'Daily Performance Rating Average', value: '0.0', total: '/10' },
  { label: 'Team', title: 'Team Average Performance Rating', value: '8.7', total: '/10' },
  { label: 'Success Score', title: 'Probability of Success', value: '87.9%' },
  { label: 'UMI', title: 'Usefulness Margin Indicator', value: '93.3%' }
];

const DashboardPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar className="dashboard-toolbar">
          <img alt="ReignOS" src={logo} className="dashboard-logo" />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="dashboard-content">
          <IonCard className="clock-card">
            <IonCardHeader>
              <IonCardSubtitle>General Purpose Clock In/Out</IonCardSubtitle>
              <IonCardTitle>00:00:00</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p className="clock-label">Time Worked</p>
              <IonText color="medium">
                <p className="clock-status">Not Clocked In</p>
              </IonText>
              <IonButton expand="block" color="success">
                <IonIcon icon={checkmarkCircleOutline} slot="start" />
                Clock In
              </IonButton>
              <IonText color="medium">
                <p className="clock-note">You have not been added to a team yet. Please contact your employer.</p>
              </IonText>
            </IonCardContent>
          </IonCard>

          <div className="metrics-grid">
            {metrics.map((metric) => (
              <IonCard key={metric.label} className="metric-card">
                <IonCardHeader>
                  <IonCardSubtitle>{metric.label}</IonCardSubtitle>
                  <IonCardTitle>{metric.title}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <span className="metric-value">{metric.value}</span>
                  {metric.total ? <span className="metric-total">{metric.total}</span> : null}
                </IonCardContent>
              </IonCard>
            ))}
          </div>

          <IonCard className="announcement-card">
            <img
              alt="Cricket game after work"
              src="https://images.unsplash.com/photo-1593766788306-28561086694e?auto=format&fit=crop&w=1200&q=80"
            />
            <IonCardHeader>
              <IonCardTitle>Cricket Game after work</IonCardTitle>
              <IonCardSubtitle>
                <IonIcon icon={timeOutline} /> 6:00 PM
              </IonCardSubtitle>
            </IonCardHeader>
            <IonCardContent>Click to view details. Swipe left for more announcements.</IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
