import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { analyticsOutline, briefcaseOutline, flashOutline, medalOutline, timeOutline } from 'ionicons/icons';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import { readStoredProfile } from '../data/profileData';
import { demoEmployeeTalentCards } from '../data/talentCards';
import './RealTimeResumePage.css';

const RealTimeResumePage: React.FC = () => {
  const { userName } = useAuth();
  const profile = useMemo(() => readStoredProfile(userName), [userName]);

  const displayName = useMemo(() => {
    const full = `${defaultLoggedInEmployee.firstName || ''} ${defaultLoggedInEmployee.lastName || ''}`.trim();
    return profile.displayName.trim() || full || defaultLoggedInEmployee.displayName;
  }, [profile.displayName]);

  return (
    <IonPage className="resume-page">
      <IonContent fullscreen>
        <div className="resume-scene">
          <header className="resume-hero">
            <img src={profile.headshotDataUrl || defaultLoggedInEmployee.avatarUrl} alt={displayName} />
            <div>
              <h1>{displayName}</h1>
              <h2>{defaultLoggedInEmployee.roleTitle}</h2>
            </div>
          </header>

          <section className="resume-card">
            <h3>Live Snapshot</h3>
            <div className="resume-stat-grid">
              <div>
                <IonIcon icon={briefcaseOutline} />
                <span>Talent Cards</span>
                <strong>{demoEmployeeTalentCards.length}</strong>
              </div>
              <div>
                <IonIcon icon={medalOutline} />
                <span>Mastery Progress</span>
                <strong>{defaultLoggedInEmployee.dashboard.mastery.fillPercent}%</strong>
              </div>
              <div>
                <IonIcon icon={analyticsOutline} />
                <span>Success Signal</span>
                <strong>
                  {defaultLoggedInEmployee.dashboard.metrics.find(metric => metric.label === 'Success')?.value ?? '--'}
                </strong>
              </div>
            </div>
          </section>

          <section className="resume-card">
            <h3>Current Performance Signals</h3>
            <div className="resume-signal-list">
              {defaultLoggedInEmployee.dashboard.metrics.map(metric => (
                <article key={metric.label}>
                  <div>
                    <span>{metric.label}</span>
                    <p>{metric.description}</p>
                  </div>
                  <strong>
                    {metric.value}
                    {metric.total ?? ''}
                  </strong>
                </article>
              ))}
            </div>
          </section>

          <section className="resume-card">
            <h3>Core Talent Cards</h3>
            <div className="resume-chip-list">
              {demoEmployeeTalentCards.map(card => (
                <span key={card.id}>{card.name}</span>
              ))}
            </div>
          </section>

          <section className="resume-card">
            <h3>Recent Milestones</h3>
            <div className="resume-milestone-list">
              <article>
                <IonIcon icon={flashOutline} />
                <div>
                  <strong>Mastery heading to next level</strong>
                  <p>{defaultLoggedInEmployee.dashboard.mastery.remainingLabel}</p>
                </div>
              </article>
              <article>
                <IonIcon icon={timeOutline} />
                <div>
                  <strong>On-time streak remains strong</strong>
                  <p>{defaultLoggedInEmployee.dashboard.metrics.find(metric => metric.label === 'OTS')?.value} days in the rolling window</p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RealTimeResumePage;
