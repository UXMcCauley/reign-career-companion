import { useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonPage, IonIcon, isPlatform, useIonViewWillEnter } from '@ionic/react';
import {
  addOutline,
  attachOutline,
  cameraOutline,
  chevronBackOutline,
  imagesOutline,
  peopleOutline,
  saveOutline,
  sendOutline,
  timeOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { composeMessage, loadEmployees } from '../data/blobStorage';
import { DEMO_EMPLOYEES, initialsFromName } from '../data/employees';
import type { Message } from '../data/chatTypes';
import { ensureNotificationPermission } from '../lib/notifications';
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

  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('Add recipients and compose your message.');
  const [isGroupMessage, setIsGroupMessage] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recipientFocused, setRecipientFocused] = useState(false);
  const [employees, setEmployees] = useState(DEMO_EMPLOYEES);

  // Reset the compose form every time this view is entered so a previously sent
  // recipient never carries over. Honors a ?recipient= deep link if present.
  useIonViewWillEnter(() => {
    const recipientName = new URLSearchParams(window.location.search).get('recipient')?.trim();
    setSelectedRecipients(recipientName ? [recipientName] : []);
    setRecipientQuery('');
    setMessage('');
    setIsGroupMessage(false);
    setSaveAsDraft(false);
    setScheduleEnabled(false);
    setScheduledAt('');
    setMenuOpen(false);
    setRecipientFocused(false);
    setStatus(
      recipientName
        ? `Message draft started with ${recipientName}.`
        : 'Add recipients and compose your message.'
    );
  });

  const matchingEmployees = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    if (!query) return [];

    return employees
      .filter(employee => !selectedRecipients.includes(employee.name))
      .filter(employee =>
        employee.firstName.toLowerCase().includes(query) ||
        employee.lastName.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [recipientQuery, selectedRecipients, employees]);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadEmployees();
      if (active && loaded.length > 0) setEmployees(loaded);
    })();
    return () => {
      active = false;
    };
  }, []);

  const onRecipientChange = (nextValue: string) => {
    setRecipientQuery(nextValue);
    setRecipientFocused(true);
  };

  const addRecipient = (name: string) => {
    setSelectedRecipients(prev => (prev.includes(name) ? prev : [...prev, name]));
    setRecipientQuery('');
    setRecipientFocused(false);
  };

  const removeRecipient = (name: string) => {
    setSelectedRecipients(prev => prev.filter(item => item !== name));
  };

  const chipColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash << 5) - hash + name.charCodeAt(i);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 75% 55%)`;
  };

  const runDemoAction = (label: string, callback?: () => void) => {
    setStatus(`${label} configured for demo.`);
    callback?.();
  };

  const handleSend = async () => {
    const text = message.trim();
    if (selectedRecipients.length === 0 || !text) return;

    // Request notification permission now, while we still have the user's tap.
    void ensureNotificationPermission();

    const isGroup = isGroupMessage || selectedRecipients.length > 1;
    const myMessage: Message = { id: `${Date.now()}-me`, text, sender: 'me', ts: Date.now() };

    setStatus('Sending...');

    // Appends to an existing thread with the same recipient(s) when one exists,
    // otherwise creates a new conversation.
    const { id } = await composeMessage({
      recipientNames: selectedRecipients,
      isGroup,
      message: myMessage,
      createConversation: newId => ({
        id: newId,
        name: isGroup ? selectedRecipients.join(', ') : selectedRecipients[0],
        role: isGroup ? `Group · ${selectedRecipients.length} members` : 'Direct message',
        initials: initialsFromName(selectedRecipients[0]),
        color: chipColor(selectedRecipients[0]),
        type: isGroup ? 'group' : 'dm',
        pinned: false,
        muted: false,
        archived: false,
        unread: 0,
        messages: [myMessage],
      }),
    });

    // Open the thread in the chat page, reload from storage, and let it reply.
    history.push('/chat', { openConvId: id, reload: true, autoReply: true });
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
              <div className="new-chat-field">
                <label className="new-chat-label">Recipient</label>
                <div className="new-chat-recipient-input-wrap">
                  {selectedRecipients.map(name => (
                    <div key={name} className="new-chat-recipient-chip">
                      <span
                        className="new-chat-recipient-chip-dot"
                        style={{ background: chipColor(name) }}
                      />
                      <span className="new-chat-recipient-chip-name">{name}</span>
                      <button
                        className="new-chat-recipient-chip-remove"
                        onClick={() => removeRecipient(name)}
                        aria-label={`Remove ${name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <input
                    ref={recipientInputRef}
                    className="new-chat-chip-input"
                    placeholder={selectedRecipients.length ? 'Add another...' : 'Type first or last name...'}
                    value={recipientQuery}
                    onChange={e => onRecipientChange(e.target.value)}
                    onFocus={() => setRecipientFocused(true)}
                    onBlur={() => setTimeout(() => setRecipientFocused(false), 120)}
                    autoFocus
                  />
                </div>
                {recipientFocused && matchingEmployees.length > 0 && (
                  <div className="new-chat-recipient-dropdown">
                    {matchingEmployees.map(employee => (
                      <button
                        key={employee.id}
                        className="new-chat-recipient-option"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          addRecipient(employee.name);
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
                <button
                  className={`new-chat-action-chip${isGroupMessage ? ' active' : ''}`}
                  onClick={() => {
                    setIsGroupMessage(v => !v);
                    runDemoAction('Group message');
                  }}
                >
                  <IonIcon icon={peopleOutline} />
                  <span>+ Group</span>
                </button>
                <button
                  className="new-chat-inline-send-btn"
                  onClick={() => void handleSend()}
                  disabled={selectedRecipients.length === 0 || !message.trim()}
                >
                  <IonIcon icon={sendOutline} />
                  <span>Send</span>
                </button>

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
