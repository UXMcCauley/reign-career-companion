import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { closeOutline, mailOutline, personCircleOutline } from 'ionicons/icons';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import { readStoredProfile } from '../data/profileData';
import { demoEmployeeTalentCards } from '../data/talentCards';
import './ProfilePage.css';

const PublicProfilePage: React.FC = () => {
  const history = useHistory();
  const { userName } = useAuth();
  const profile = useMemo(() => readStoredProfile(userName), [userName]);
  const displayName = useMemo(() => {
    const full = `${defaultLoggedInEmployee.firstName || ''} ${defaultLoggedInEmployee.lastName || ''}`.trim();
    return profile.displayName.trim() || full || userName || defaultLoggedInEmployee.displayName || 'Demo Employee';
  }, [profile.displayName, userName]);

  return (
    <IonPage className="profile-page">
      <IonContent fullscreen>
        <div className="profile-scene">
          <div className="public-preview-close-row">
            <button
              className="profile-close-btn"
              onClick={() => history.push('/profile')}
              aria-label="Close preview and return to profile editor"
            >
              <IonIcon icon={closeOutline} />
            </button>
          </div>

          <section className="profile-card">
            <div className="headshot-row">
              <div className="headshot-btn" aria-hidden>
                {profile.headshotDataUrl ? (
                  <img src={profile.headshotDataUrl} alt={`${displayName} headshot`} />
                ) : (
                  <IonIcon icon={personCircleOutline} />
                )}
              </div>
              <div>
                <h1 className="profile-identity-name">{displayName}</h1>
                <h2 className="profile-identity-role">{defaultLoggedInEmployee.roleTitle}</h2>
              </div>
            </div>
            <p className="share-intro">{profile.bio}</p>
          </section>

          <section className="profile-card">
            <h3 className="section-title">Contact</h3>
            <div className="talent-chip-list">
              {profile.emails.filter(Boolean).map(email => (
                <span key={email} className="talent-chip">
                  <IonIcon icon={mailOutline} /> {email}
                </span>
              ))}
              {profile.phones.filter(Boolean).map(phone => (
                <span key={phone} className="talent-chip">{phone}</span>
              ))}
            </div>
          </section>

          <section className="profile-card">
            <h3 className="section-title">Links</h3>
            <div className="public-plain-links">
              {profile.linkedIn ? (
                <a className="public-plain-link" href={profile.linkedIn} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              ) : null}
              {profile.portfolioUrl ? (
                <a className="public-plain-link" href={profile.portfolioUrl} target="_blank" rel="noreferrer">
                  {profile.portfolioTitle.trim() || profile.portfolioUrl}
                </a>
              ) : null}
            </div>
          </section>

          <section className="profile-card">
            <h3 className="section-title">Talent Cards</h3>
            <div className="talent-chip-list">
              {demoEmployeeTalentCards.map(card => (
                <span key={card.id} className="talent-chip">
                  {card.name}
                </span>
              ))}
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PublicProfilePage;
