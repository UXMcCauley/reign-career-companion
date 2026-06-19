import { IonContent, IonIcon, IonModal, IonPage } from '@ionic/react';
import {
  calendarOutline,
  cashOutline,
  closeOutline,
  flagOutline,
  logoFacebook,
  logoInstagram,
  logoLinkedin,
  shareOutline,
  timeOutline,
  sunnyOutline,
} from 'ionicons/icons';
import { useMemo, useState } from 'react';
import { CareerOverviewChart, GaugeChart, SkillsInventoryChart, SuccessProbabilityChart } from '../components/charts';
import type { SkillsInventoryNode } from '../components/charts';
import { demoEmployeeTalentCards } from '../data/talentCards';
import { useAuth } from '../context/AuthContext';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import { readStoredProfile } from '../data/profileData';
import './RealTimeResumePage.css';

type ResumeMetricId = 'hourlyRate' | 'attendance' | 'pto' | 'tenure' | 'flags';

type ResumeMetricConfig = {
  id: ResumeMetricId;
  className: string;
  label: string;
  value: string;
  icon: string;
};

const RESUME_METRICS: ResumeMetricConfig[] = [
  {
    id: 'hourlyRate',
    className: 'resume-metric--hourly-rate',
    label: 'Hourly Rate',
    value: `$${defaultLoggedInEmployee.resume.stats.hourlyRate.toFixed(2)}`,
    icon: cashOutline,
  },
  {
    id: 'attendance',
    className: 'resume-metric--attendance',
    label: 'Attendance',
    value: `${defaultLoggedInEmployee.resume.stats.attendancePercent}%`,
    icon: calendarOutline,
  },
  {
    id: 'pto',
    className: 'resume-metric--pto',
    label: 'PTO',
    value: `${defaultLoggedInEmployee.resume.stats.ptoDays.toFixed(2)}d`,
    icon: sunnyOutline,
  },
  {
    id: 'tenure',
    className: 'resume-metric--tenure',
    label: 'Time with Company',
    value: `${defaultLoggedInEmployee.resume.stats.timeWithCompanyYears.toFixed(1)}y`,
    icon: timeOutline,
  },
  {
    id: 'flags',
    className: 'resume-metric--flags',
    label: 'Employer Flags',
    value: String(defaultLoggedInEmployee.resume.stats.employerFlags),
    icon: flagOutline,
  },
];

const SKILLS_INVENTORY_NODES: SkillsInventoryNode[] = [
  {
    id: 'soc-11-3020',
    label: 'Computer and Information Systems Managers',
    shortLabel: 'IT Systems',
    proficiency: 88,
    educationHours: 180,
    certificationHours: 140,
    apprenticeshipHours: 100,
  },
  {
    id: 'soc-15-1250',
    label: 'Software Developers and Quality Assurance Analysts and Testers',
    shortLabel: 'Software Dev',
    proficiency: 84,
    educationHours: 150,
    certificationHours: 130,
    apprenticeshipHours: 100,
  },
  {
    id: 'soc-15-1210',
    label: 'Computer Occupations',
    shortLabel: 'Computer Ops',
    proficiency: 76,
    educationHours: 140,
    certificationHours: 110,
    apprenticeshipHours: 70,
  },
  {
    id: 'soc-17-2050',
    label: 'Engineers',
    shortLabel: 'Engineering',
    proficiency: 81,
    educationHours: 90,
    certificationHours: 110,
    apprenticeshipHours: 90,
  },
  {
    id: 'soc-27-1020',
    label: 'Designers',
    shortLabel: 'Design',
    proficiency: 72,
    educationHours: 110,
    certificationHours: 90,
    apprenticeshipHours: 60,
  },
  {
    id: 'trade-project-controls',
    label: 'Project Controls',
    shortLabel: 'Project Controls',
    proficiency: 68,
    educationHours: 80,
    certificationHours: 70,
    apprenticeshipHours: 60,
  },
];

const SKILLS_EXPERIENCE_OPTIONS = demoEmployeeTalentCards.map(card => ({
  id: card.id,
  label: card.name,
}));

const RealTimeResumePage: React.FC = () => {
  const { userName } = useAuth();
  const profile = useMemo(() => readStoredProfile(userName), [userName]);
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);
  const [activeMetricId, setActiveMetricId] = useState<ResumeMetricId | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const displayName = useMemo(() => {
    const full = `${defaultLoggedInEmployee.firstName || ''} ${defaultLoggedInEmployee.lastName || ''}`.trim();
    return profile.displayName.trim() || full || defaultLoggedInEmployee.displayName;
  }, [profile.displayName]);

  const activeBadge = useMemo(
    () => defaultLoggedInEmployee.resume.badges.find(badge => badge.id === activeBadgeId) ?? null,
    [activeBadgeId]
  );

  const activeMetric = useMemo(
    () => RESUME_METRICS.find(metric => metric.id === activeMetricId) ?? null,
    [activeMetricId]
  );

  const activeMetricDetail = activeMetricId
    ? defaultLoggedInEmployee.resume.metricDetails[activeMetricId]
    : null;

  const formatBadgeDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[month - 1]} ${day}, ${year}`;
  };

  const shareToplatform = async (platform: string) => {
    if (!activeBadge) return;
    const text = `I just earned the "${activeBadge.label}" badge on Reign!`;
    const url = 'https://reign-career-companion.vercel.app';
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'x':
        window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'instagram':
      case 'messages':
        if (navigator.share) {
          try { await navigator.share({ title: activeBadge.label, text, url }); } catch { /* cancelled */ }
        }
        break;
    }
    setShareOpen(false);
  };

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

          <SkillsInventoryChart
            nodes={SKILLS_INVENTORY_NODES}
            experienceOptions={SKILLS_EXPERIENCE_OPTIONS}
          />

          <section className="resume-metrics-grid" aria-label="Career metrics">
            {RESUME_METRICS.map(metric => (
              <button
                key={metric.id}
                type="button"
                className={`resume-metric ${metric.className}`}
                onClick={() => setActiveMetricId(metric.id)}
                aria-label={`Open ${metric.label} details`}
              >
                <span className="resume-metric__icon" aria-hidden="true">
                  <IonIcon icon={metric.icon} />
                </span>
                <div className="resume-metric__body">
                  <span className="resume-metric__label">{metric.label}</span>
                  <strong className="resume-metric__value">{metric.value}</strong>
                </div>
              </button>
            ))}
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

      <IonModal isOpen={Boolean(activeMetric)} onDidDismiss={() => setActiveMetricId(null)}>
        {activeMetric && activeMetricDetail ? (
          <div className={`metric-detail-content metric-detail-content--${activeMetric.id}`}>
            <button
              className="metric-detail-close"
              onClick={() => setActiveMetricId(null)}
              aria-label="Close metric details"
            >
              <IonIcon icon={closeOutline} />
            </button>

            <div className="metric-detail-hero">
              <span className="metric-detail-hero__icon" aria-hidden="true">
                <IonIcon icon={activeMetric.icon} />
              </span>
              <p className="metric-detail-hero__label">{activeMetric.label}</p>
              <p className="metric-detail-hero__value">{activeMetric.value}</p>
            </div>

            <div className="metric-detail-body">
              <p className="metric-detail-summary">{activeMetricDetail.summary}</p>

              {activeMetricDetail.insight ? (
                <div className="metric-detail-insight">
                  <span className="metric-detail-insight__tag">Insight</span>
                  <p>{activeMetricDetail.insight}</p>
                </div>
              ) : null}

              <div className="metric-detail-timeline">
                <h3 className="metric-detail-timeline__title">Over time</h3>
                <ol className="metric-detail-timeline__list">
                  {activeMetricDetail.timeline.map((entry, index) => (
                    <li key={`${entry.period}-${index}`} className="metric-detail-timeline__item">
                      <span className="metric-detail-timeline__dot" aria-hidden="true" />
                      <div className="metric-detail-timeline__card">
                        <div className="metric-detail-timeline__row">
                          <span className="metric-detail-timeline__period">{entry.period}</span>
                          <span className="metric-detail-timeline__value">{entry.value}</span>
                        </div>
                        {entry.note ? <p className="metric-detail-timeline__note">{entry.note}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        ) : null}
      </IonModal>

      <IonModal isOpen={Boolean(activeBadge)} onDidDismiss={() => { setActiveBadgeId(null); setShareOpen(false); }}>
        {activeBadge ? (
          <div className="badge-modal-content">
            {/* ── Action buttons ── */}
            <button className="badge-modal-share" onClick={() => setShareOpen(v => !v)} aria-label="Share badge">
              <IonIcon icon={shareOutline} />
            </button>
            <button className="badge-modal-close" onClick={() => setActiveBadgeId(null)} aria-label="Close badge">
              <IonIcon icon={closeOutline} />
            </button>

            {/* ── Badge image ── */}
            <div className="badge-modal-image-wrap">
              <img src={activeBadge.fullUrl} alt={activeBadge.label} />
            </div>

            {/* ── Badge info ── */}
            <div className="badge-modal-info">
              <h2 className="badge-modal-label">{activeBadge.label}</h2>
              <p className="badge-modal-description">{activeBadge.description}</p>
              <div className="badge-modal-meta">
                <div className="badge-meta-row">
                  <span className="badge-meta-key">Awarded by</span>
                  <span className="badge-meta-val">{activeBadge.awardedBy === 'System' ? 'System (auto)' : activeBadge.awardedBy}</span>
                </div>
                <div className="badge-meta-row">
                  <span className="badge-meta-key">Date awarded</span>
                  <span className="badge-meta-val">{formatBadgeDate(activeBadge.awardedAt)}</span>
                </div>
                <div className="badge-meta-row">
                  <span className="badge-meta-key">Times earned</span>
                  <span className="badge-meta-val">{activeBadge.awardCount}×</span>
                </div>
              </div>
            </div>

            {/* ── Share panel ── */}
            {shareOpen && (
              <div className="badge-share-panel">
                <p className="badge-share-title">Share this badge</p>
                <div className="badge-share-platforms">
                  <button className="badge-share-platform" onClick={() => shareToplatform('facebook')} aria-label="Share to Facebook">
                    <span className="badge-share-icon" style={{ background: '#1877f2' }}><IonIcon icon={logoFacebook} /></span>
                    <span>Facebook</span>
                  </button>
                  <button className="badge-share-platform" onClick={() => shareToplatform('x')} aria-label="Share to X">
                    <span className="badge-share-icon" style={{ background: '#000' }}>𝕏</span>
                    <span>X</span>
                  </button>
                  <button className="badge-share-platform" onClick={() => shareToplatform('instagram')} aria-label="Share to Instagram">
                    <span className="badge-share-icon badge-share-icon--ig"><IonIcon icon={logoInstagram} /></span>
                    <span>Instagram</span>
                  </button>
                  <button className="badge-share-platform" onClick={() => shareToplatform('linkedin')} aria-label="Share to LinkedIn">
                    <span className="badge-share-icon" style={{ background: '#0a66c2' }}><IonIcon icon={logoLinkedin} /></span>
                    <span>LinkedIn</span>
                  </button>
                  <button className="badge-share-platform" onClick={() => shareToplatform('messages')} aria-label="Share via Messages">
                    <span className="badge-share-icon" style={{ background: '#30d158' }}>✉</span>
                    <span>Messages</span>
                  </button>
                </div>
                <button className="badge-share-cancel" onClick={() => setShareOpen(false)}>Cancel</button>
              </div>
            )}
          </div>
        ) : null}
      </IonModal>
    </IonPage>
  );
};

export default RealTimeResumePage;
