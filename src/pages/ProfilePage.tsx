import { IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  addOutline,
  cameraOutline,
  chatbubbleEllipsesOutline,
  copyOutline,
  mailOutline,
  qrCodeOutline,
  trashOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { demoEmployeeTalentCards } from '../data/talentCards';
import './ProfilePage.css';

type EditableProfile = {
  headshotDataUrl: string;
  bio: string;
  phones: string[];
  emails: string[];
  linkedIn: string;
  portfolioUrl: string;
};

const PROFILE_STORAGE_KEY = 'reign_profile_data_v1';

const defaultProfile = (userName: string): EditableProfile => ({
  headshotDataUrl: '',
  bio: `${userName || 'Demo employee'} is building a strong cross-functional digital product and engineering path.`,
  phones: [''],
  emails: [''],
  linkedIn: '',
  portfolioUrl: ''
});

const ProfilePage: React.FC = () => {
  const { userName } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<EditableProfile>(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as EditableProfile;
      } catch {
        return defaultProfile(userName);
      }
    }
    return defaultProfile(userName);
  });
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const displayName = useMemo(() => userName || 'Demo Employee', [userName]);
  const profileLink = useMemo(
    () => `${window.location.origin}/profile/${encodeURIComponent(displayName.toLowerCase().replace(/\s+/g, '-'))}`,
    [displayName]
  );
  const qrCodeSrc = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(profileLink)}`,
    [profileLink]
  );

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
            <h1>Profile</h1>
            <p>Manage your headshot, bio, contact info, and share settings.</p>
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
              Portfolio URL
              <input
                value={profile.portfolioUrl}
                onChange={event => setProfile(current => ({ ...current, portfolioUrl: event.target.value }))}
                placeholder="https://portfolio.example.com"
              />
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onHeadshotSelected}
              style={{ display: 'none' }}
            />
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
