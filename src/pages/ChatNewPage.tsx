import React, { useMemo, useRef, useState } from 'react';
import { IonContent, IonPage, IonIcon, isPlatform } from '@ionic/react';
import {
  addOutline,
  attachOutline,
  cameraOutline,
  chevronBackOutline,
  imagesOutline,
  peopleOutline,
  personAddOutline,
  saveOutline,
  sendOutline,
  timeOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { DEMO_EMPLOYEES } from '../data/employees';
import './ChatPage.css';

const isIOS = isPlatform('ios') || /iphone|ipad|ipod/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : ''
);

const ChatNewPage: React.FC = () => {
  const history = useHistory();
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Add recipients and compose your message.');
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [includeEmployees, setIncludeEmployees] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recipientFocused, setRecipientFocused] = useState(false);

  const matchingEmployees = useMemo(() => {
    const query = recipient.trim().toLowerCase();
    if (!query) return [];

    return DEMO_EMPLOYEES
      .filter(employee =>
        employee.firstName.toLowerCase().includes(query) ||
        employee.lastName.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [recipient]);

  const onRecipientChange = (nextValue: string) => {
    setRecipient(nextValue);
    setRecipientFocused(true);
  };

  const runDemoAction = (label: string, callback?: () => void) => {
    setStatus(`${label} configured for demo.`);
    callback?.();
  };

  return (
    <IonPage className={`chat-page ${isIOS ? 'chat-ios' : 'chat-android'}`}>
      <IonContent scrollY={false}>
        <div className="chat-root">
          <div className="chat-panel panel-enter">

            <div className="chat-list-header">
              <div className="chat-list-title-row">
                <button className="back-btn" onClick={() => history.goBack()}>
                  <IonIcon icon={chevronBackOutline} />
                  {isIOS && <span>Back</span>}
                </button>
                <h1 className="chat-list-title" style={{ fontSize: '1.1rem' }}>New Message</h1>
                <span style={{ width: 60 }} />
              </div>
            </div>

            <div className="new-chat-compose-body">
              <div className="new-chat-top-options">
                <button
                  className={`new-chat-action-btn${isGroupMessage ? ' active' : ''}`}
                  onClick={() => {
                    setIsGroupMessage(v => !v);
                    runDemoAction('Group message');
                  }}
                >
                  <IonIcon icon={peopleOutline} />
                  <span>Add Message to a Group</span>
                </button>
                <button
                  className={`new-chat-action-btn${includeEmployees ? ' active' : ''}`}
                  onClick={() => {
                    setIncludeEmployees(v => !v);
                    runDemoAction('Employees added');
                  }}
                >
                  <IonIcon icon={personAddOutline} />
                  <span>Add Employees to Message</span>
                </button>
              </div>

              <div className="new-chat-field">
                <label className="new-chat-label">Recipient</label>
                <input
                  ref={recipientInputRef}
                  className="new-chat-input"
                  placeholder="Type first few characters..."
                  value={recipient}
                  onChange={e => onRecipientChange(e.target.value)}
                  onFocus={() => setRecipientFocused(true)}
                  onBlur={() => setTimeout(() => setRecipientFocused(false), 120)}
                  autoFocus
                />
                {recipientFocused && matchingEmployees.length > 0 && (
                  <div className="new-chat-recipient-dropdown">
                    {matchingEmployees.map(employee => (
                      <button
                        key={employee.id}
                        className="new-chat-recipient-option"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setRecipient(employee.name);
                          setRecipientFocused(false);
                        }}
                      >
                        <span className="new-chat-recipient-name">{employee.name}</span>
                        <span className="new-chat-recipient-role">{employee.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="new-chat-field">
                <label className="new-chat-label">Message</label>
                <textarea
                  className="new-chat-message-area"
                  placeholder="Write your message..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="new-chat-plus-wrap">
                <button
                  className={`new-chat-plus-btn${menuOpen ? ' open' : ''}`}
                  onClick={() => setMenuOpen(v => !v)}
                  aria-label="Open compose actions"
                >
                  <IonIcon icon={addOutline} />
                </button>
                <span className="new-chat-plus-label">Compose actions</span>

                {menuOpen && (
                  <div className="new-chat-plus-menu">
                    <button
                      className="new-chat-plus-menu-item"
                      onClick={() => {
                        runDemoAction('Add photos', () => photoRef.current?.click());
                        setMenuOpen(false);
                      }}
                    >
                      <IonIcon icon={imagesOutline} />
                      <span>Add Photos</span>
                    </button>
                    <button
                      className="new-chat-plus-menu-item"
                      onClick={() => {
                        runDemoAction('Add files', () => fileRef.current?.click());
                        setMenuOpen(false);
                      }}
                    >
                      <IonIcon icon={attachOutline} />
                      <span>Add Files</span>
                    </button>
                    <button
                      className="new-chat-plus-menu-item"
                      onClick={() => {
                        runDemoAction('Take photo', () => cameraRef.current?.click());
                        setMenuOpen(false);
                      }}
                    >
                      <IonIcon icon={cameraOutline} />
                      <span>Take Photo</span>
                    </button>
                    <button
                      className={`new-chat-plus-menu-item${saveAsDraft ? ' active' : ''}`}
                      onClick={() => {
                        setSaveAsDraft(v => !v);
                        runDemoAction('Draft mode');
                        setMenuOpen(false);
                      }}
                    >
                      <IonIcon icon={saveOutline} />
                      <span>Save as Draft</span>
                    </button>
                    <button
                      className={`new-chat-plus-menu-item${scheduleEnabled ? ' active' : ''}`}
                      onClick={() => {
                        setScheduleEnabled(v => !v);
                        runDemoAction('Scheduled send');
                        setMenuOpen(false);
                      }}
                    >
                      <IonIcon icon={timeOutline} />
                      <span>Scheduled Send</span>
                    </button>
                  </div>
                )}
              </div>

              {scheduleEnabled && (
                <div className="new-chat-field">
                  <label className="new-chat-label">Send At</label>
                  <input
                    className="new-chat-input"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                </div>
              )}

              <div className="new-chat-status">{status}</div>

              <button
                className="new-chat-send-btn"
                onClick={() => setStatus('Demo message ready to send.')}
                disabled={!recipient.trim() || !message.trim()}
              >
                <IonIcon icon={sendOutline} />
                <span>Send Message</span>
              </button>

              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} />
              <input ref={photoRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} />
              <input ref={fileRef} type="file" accept="*/*" style={{ display: 'none' }} />
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ChatNewPage;
