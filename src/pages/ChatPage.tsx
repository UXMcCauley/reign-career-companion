import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonContent, IonPage, IonIcon, isPlatform, useIonActionSheet } from '@ionic/react';
import {
  addOutline, archiveOutline, attachOutline, cameraOutline,
  chevronBackOutline, chevronDownOutline, chevronForwardOutline, createOutline, imagesOutline, personAddOutline, pinOutline, searchOutline,
  sendOutline, volumeMuteOutline,
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { loadChats, loadEmployees, saveChats } from '../data/blobStorage';
import type { Conversation, Message } from '../data/chatTypes';
import { DEMO_EMPLOYEES, initialsFromName, type DemoEmployee } from '../data/employees';
import { ensureNotificationPermission, notifyIncomingMessage, onNotificationTap } from '../lib/notifications';
import { setChatUnreadFromConversations } from '../lib/chatUnread';
import './ChatPage.css';

const isIOS = isPlatform('ios') || /iphone|ipad|ipod/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : ''
);

const CONTACT_COLORS = ['#7b3fff', '#2e85ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#e87d30'];

function buildContacts(employees: DemoEmployee[]): Omit<Conversation, 'pinned' | 'muted' | 'archived' | 'messages' | 'unread'>[] {
  const employeeContacts = employees.slice(0, 7);
  return [
    {
      id: 'manager',
      name: employeeContacts[0]?.name ?? 'Store Manager',
      role: employeeContacts[0]?.role ?? 'Store Manager',
      initials: initialsFromName(employeeContacts[0]?.name ?? 'Store Manager'),
      color: CONTACT_COLORS[0],
      type: 'dm',
    },
    { id: 'coach',    name: 'REIGN AI Coach', role: 'Career assistant',    initials: 'AI', color: '#c840e8', type: 'dm'    },
    { id: 'team',     name: 'Team Channel',   role: '12 members',          initials: 'TC', color: '#46c9ff', type: 'group' },
    { id: 'hr',       name: 'HR Support',     role: 'Benefits & policies', initials: 'HR', color: '#00c875', type: 'dm'    },
    {
      id: 'prev-mgr',
      name: employeeContacts[1]?.name ?? 'Previous Manager',
      role: employeeContacts[1]?.role ?? 'Previous Manager',
      initials: initialsFromName(employeeContacts[1]?.name ?? 'Previous Manager'),
      color: CONTACT_COLORS[6],
      type: 'dm',
    },
    ...employeeContacts.slice(2).map((employee, idx) => ({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      initials: initialsFromName(employee.name),
      color: CONTACT_COLORS[(idx + 1) % CONTACT_COLORS.length],
      type: 'dm' as const,
    })),
  ];
}

const CONTACTS = buildContacts(DEMO_EMPLOYEES);

const AUTO_REPLIES: Record<string, string[]> = {
  manager: [
    "Thanks! I'll get back to you before end of shift.",
    "Got it — let's chat at the team meeting Thursday.",
    "No problem, I'll sort that out for you.",
    "Sounds great, appreciate you reaching out!",
  ],
  coach: [
    "Your metrics are trending up this week 📈 Keep it going!",
    "Based on your recent shifts, I'd focus on upsell volume.",
    "You're 3 milestones from your next badge! 🏆",
    "Great progress. Want me to build out a goal plan?",
  ],
  team: [
    "Anyone free for a shift swap this Saturday? 🙌",
    "Don't forget — training session at 2pm tomorrow!",
    "Great work everyone, solid numbers this week 💪",
    "Who's bringing snacks to the huddle? 😄",
  ],
  hr: [
    "Thanks for reaching out! We'll respond within 1–2 business days.",
    "Your request has been received and is being processed.",
    "Please check your email for the updated documentation.",
    "Feel free to reach out if you need anything else!",
  ],
};

// Fallback replies for newly created conversations that have no scripted pool.
const GENERIC_REPLIES = [
  "Hey! Thanks for the message 👋",
  "Got it — I'll take a look and get back to you shortly.",
  "Sounds good! Talk soon.",
  "Appreciate you reaching out 🙌",
  "Thanks! Let me check on that and circle back.",
];

// Delay before the simulated reply lands. Kept a few seconds long so you have
// time to background the app and see the notification arrive.
const REPLY_DELAY_MS = 3200;
const REPLY_JITTER_MS = 1200;

function makeSeedConversations(contacts: Omit<Conversation, 'pinned' | 'muted' | 'archived' | 'messages' | 'unread'>[] = CONTACTS): Conversation[] {
  const now = Date.now();
  return [
    {
      ...contacts[0], pinned: false, muted: false, archived: false, unread: 0,
      messages: [
        { id: 'm1', text: "Hey! Checking your availability for next week.", sender: 'other', ts: now - 86400000 * 2 },
        { id: 'm2', text: "I'm free Tuesday through Friday — Saturday works too!", sender: 'me', ts: now - 86400000 * 2 + 300000 },
        { id: 'm3', text: "Perfect, I'll get the schedule sorted. Thanks! 👍", sender: 'other', ts: now - 86400000 * 2 + 420000 },
      ],
    },
    {
      ...contacts[1], pinned: false, muted: false, archived: false, unread: 1,
      messages: [
        { id: 'c1', text: "Welcome back! Your streak is at 7 days. Keep it going 🔥", sender: 'other', ts: now - 3600000 },
      ],
    },
    {
      ...contacts[2], pinned: false, muted: false, archived: false, unread: 2,
      messages: [
        { id: 't1', text: "Team meeting today at 3pm — don't be late! 🕒", sender: 'other', ts: now - 7200000 },
        { id: 't2', text: "On my way! 👍", sender: 'me', ts: now - 7100000 },
        { id: 't3', text: "See everyone there! 🙌", sender: 'other', ts: now - 7000000 },
      ],
    },
    {
      ...contacts[3], pinned: false, muted: false, archived: false, unread: 0,
      messages: [
        { id: 'h1', text: "Your PTO request for Dec 24–26 has been approved ✅", sender: 'other', ts: now - 86400000 },
      ],
    },
    {
      ...contacts[4], pinned: false, muted: false, archived: true, unread: 0,
      messages: [
        { id: 'j1', text: "Thanks for all your hard work this quarter!", sender: 'other', ts: now - 86400000 * 14 },
        { id: 'j2', text: "Learned a lot from you. Thanks for the mentorship 🙏", sender: 'me', ts: now - 86400000 * 14 + 60000 },
        { id: 'j3', text: "Best of luck in the new role — stay in touch!", sender: 'other', ts: now - 86400000 * 14 + 120000 },
      ],
    },
  ];
}

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

type FilterTab = 'all' | 'dm' | 'group' | 'archived';
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',   label: 'All'    },
  { id: 'dm',    label: 'DMs'    },
  { id: 'group', label: 'Groups' },
  { id: 'archived', label: 'Archived' },
];

const DEFAULT_EMPLOYEES = DEMO_EMPLOYEES.slice(0, 10).map(employee => ({
  name: employee.name,
  role: employee.role,
}));

const ChatPage: React.FC = () => {
  const history  = useHistory();
  const location = useLocation<{ openConvId?: string; reload?: boolean; autoReply?: boolean }>();
  const [presentActionSheet] = useIonActionSheet();

  const [convs, setConvs]         = useState<Conversation[]>([]);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [typing, setTyping]       = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [sheetEmployees, setSheetEmployees] = useState(DEFAULT_EMPLOYEES);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<FilterTab>('all');
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);
  const [swipedId, setSwipedId]   = useState<string | null>(null);

  const msgEndRef   = useRef<HTMLDivElement>(null);
  const convsRef    = useRef<Conversation[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cameraRef   = useRef<HTMLInputElement>(null);
  const libraryRef  = useRef<HTMLInputElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const touchX      = useRef(0);
  const touchY      = useRef(0);

  const platformClass = isIOS ? 'chat-ios' : 'chat-android';
  const activeConv    = convs.find(c => c.id === activeId) ?? null;
  const totalUnread   = convs.reduce((n, c) => n + c.unread, 0);

  // Keep live refs so the delayed auto-reply reads the latest conversation state.
  convsRef.current = convs;
  activeIdRef.current = activeId;

  // Keep the floating tab bar's chat dot in sync with unread conversations.
  useEffect(() => {
    if (convs.length) setChatUnreadFromConversations(convs);
  }, [convs]);

  const archivedCount = convs.filter(c => c.archived).length;
  const filtered      = convs.filter(c => {
    const query = search.trim().toLowerCase();
    const isArchivedView = filter === 'archived';
    if (isArchivedView && !c.archived) return false;
    if (!isArchivedView && c.archived) return false;
    const lastText = c.messages[c.messages.length - 1]?.text ?? '';
    const matchSearch = !query ||
      c.name.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query) ||
      lastText.toLowerCase().includes(query);
    const matchFilter = filter === 'all' || filter === 'archived' || c.type === filter;
    return matchSearch && matchFilter;
  });
  const pinnedConvs   = filtered.filter(c => c.pinned);
  const unpinnedConvs = filtered.filter(c => !c.pinned);

  useEffect(() => {
    let active = true;
    (async () => {
      const loadedEmployees = await loadEmployees();
      const contactsForSeed = buildContacts(loadedEmployees.length ? loadedEmployees : DEMO_EMPLOYEES);
      const loadedConversations = await loadChats(() => makeSeedConversations(contactsForSeed));

      if (!active) return;

      setConvs(loadedConversations);
      if (loadedEmployees.length > 0) {
        const employeeOptions = loadedEmployees.slice(0, 10).map(employee => ({
          name: employee.name,
          role: employee.role,
        }));
        setSheetEmployees(employeeOptions);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    return () => clearTimeout(t);
  }, [activeId, convs]);

  // Tapping a chat notification opens that conversation and clears its unread count.
  useEffect(() => {
    onNotificationTap(conversationId => {
      setActiveId(conversationId);
      setConvs(prev => {
        const next = prev.map(c => (c.id === conversationId ? { ...c, unread: 0 } : c));
        void saveChats(next);
        return next;
      });
    });
  }, []);

  const persist = (nextConversations: Conversation[]) => {
    void saveChats(nextConversations);
  };

  // Open a conversation when returning from the archived or new-message pages.
  useEffect(() => {
    const state = location.state;
    const id = state?.openConvId;
    if (!id) return;

    (async () => {
      // A freshly composed chat was persisted elsewhere — pull it into state.
      let list = convsRef.current;
      if (state.reload) {
        list = await loadChats(() => makeSeedConversations(CONTACTS));
        setConvs(list);
      }
      setActiveId(id);
      setConvs(prev => {
        const next = prev.map(c => (c.id === id ? { ...c, unread: 0 } : c));
        persist(next);
        return next;
      });
      if (state.autoReply) triggerAutoReply(id, list.find(c => c.id === id));
      history.replace('/chat', {});
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const openConv = (id: string) => {
    if (swipedId) { setSwipedId(null); return; }
    setConvs(prev => {
      const next = prev.map(c => c.id === id ? { ...c, unread: 0 } : c);
      persist(next);
      return next;
    });
    setActiveId(id);
  };

  const goBack = useCallback(() => {
    setActiveId(null);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, []);

  // ── Swipe ──
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

  // ── Row actions ──
  const pinConv = (id: string) => {
    setConvs(prev => { const n = prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c); persist(n); return n; });
    setSwipedId(null);
  };

  const muteConv = (id: string) => {
    setConvs(prev => { const n = prev.map(c => c.id === id ? { ...c, muted: !c.muted } : c); persist(n); return n; });
    setSwipedId(null);
  };

  const archiveConv = (id: string) => {
    setConvs(prev => { const n = prev.map(c => c.id === id ? { ...c, archived: true, pinned: false } : c); persist(n); return n; });
    setSwipedId(null);
  };

  const restoreConv = (id: string) => {
    setConvs(prev => { const n = prev.map(c => c.id === id ? { ...c, archived: false } : c); persist(n); return n; });
    setSwipedId(null);
  };

  // ── Send ──
  // Schedules a simulated reply for a conversation, then fires a notification
  // for it (unless the chat is muted). Shared by manual sends and brand-new chats.
  // `fallbackConv` covers the brief window where a freshly created conversation
  // isn't in `convsRef` yet (its setConvs hasn't committed).
  const triggerAutoReply = useCallback((convId: string, fallbackConv?: Conversation) => {
    const pool    = AUTO_REPLIES[convId] ?? GENERIC_REPLIES;
    const replyTx = pool[Math.floor(Math.random() * pool.length)];
    const delay   = Math.round(REPLY_DELAY_MS + Math.random() * REPLY_JITTER_MS);

    // Hand the notification to the OS now (scheduled `delay` ms out) so it still
    // fires if the app is backgrounded/suspended before the reply "arrives".
    const conv = convsRef.current.find(c => c.id === convId) ?? fallbackConv;
    if (conv && !conv.muted) {
      void notifyIncomingMessage({ conversationId: convId, title: conv.name, body: replyTx, delayMs: delay });
    }

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply: Message = { id: `${Date.now()}-other`, text: replyTx, sender: 'other', ts: Date.now() };
      const isActiveThreadOpen = activeIdRef.current === convId;
      setConvs(prev => {
        const n = prev.map(c => {
          if (c.id !== convId) return c;
          // Only bump unread when the user isn't currently looking at the thread.
          const unread = isActiveThreadOpen ? c.unread : c.unread + 1;
          return { ...c, messages: [...c.messages, reply], unread };
        });
        persist(n);
        return n;
      });
    }, delay);
  }, []);

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text || !activeId || typing) return;
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Prompt for notification permission on the first send (a real user gesture).
    void ensureNotificationPermission();

    const myMsg: Message = { id: `${Date.now()}-me`, text, sender: 'me', ts: Date.now() };
    setConvs(prev => { const n = prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, myMsg] } : c); persist(n); return n; });

    triggerAutoReply(activeId);
  }, [inputText, activeId, typing, triggerAutoReply]);

  const handleMenuOption = (type: 'camera' | 'library' | 'file') => {
    setMenuOpen(false);
    if (type === 'camera')  cameraRef.current?.click();
    if (type === 'library') libraryRef.current?.click();
    if (type === 'file')    fileRef.current?.click();
  };

  const handleAddEmployee = () => {
    setMenuOpen(false);
    presentActionSheet({
      header: 'Add Employee to Chat',
      buttons: [
        ...sheetEmployees.map(emp => ({
          text: `${emp.name}  ·  ${emp.role}`,
          handler: () => {},
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  // Filter slider
  const filterIdx  = FILTER_TABS.findIndex(t => t.id === filter);
  const sliderLeft = filterIdx === 0 ? '3px' : `calc(${filterIdx} * 25%)`;

  const listClass   = activeId ? 'panel-exit-left' : 'panel-enter';
  const threadClass = activeId ? 'panel-enter'    : 'panel-exit-right';

  // ── Conversation row ──
  const renderRow = (conv: Conversation) => {
    const last     = conv.messages[conv.messages.length - 1];
    const preview  = last ? (last.sender === 'me' ? `You: ${last.text}` : last.text) : 'No messages yet';
    const isSwiped = swipedId === conv.id;
    const isArchivedThread = conv.archived;
    const query = search.trim();

    const renderHighlightedText = (text: string) => {
      if (!query) return text;
      const q = query.toLowerCase();
      const lower = text.toLowerCase();
      const nodes: React.ReactNode[] = [];
      let cursor = 0;
      let idx = lower.indexOf(q);

      while (idx !== -1) {
        if (idx > cursor) nodes.push(text.slice(cursor, idx));
        nodes.push(
          <mark key={`${conv.id}-${idx}`} className="conv-search-highlight">
            {text.slice(idx, idx + query.length)}
          </mark>
        );
        cursor = idx + query.length;
        idx = lower.indexOf(q, cursor);
      }

      if (cursor < text.length) nodes.push(text.slice(cursor));
      return nodes;
    };

    return (
      <div key={conv.id} className={`conv-swipe-wrap${isArchivedThread ? ' conv-swipe-wrap--single' : ''}`}>
        {/* Revealed actions */}
        <div className="conv-actions">
          {isArchivedThread ? (
            <button className="conv-action conv-action--unarchive" onClick={() => restoreConv(conv.id)}>
              <IonIcon icon={archiveOutline} />
              <span>Restore</span>
            </button>
          ) : (
            <>
              <button className="conv-action conv-action--pin" onClick={() => pinConv(conv.id)}>
                <IonIcon icon={pinOutline} />
                <span>{conv.pinned ? 'Unpin' : 'Pin'}</span>
              </button>
              <button className="conv-action conv-action--mute" onClick={() => muteConv(conv.id)}>
                <IonIcon icon={volumeMuteOutline} />
                <span>{conv.muted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button className="conv-action conv-action--archive" onClick={() => archiveConv(conv.id)}>
                <IonIcon icon={archiveOutline} />
                <span>Archive</span>
              </button>
            </>
          )}
        </div>

        {/* Slideable row */}
        <button
          className={`conv-row${isSwiped ? (isArchivedThread ? ' swiped-single' : ' swiped') : ''}`}
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
                {conv.pinned && <IonIcon icon={pinOutline}        className="conv-status-pin"  />}
                {conv.muted  && <IonIcon icon={volumeMuteOutline} className="conv-status-mute" />}
                {last && <span className="conv-time">{formatTime(last.ts)}</span>}
              </div>
            </div>
            <div className="conv-bottom">
              <span className={`conv-preview${conv.muted ? ' muted' : ''}`}>{renderHighlightedText(preview)}</span>
              {conv.unread > 0 && !conv.muted && <span className="conv-badge">{conv.unread}</span>}
            </div>
          </div>
        </button>
      </div>
    );
  };

  const renderSearch = (
    <div className="chat-search-row">
      <div className="chat-search-wrap">
        <IonIcon icon={searchOutline} className="chat-search-icon" />
        <input
          type="search"
          className="chat-search"
          placeholder="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <IonPage className={`chat-page ${platformClass}`}>
      <IonContent scrollY={false}>
        <div className="chat-root">

          {/* ── Conversation list ── */}
          <div className={`chat-panel chat-list-panel ${listClass}`}>

            <div className="chat-list-header">
              <div className="chat-list-title-row">
                <h1 className="chat-list-title">
                  Chats
                  {totalUnread > 0 && <span className="chat-unread-chip">{totalUnread}</span>}
                </h1>
                <span style={{ width: 40 }} />
              </div>
              {renderSearch}

              {/* Filter tabs — matching login page auth-tabs */}
              <div className="list-filter-tabs">
                <div
                  className="list-filter-slider"
                  style={{ left: sliderLeft, width: 'calc(25% - 3px)' }}
                />
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`list-filter-btn${filter === tab.id ? ' active' : ''}`}
                    onClick={() => setFilter(tab.id)}
                  >
                    {tab.label}
                    {tab.id === 'archived' && archivedCount > 0 && ` (${archivedCount})`}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="chat-list-body"
              onClick={() => swipedId && setSwipedId(null)}
            >
              {/* Pinned section */}
              {pinnedConvs.length > 0 && (
                <>
                  <button
                    className="conv-section-label conv-section-label--toggle"
                    onClick={() => setPinnedCollapsed(v => !v)}
                  >
                    <IonIcon icon={pinOutline} />
                    Pinned
                    <IonIcon icon={pinnedCollapsed ? chevronForwardOutline : chevronDownOutline} className="conv-collapse-icon" />
                  </button>
                  {!pinnedCollapsed && (
                    <>
                      {pinnedConvs.map(renderRow)}
                      <div className="conv-section-divider" />
                    </>
                  )}
                </>
              )}

              {unpinnedConvs.map(renderRow)}

              {filtered.length === 0 && (
                <div className="conv-empty">
                  <p>No conversations match "{search}"</p>
                </div>
              )}
            </div>

            <button className="new-message-fab" onClick={() => history.push('/chat/new')} aria-label="New chat">
              <IonIcon icon={createOutline} />
            </button>
          </div>

          {/* ── Thread view ── */}
          <div className={`chat-panel chat-thread-panel ${threadClass}`}>
            {activeConv && (
              <>
                <div className="thread-header">
                  <button className="back-btn" onClick={goBack}>
                    <IonIcon icon={chevronBackOutline} />
                    {isIOS && <span>Back</span>}
                  </button>
                  <div className="thread-contact">
                    <div className="chat-avatar chat-avatar--sm" style={{ background: activeConv.color }}>
                      {activeConv.initials}
                    </div>
                    <div>
                      <div className="thread-name">{activeConv.name}</div>
                      <div className="thread-role">{activeConv.role}</div>
                    </div>
                  </div>
                  <div className="thread-actions">
                    <button
                      className={`thread-action-btn${activeConv.pinned ? ' active' : ''}`}
                      onClick={() => pinConv(activeConv.id)}
                      aria-label={activeConv.pinned ? 'Unpin' : 'Pin'}
                    >
                      <IonIcon icon={pinOutline} />
                    </button>
                    <button
                      className={`thread-action-btn${activeConv.muted ? ' active' : ''}`}
                      onClick={() => muteConv(activeConv.id)}
                      aria-label={activeConv.muted ? 'Unmute' : 'Mute'}
                    >
                      <IonIcon icon={volumeMuteOutline} />
                    </button>
                    <button
                      className="thread-action-btn thread-action-btn--archive"
                      onClick={() => { archiveConv(activeConv.id); goBack(); }}
                      aria-label="Archive"
                    >
                      <IonIcon icon={archiveOutline} />
                    </button>
                  </div>
                </div>

                <div className="thread-messages">
                  {activeConv.messages.map((msg, i) => {
                    const prev       = activeConv.messages[i - 1];
                    const next       = activeConv.messages[i + 1];
                    const groupStart = !prev || prev.sender !== msg.sender;
                    const groupEnd   = !next || next.sender !== msg.sender;
                    const showAvatar = msg.sender === 'other' && groupStart;

                    return (
                      <div key={msg.id} className={`msg-row ${msg.sender}${groupStart ? ' group-start' : ''}`}>
                        {msg.sender === 'other' && (
                          <div
                            className={`chat-avatar chat-avatar--xs${showAvatar ? '' : ' ghost'}`}
                            style={{ background: showAvatar ? activeConv.color : 'transparent' }}
                          >
                            {showAvatar ? activeConv.initials : ''}
                          </div>
                        )}
                        <div className="bubble-stack">
                          <div className={`bubble ${msg.sender === 'me' ? 'bubble-me' : 'bubble-other'}${groupEnd ? ' tail' : ''}`}>
                            {msg.text}
                          </div>
                          {groupEnd && (
                            <div className={`msg-time ${msg.sender === 'me' ? 'time-right' : 'time-left'}`}>
                              {formatTime(msg.ts)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {typing && (
                    <div className="msg-row other group-start">
                      <div className="chat-avatar chat-avatar--xs" style={{ background: activeConv.color }}>
                        {activeConv.initials}
                      </div>
                      <div className="bubble bubble-other tail bubble-typing">
                        <span /><span /><span />
                      </div>
                    </div>
                  )}
                  <div ref={msgEndRef} />
                </div>

                <div className="thread-input-bar">
                  {menuOpen && <div className="attach-backdrop" onClick={() => setMenuOpen(false)} />}

                  <div className="attach-wrap">
                    {menuOpen && (
                      <div className="attach-menu">
                        <button className="attach-menu-item" onClick={() => handleMenuOption('camera')}>
                          <span className="attach-icon-wrap" style={{ background: 'linear-gradient(135deg, #7b3fff, #c840e8)' }}>
                            <IonIcon icon={cameraOutline} />
                          </span>
                          Take Photo
                        </button>
                        <button className="attach-menu-item" onClick={() => handleMenuOption('library')}>
                          <span className="attach-icon-wrap" style={{ background: 'linear-gradient(135deg, #c840e8, #ff47a9)' }}>
                            <IonIcon icon={imagesOutline} />
                          </span>
                          Photo Library
                        </button>
                        <button className="attach-menu-item" onClick={() => handleMenuOption('file')}>
                          <span className="attach-icon-wrap" style={{ background: 'linear-gradient(135deg, #2e85ff, #46c9ff)' }}>
                            <IonIcon icon={attachOutline} />
                          </span>
                          Attach File
                        </button>
                        <button className="attach-menu-item" onClick={handleAddEmployee}>
                          <span className="attach-icon-wrap" style={{ background: 'linear-gradient(135deg, #00c875, #46c9ff)' }}>
                            <IonIcon icon={personAddOutline} />
                          </span>
                          Add Employee
                        </button>
                      </div>
                    )}
                    <button
                      className={`attach-btn${menuOpen ? ' open' : ''}`}
                      onClick={() => setMenuOpen(v => !v)}
                    >
                      <IonIcon icon={addOutline} />
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    className="msg-input"
                    placeholder="Message..."
                    value={inputText}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button
                    className={`send-btn${inputText.trim() ? ' ready' : ''}`}
                    onClick={sendMessage}
                    disabled={!inputText.trim() || typing}
                  >
                    <IonIcon icon={sendOutline} />
                  </button>

                  <input ref={cameraRef}  type="file" accept="image/*"        capture="environment" style={{ display: 'none' }} />
                  <input ref={libraryRef} type="file" accept="image/*,video/*"                      style={{ display: 'none' }} />
                  <input ref={fileRef}    type="file" accept="*/*"                                  style={{ display: 'none' }} />
                </div>
              </>
            )}
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default ChatPage;
