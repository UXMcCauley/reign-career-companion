import { IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  addOutline,
  cameraOutline,
  chatbubbleEllipsesOutline,
  checkmarkOutline,
  closeOutline,
  copyOutline,
  eyeOutline,
  mailOutline,
  qrCodeOutline,
  trashOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PROFILE_STORAGE_KEY, readStoredProfile, type EditableProfile } from '../data/profileData';
import { demoEmployeeTalentCards } from '../data/talentCards';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const history = useHistory();
  const { userName } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<EditableProfile>(() => readStoredProfile(userName));
  const [savedProfile, setSavedProfile] = useState<EditableProfile>(() => readStoredProfile(userName));
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const displayName = useMemo(() => userName || 'Demo Employee', [userName]);
  const profileSlug = useMemo(() => encodeURIComponent(displayName.toLowerCase().replace(/\s+/g, '-')), [displayName]);
  const shareBaseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/, '');
  const profileLink = useMemo(
    () => `${shareBaseUrl}/profile/public/${profileSlug}`,
    [profileSlug, shareBaseUrl]
  );
  const qrCodeSrc = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(profileLink)}`,
    [profileLink]
  );
  const hasChanges = useMemo(() => JSON.stringify(profile) !== JSON.stringify(savedProfile), [profile, savedProfile]);

  const updatePhone = (index: number, value: string) => {
    setProfile(current => ({
      ...current,
      phones: current.phones.map((phone, i) => (i === index ? value : phone))
    }));
  };

  const addPhone = () => {
    setProfile(current => ({ ...current, phones: [...current.phones, ''] }));
  };

  const removePhone = (index: number) => {
    setProfile(current => ({
      ...current,
      phones: current.phones.length === 1 ? [''] : current.phones.filter((_, i) => i !== index)
    }));
  };

  const updateEmail = (index: number, value: string) => {
    setProfile(current => ({
      ...current,
      emails: current.emails.map((email, i) => (i === index ? value : email))
    }));
  };

  const addEmail = () => {
    setProfile(current => ({ ...current, emails: [...current.emails, ''] }));
  };

  const removeEmail = (index: number) => {
    setProfile(current => ({
      ...current,
      emails: current.emails.length === 1 ? [''] : current.emails.filter((_, i) => i !== index)
    }));
  };

  const onChooseHeadshot = () => {
    fileInputRef.current?.click();
  };

  const onHeadshotSelected: React.ChangeEventHandler<HTMLInputElement> = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile(current => ({ ...current, headshotDataUrl: String(reader.result ?? '') }));
      setFeedback('Headshot updated');
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    setSavedProfile(profile);
    setFeedback('Profile saved');
  };

  const closeProfile = () => {
    history.push('/dashboard');
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(profileLink);
      setFeedback('Link copied');
    } catch {
      setFeedback('Could not copy link');
    }
  };

  const shareViaMessages = () => {
    window.open(`sms:?&body=${encodeURIComponent(`Check out my profile: ${profileLink}`)}`, '_blank');
  };

  const shareViaEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`${displayName} profile`)}&body=${encodeURIComponent(
      `Take a look at my profile: ${profileLink}`
    )}`;
  };

  return (
    <IonPage className="profile-page">
      <IonContent fullscreen>
        <div className="profile-scene">
          <header className="profile-header">
            <div className="profile-header-top">
              <h1>Profile</h1>
              <button className="profile-close-btn" onClick={closeProfile} aria-label="Close profile editor">
                <IonIcon icon={closeOutline} />
              </button>
            </div>
            <p>Manage your headshot, bio, contact info, and share settings.</p>
            <button className="public-profile-link" onClick={() => history.push(`/profile/public/${profileSlug}`)}>
              <IonIcon icon={eyeOutline} />
              View public profile experience
            </button>
          </header>

          <section className="profile-card">
            <div className="headshot-row">
              <button className="headshot-btn" onClick={onChooseHeadshot} aria-label="Upload headshot">
                {profile.headshotDataUrl ? (
                  <img src={profile.headshotDataUrl} alt={`${displayName} headshot`} />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
                <div className="headshot-overlay">
                  <IonIcon icon={cameraOutline} />
                  <small>Upload</small>
                </div>
              </button>
              <div>
                <h2>{displayName}</h2>
                <p>Demo employee profile</p>
              </div>
            </div>

            <label className="profile-label">
              Personal bio
              <textarea
                value={profile.bio}
                onChange={event => setProfile(current => ({ ...current, bio: event.target.value }))}
                rows={4}
                placeholder="Write a short intro..."
              />
            </label>

            <div className="profile-field-group">
              <div className="group-head">
                <h3>Phone numbers</h3>
                <button onClick={addPhone} className="inline-action-btn" aria-label="Add phone number">
                  <IonIcon icon={addOutline} /> Add
                </button>
              </div>
              {profile.phones.map((phone, index) => (
                <div key={`phone-${index}`} className="list-edit-row">
                  <input
                    value={phone}
                    onChange={event => updatePhone(index, event.target.value)}
                    placeholder="(555) 000-0000"
                  />
                  <button onClick={() => removePhone(index)} aria-label="Remove phone number">
                    <IonIcon icon={trashOutline} />
                  </button>
                </div>
              ))}
            </div>

            <div className="profile-field-group">
              <div className="group-head">
                <h3>Emails</h3>
                <button onClick={addEmail} className="inline-action-btn" aria-label="Add email">
                  <IonIcon icon={addOutline} /> Add
                </button>
              </div>
              {profile.emails.map((email, index) => (
                <div key={`email-${index}`} className="list-edit-row">
                  <input
                    type="email"
                    value={email}
                    onChange={event => updateEmail(index, event.target.value)}
                    placeholder="name@example.com"
                  />
                  <button onClick={() => removeEmail(index)} aria-label="Remove email">
                    <IonIcon icon={trashOutline} />
                  </button>
                </div>
              ))}
            </div>

            <label className="profile-label">
              LinkedIn URL
              <input
                value={profile.linkedIn}
                onChange={event => setProfile(current => ({ ...current, linkedIn: event.target.value }))}
                placeholder="https://linkedin.com/in/your-profile"
              />
            </label>
            <label className="profile-label">
              LinkedIn custom title (optional)
              <input
                value={profile.linkedInTitle}
                onChange={event => setProfile(current => ({ ...current, linkedInTitle: event.target.value }))}
                placeholder="e.g. My LinkedIn Profile"
              />
            </label>

            <label className="profile-label">
              Portfolio URL
              <input
                value={profile.portfolioUrl}
                onChange={event => setProfile(current => ({ ...current, portfolioUrl: event.target.value }))}
                placeholder="https://portfolio.example.com"
              />
            </label>
            <label className="profile-label">
              Portfolio custom title (optional)
              <input
                value={profile.portfolioTitle}
                onChange={event => setProfile(current => ({ ...current, portfolioTitle: event.target.value }))}
                placeholder="e.g. Product Case Studies"
              />
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onHeadshotSelected}
              style={{ display: 'none' }}
            />

            <div className="profile-actions">
              <button
                className={`profile-save-btn${hasChanges ? ' active' : ''}`}
                onClick={saveProfile}
                disabled={!hasChanges}
              >
                <IonIcon icon={checkmarkOutline} />
                Save Changes
              </button>
            </div>
          </section>

          <section className="profile-card">
            <h3 className="section-title">Assigned talent cards</h3>
            <div className="talent-chip-list">
              {demoEmployeeTalentCards.map(card => (
                <span key={card.id} className="talent-chip">
                  {card.initials} - {card.name}
                </span>
              ))}
            </div>
          </section>

          <section className="profile-card">
            <h3 className="section-title">Share profile</h3>
            <p className="share-intro">
              Share by link, direct message, email, or have someone scan your QR code from this screen.
            </p>
            <div className="share-button-grid">
              <button onClick={copyShareLink}>
                <IonIcon icon={copyOutline} />
                Copy Link
              </button>
              <button onClick={shareViaMessages}>
                <IonIcon icon={chatbubbleEllipsesOutline} />
                Message
              </button>
              <button onClick={shareViaEmail}>
                <IonIcon icon={mailOutline} />
                Email
              </button>
              <a href={profileLink} target="_blank" rel="noreferrer">
                <IonIcon icon={qrCodeOutline} />
                Open Link
              </a>
            </div>
            <div className="qr-wrap">
              <img src={qrCodeSrc} alt="Profile QR code" />
              <small>{profileLink}</small>
            </div>
          </section>
        </div>

        {feedback ? <div className="profile-feedback">{feedback}</div> : null}
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
