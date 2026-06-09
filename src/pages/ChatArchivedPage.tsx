import React, { useState, useRef } from 'react';
import { IonContent, IonPage, IonIcon, isPlatform } from '@ionic/react';
import { archiveOutline, chevronBackOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { loadChats, saveChats } from '../data/blobStorage';
import type { Conversation } from '../data/chatTypes';
import './ChatPage.css';

const isIOS = isPlatform('ios') || /iphone|ipad|ipod/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : ''
);

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const diffDays = Math.floor((Date.now() - ts) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const ChatArchivedPage: React.FC = () => {
  const history = useHistory();
  const [convs, setConvs] = useState<Conversation[]>([]);

  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchX = useRef(0);
  const touchY = useRef(0);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const all = await loadChats(() => []);
      if (!active) return;
      setConvs(all.filter(c => c.archived));
    })();
    return () => {
      active = false;
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (id: string, e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx < -60) setSwipedId(id);
    else if (dx > 20) setSwipedId(null);
  };

  const unarchiveConv = (id: string) => {
    void (async () => {
      const all = await loadChats(() => []);
      const updated = all.map(c => c.id === id ? { ...c, archived: false } : c);
      await saveChats(updated);
    })();
    setConvs(prev => prev.filter(c => c.id !== id));
    setSwipedId(null);
    history.push('/chat');
  };

  const openConv = (id: string) => {
    if (swipedId) { setSwipedId(null); return; }
    history.push('/chat', { openConvId: id });
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
                <h1 className="chat-list-title" style={{ fontSize: '1.1rem' }}>Archived</h1>
                <span style={{ width: 60 }} />
              </div>
            </div>

            <div
              className="chat-list-body"
              onClick={() => swipedId && setSwipedId(null)}
            >
              {convs.length === 0 ? (
                <div className="conv-empty">
                  <p>No archived conversations yet.</p>
                  <p style={{ marginTop: 6, fontSize: '0.78rem', opacity: 0.6 }}>
                    Swipe left on any chat and tap Archive to move it here.
                  </p>
                </div>
              ) : (
                convs.map(conv => {
                  const last = conv.messages[conv.messages.length - 1];
                  const preview = last
                    ? last.sender === 'me' ? `You: ${last.text}` : last.text
                    : '';
                  const isSwiped = swipedId === conv.id;

                  return (
                    <div key={conv.id} className="conv-swipe-wrap conv-swipe-wrap--single">
                      <div className="conv-actions">
                        <button
                          className="conv-action conv-action--unarchive"
                          onClick={() => unarchiveConv(conv.id)}
                        >
                          <IonIcon icon={archiveOutline} />
                          <span>Unarchive</span>
                        </button>
                      </div>

                      <button
                        className={`conv-row${isSwiped ? ' swiped-single' : ''}`}
                        onClick={() => openConv(conv.id)}
                        onTouchStart={onTouchStart}
                        onTouchEnd={e => onTouchEnd(conv.id, e)}
                      >
                        <div className="chat-avatar" style={{ background: conv.color }}>
                          {conv.initials}
                        </div>
                        <div className="conv-body">
                          <div className="conv-top">
                            <span className="conv-name">{conv.name}</span>
                            <div className="conv-top-right">
                              {last && <span className="conv-time">{formatTime(last.ts)}</span>}
                            </div>
                          </div>
                          <div className="conv-bottom">
                            <span className="conv-preview">{preview}</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ChatArchivedPage;
