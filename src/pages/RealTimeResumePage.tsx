import { IonContent, IonIcon, IonModal, IonPage } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useMemo, useState } from 'react';
import { CareerOverviewChart, GaugeChart, SuccessProbabilityChart } from '../components/charts';
import { useAuth } from '../context/AuthContext';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import { readStoredProfile } from '../data/profileData';
import './RealTimeResumePage.css';

const RealTimeResumePage: React.FC = () => {
  const { userName } = useAuth();
  const profile = useMemo(() => readStoredProfile(userName), [userName]);
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);

  const displayName = useMemo(() => {
    const full = `${defaultLoggedInEmployee.firstName || ''} ${defaultLoggedInEmployee.lastName || ''}`.trim();
    return profile.displayName.trim() || full || defaultLoggedInEmployee.displayName;
  }, [profile.displayName]);

  const activeBadge = useMemo(
    () => defaultLoggedInEmployee.resume.badges.find(badge => badge.id === activeBadgeId) ?? null,
    [activeBadgeId]
  );

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
            <h3>Bio</h3>
            <p className="resume-bio">{profile.bio}</p>
          </section>

          <section className="resume-card">
            <h3>Badges</h3>
            <div className="resume-badge-row">
              {defaultLoggedInEmployee.resume.badges.map(badge => (
                <button
                  key={badge.id}
                  className="resume-badge-btn"
                  onClick={() => setActiveBadgeId(badge.id)}
                  aria-label={`Open ${badge.label} badge`}
                >
                  <img src={badge.thumbUrl} alt={badge.label} />
                </button>
              ))}
            </div>
          </section>

          <section className="resume-card">
            <CareerOverviewChart
              title="Career Overview"
              segments={defaultLoggedInEmployee.resume.careerOverview}
            />
          </section>

          <section className="resume-card">
            <div className="resume-stat-grid">
              <article>
                <span>Attendance</span>
                <strong>{defaultLoggedInEmployee.resume.stats.attendancePercent}%</strong>
              </article>
              <article>
                <span>Hourly Rate</span>
                <strong>${defaultLoggedInEmployee.resume.stats.hourlyRate.toFixed(2)}</strong>
              </article>
              <article>
                <span>Time with Company</span>
                <strong>{defaultLoggedInEmployee.resume.stats.timeWithCompanyYears.toFixed(1)}y</strong>
              </article>
              <article>
                <span>PTO</span>
                <strong>{defaultLoggedInEmployee.resume.stats.ptoDays.toFixed(2)}d</strong>
              </article>
              <article>
                <span>Employer Flags</span>
                <strong>{defaultLoggedInEmployee.resume.stats.employerFlags}</strong>
              </article>
            </div>
          </section>

          <section className="resume-card">
            <div className="resume-gauges">
              <GaugeChart
                title={defaultLoggedInEmployee.resume.performanceRating.title}
                value={defaultLoggedInEmployee.resume.performanceRating.value}
                max={defaultLoggedInEmployee.resume.performanceRating.max}
                startLabel={defaultLoggedInEmployee.resume.performanceRating.startLabel}
                endLabel={defaultLoggedInEmployee.resume.performanceRating.endLabel}
                gradient={defaultLoggedInEmployee.resume.performanceRating.gradient}
              />
              <GaugeChart
                title={defaultLoggedInEmployee.resume.kpiGauge.title}
                value={defaultLoggedInEmployee.resume.kpiGauge.value}
                max={defaultLoggedInEmployee.resume.kpiGauge.max}
                startLabel={defaultLoggedInEmployee.resume.kpiGauge.startLabel}
                endLabel={defaultLoggedInEmployee.resume.kpiGauge.endLabel}
                gradient={defaultLoggedInEmployee.resume.kpiGauge.gradient}
              />
            </div>
          </section>

          <section className="resume-card">
            <SuccessProbabilityChart
              title={defaultLoggedInEmployee.resume.successProbability.title}
              value={defaultLoggedInEmployee.resume.successProbability.value}
              valueLabel={defaultLoggedInEmployee.resume.successProbability.valueLabel}
              segments={defaultLoggedInEmployee.resume.successProbability.segments}
            />
          </section>
        </div>
      </IonContent>

      <IonModal isOpen={Boolean(activeBadge)} onDidDismiss={() => setActiveBadgeId(null)}>
        {activeBadge ? (
          <div className="badge-modal-content">
            <button className="badge-modal-close" onClick={() => setActiveBadgeId(null)} aria-label="Close badge preview">
              <IonIcon icon={closeOutline} />
            </button>
            <img src={activeBadge.fullUrl} alt={activeBadge.label} />
          </div>
        ) : null}
      </IonModal>
    </IonPage>
  );
};

export default RealTimeResumePage;
