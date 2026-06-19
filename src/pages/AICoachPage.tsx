import { IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  addOutline,
  archiveOutline,
  chevronBackOutline,
  createOutline,
  funnelOutline,
  saveOutline,
  searchOutline,
  sendOutline,
  settingsOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultLoggedInEmployee } from '../data/defaultLoggedInEmployee';
import { CATEGORY_COLORS, loadAICoachState, pickCategoryColor, saveAICoachState } from '../data/aiCoachStorage';
import type {
  CoachApiPayload,
  CoachCategory,
  CoachConversation,
  CoachPersonality,
  CoachState,
  ResponseStyle,
  ResponseType,
} from '../data/aiCoachTypes';
import './ChatPage.css';
import './AICoachPage.css';
import { apiUrl } from '../config/apiBase';


type AppView = 'chats' | 'settings';

const PERSONALITY_OPTIONS: { value: CoachPersonality; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'witty', label: 'Witty' },
  { value: 'straight-shooter', label: 'Straight Shooter' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'playful', label: 'Playful' },
  { value: 'laid-back', label: 'Laid Back' },
  { value: 'friendly', label: 'Friendly' },
];

const RESPONSE_TYPE_OPTIONS: { value: ResponseType; label: string }[] = [
  { value: 'brief', label: 'Brief' },
  { value: 'simple', label: 'Simple' },
  { value: 'data-driven', label: 'Data Driven' },
  { value: 'in-depth', label: 'In-depth' },
];

const SUGGESTION_PROMPTS: Array<{ text: string; categoryId: string }> = [
  { text: 'How can I handle conflict with a teammate without escalating things?', categoryId: 'cat-workplace' },
  { text: 'Help me build a 30-day plan to improve my leadership visibility.', categoryId: 'cat-career' },
  { text: 'What should I say in a difficult conversation with my manager?', categoryId: 'cat-workplace' },
  { text: 'How do I prepare for a promotion conversation next quarter?', categoryId: 'cat-career' },
  { text: 'What are some ways I can stand out during a busy shift?', categoryId: 'cat-general' },
  { text: 'How do I ask for more responsibility without seeming pushy?', categoryId: 'cat-career' },
  { text: 'Give me tips for staying motivated when work feels repetitive.', categoryId: 'cat-general' },
  { text: 'How should I respond when a customer is being unreasonable?', categoryId: 'cat-workplace' },
  { text: 'What habits separate top performers from average ones?', categoryId: 'cat-general' },
];

const ARCHIVED_FILTER_ID = '__archived__';



function categoryInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function colorForConversation(id: string): string {
  const palette = ['#7b3fff', '#2e85ff', '#00c875', '#ff6b6b', '#46c9ff', '#e87d30'];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const AICoachPage: React.FC = () => {
  const [view, setView] = useState<AppView>('chats');
  const [state, setState] = useState<CoachState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>(
    () => localStorage.getItem('reign_ai_coach_filter') ?? 'all'
  );
  const [draft, setDraft] = useState('');
  const [draftCoachName, setDraftCoachName] = useState('');
  const [draftPersonalities, setDraftPersonalities] = useState<CoachPersonality[]>([]);
  const [draftResponseType, setDraftResponseType] = useState<ResponseType>('brief');
  const [draftResponseStyle, setDraftResponseStyle] = useState<ResponseStyle>('conversational');
  const [draftCategories, setDraftCategories] = useState<CoachCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [showFilterSelect, setShowFilterSelect] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionPhase, setSuggestionPhase] = useState<'idle' | 'exiting' | 'entering'>('idle');

  const msgEndRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const didSwipeRef = useRef(false);

  useEffect(() => {
    let active = true;
    void loadAICoachState().then(loaded => {
      if (!active) return;
      setState(loaded);
      setIsHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !state) return;
    void saveAICoachState(state);
  }, [state, isHydrated]);

  useEffect(() => {
    if (!state?.categories.length) return;
    if (filterCategoryId === 'all' || filterCategoryId === ARCHIVED_FILTER_ID) return;
    if (!state.categories.some(category => category.id === filterCategoryId)) {
      setFilterCategoryId('all');
    }
  }, [state?.categories, filterCategoryId]);

  useEffect(() => {
    localStorage.setItem('reign_ai_coach_filter', filterCategoryId);
  }, [filterCategoryId]);

  useEffect(() => {
    setCategoryPickerOpen(false);
  }, [state?.activeConversationId]);

  useEffect(() => {
    if (!state) return;
    const interval = window.setInterval(() => {
      setSuggestionPhase('exiting');
      window.setTimeout(() => {
        setSuggestionIndex(prev => (prev + 1) % SUGGESTION_PROMPTS.length);
        setSuggestionPhase('entering');
        window.setTimeout(() => setSuggestionPhase('idle'), 280);
      }, 280);
    }, 9000);
    return () => window.clearInterval(interval);
  }, [state]);

  const employeeContext = useMemo(() => ({
    employeeName: defaultLoggedInEmployee.displayName,
    roleTitle: defaultLoggedInEmployee.roleTitle,
    bio: defaultLoggedInEmployee.bio,
    metricsSummary: defaultLoggedInEmployee.dashboard.metrics.map(metric => `${metric.label}: ${metric.value}${metric.total ?? ''}`).join(', '),
    mastery: defaultLoggedInEmployee.dashboard.mastery,
    resumeStats: defaultLoggedInEmployee.resume.stats,
  }), []);

  const activeConversation = useMemo(
    () => state?.conversations.find(conversation => conversation.id === state.activeConversationId) ?? null,
    [state]
  );

  useEffect(() => {
    if (!activeConversation) return;
    const t = setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    return () => clearTimeout(t);
  }, [activeConversation?.id, activeConversation?.messages.length, isSending]);

  const filteredConversations = useMemo(() => {
    if (!state) return [];
    const query = search.trim().toLowerCase();
    return state.conversations.filter(conversation => {
      const isArchivedView = filterCategoryId === ARCHIVED_FILTER_ID;
      if (isArchivedView && !conversation.archived) return false;
      if (!isArchivedView && conversation.archived) return false;
      if (!isArchivedView && filterCategoryId !== 'all' && conversation.categoryId !== filterCategoryId) return false;
      if (!query) return true;
      const latest = conversation.messages[conversation.messages.length - 1]?.content ?? '';
      return conversation.title.toLowerCase().includes(query) || latest.toLowerCase().includes(query);
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state, filterCategoryId, search]);

  const totalUnreadReplies = useMemo(
    () => state?.conversations.reduce((sum, c) => sum + (!c.archived ? (c.unreadReplies ?? 0) : 0), 0) ?? 0,
    [state?.conversations]
  );

  const openSettingsView = () => {
    if (!state) return;
    setDraftCoachName(state.coachName);
    setDraftPersonalities(state.personalities);
    setDraftResponseType(state.responseType);
    setDraftResponseStyle(state.responseStyle);
    setDraftCategories(state.categories);
    setNewCategoryName('');
    setNewCategoryColor(pickCategoryColor(state.categories.map(c => c.color)));
    setView('settings');
  };

  const saveSettings = () => {
    const fallbackCategoryId = draftCategories[0]?.id ?? 'cat-general';
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        coachName: draftCoachName.trim() || 'Nova',
        personalities: draftPersonalities.length ? draftPersonalities : ['professional'],
        responseType: draftResponseType,
        responseStyle: draftResponseStyle,
        categories: draftCategories,
        conversations: prev.conversations.map(conversation => ({
          ...conversation,
          categoryId: draftCategories.some(category => category.id === conversation.categoryId)
            ? conversation.categoryId
            : fallbackCategoryId,
        })),
      };
    });
    setFilterCategoryId(fallbackCategoryId);
    setView('chats');
  };

  const togglePersonality = (p: CoachPersonality) => {
    setDraftPersonalities(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const createConversation = () => {
    if (!state) return;
    const now = Date.now();
    const conversation: CoachConversation = {
      id: uid('conv'),
      title: 'New Coaching Chat',
      categoryId: filterCategoryId === 'all' || filterCategoryId === ARCHIVED_FILTER_ID
        ? (state.categories[0]?.id || 'cat-general')
        : filterCategoryId,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        activeConversationId: conversation.id,
        conversations: [conversation, ...prev.conversations],
      };
    });
    setError('');
    setDraft('');
  };

  const createCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (draftCategories.some(category => category.name.toLowerCase() === name.toLowerCase())) return;
    const color = newCategoryColor;
    setDraftCategories(prev => [...prev, { id: uid('cat'), name, color }]);
    setNewCategoryName('');
    setNewCategoryColor(pickCategoryColor([...draftCategories.map(c => c.color), color]));
  };

  const updateConversationCategory = (conversationId: string, categoryId: string) => {
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        conversations: prev.conversations.map(conversation =>
          conversation.id === conversationId ? { ...conversation, categoryId, updatedAt: Date.now() } : conversation
        ),
      };
    });
    setSwipedId(null);
  };

  const archiveConversation = (conversationId: string) => {
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        conversations: prev.conversations.map(conversation =>
          conversation.id === conversationId
            ? { ...conversation, archived: !conversation.archived, updatedAt: Date.now() }
            : conversation
        ),
      };
    });
    setSwipedId(null);
  };

  const beginSwipe = (x: number, y: number) => {
    swipeStartX.current = x;
    swipeStartY.current = y;
  };

  const finishSwipe = (conversationId: string, x: number, y: number) => {
    const dx = x - swipeStartX.current;
    const dy = y - swipeStartY.current;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx < -60) {
      didSwipeRef.current = true;
      setSwipedId(conversationId);
    } else if (dx > 20) {
      didSwipeRef.current = true;
      setSwipedId(null);
    }
  };

  const onTouchStart = (event: React.TouchEvent) => {
    beginSwipe(event.touches[0].clientX, event.touches[0].clientY);
  };

  const onTouchEnd = (conversationId: string, event: React.TouchEvent) => {
    finishSwipe(conversationId, event.changedTouches[0].clientX, event.changedTouches[0].clientY);
  };

  const onMouseDown = (event: React.MouseEvent) => {
    beginSwipe(event.clientX, event.clientY);
  };

  const onMouseUp = (conversationId: string, event: React.MouseEvent) => {
    finishSwipe(conversationId, event.clientX, event.clientY);
  };

  const openConversation = (conversationId: string) => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    if (swipedId) {
      setSwipedId(null);
      return;
    }
    setState(prev => prev ? {
      ...prev,
      activeConversationId: conversationId,
      conversations: prev.conversations.map(c =>
        c.id === conversationId ? { ...c, unreadReplies: 0 } : c
      ),
    } : prev);
  };

  const renameConversation = (conversationId: string) => {
    if (!state) return;
    const target = state.conversations.find(conversation => conversation.id === conversationId);
    if (!target) return;
    const nextTitle = window.prompt('Rename chat', target.title)?.trim();
    if (!nextTitle) return;
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        conversations: prev.conversations.map(conversation =>
          conversation.id === conversationId
            ? { ...conversation, title: nextTitle.slice(0, 48), updatedAt: Date.now() }
            : conversation
        ),
      };
    });
    setSwipedId(null);
  };

  const getConversationPromptTitle = (conversation: CoachConversation | null): string => {
    if (!conversation) return 'AI Coach Chat';
    const firstUserMessage = conversation.messages.find(message => message.role === 'user')?.content?.trim();
    if (firstUserMessage) {
      return firstUserMessage.slice(0, 56) + (firstUserMessage.length > 56 ? '...' : '');
    }
    return conversation.title;
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeConversation || isSending) return;
    setDraft('');
    await sendPromptToConversation(activeConversation, text);
  };

  const sendPromptToConversation = async (conversation: CoachConversation, text: string) => {
    if (!state) return;
    const userMessage = { id: uid('msg-user'), role: 'user' as const, content: text, ts: Date.now() };
    const nextTitle = conversation.title === 'New Coaching Chat'
      ? text.slice(0, 34) + (text.length > 34 ? '...' : '')
      : conversation.title;
    const conversationCategoryName =
      state.categories.find(category => category.id === conversation.categoryId)?.name ?? 'General Coaching';

    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        conversations: prev.conversations.map(candidate =>
          candidate.id === conversation.id
            ? { ...candidate, title: nextTitle, updatedAt: Date.now(), messages: [...candidate.messages, userMessage] }
            : candidate
        ),
        activeConversationId: conversation.id,
      };
    });
    setError('');
    setIsSending(true);

    try {
      const payload: CoachApiPayload = {
        coachName: state.coachName,
        personalities: state.personalities,
        responseType: state.responseType,
        responseStyle: state.responseStyle,
        categoryName: conversationCategoryName,
        employeeContext,
        messages: [...(conversation.messages ?? []), userMessage].map(message => ({ role: message.role, content: message.content })),
      };

      const reply = await requestCoachReply(payload);
      const assistantMessage = { id: uid('msg-ai'), role: 'assistant' as const, content: reply, ts: Date.now() };

      setState(prev => {
        if (!prev) return prev;
        const isActive = prev.activeConversationId === conversation.id;
        return {
          ...prev,
          conversations: prev.conversations.map(candidate =>
            candidate.id === conversation.id
              ? {
                  ...candidate,
                  updatedAt: Date.now(),
                  messages: [...candidate.messages, assistantMessage],
                  unreadReplies: isActive ? (candidate.unreadReplies ?? 0) : (candidate.unreadReplies ?? 0) + 1,
                }
              : candidate
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI coach');
    } finally {
      setIsSending(false);
    }
  };

  const sendSuggestionPrompt = () => {
    if (isSending || !state) return;
    const suggestion = SUGGESTION_PROMPTS[suggestionIndex];
    const now = Date.now();
    const resolvedCategoryId = state.categories.some(c => c.id === suggestion.categoryId)
      ? suggestion.categoryId
      : (state.categories[0]?.id || 'cat-general');
    const conversation: CoachConversation = {
      id: uid('conv'),
      title: suggestion.text.slice(0, 34) + (suggestion.text.length > 34 ? '...' : ''),
      categoryId: resolvedCategoryId,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        activeConversationId: conversation.id,
        conversations: [conversation, ...prev.conversations],
      };
    });
    setSwipedId(null);
    setShowFilterSelect(false);
    void sendPromptToConversation(conversation, suggestion.text);
  };

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const listClass = activeConversation ? 'panel-exit-left' : 'panel-enter';
  const threadClass = activeConversation ? 'panel-enter' : 'panel-exit-right';

  if (!state) {
    return (
      <IonPage className="chat-page chat-ios ai-coach-page">
        <IonContent fullscreen>
          <div className="ai-coach-loading">Loading AI coach...</div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="chat-page chat-ios ai-coach-page">
      <IonContent fullscreen>
        {view === 'settings' ? (
          <div className="ai-settings-view">
            <div className="chat-list-header">
              <div className="chat-list-title-row">
                <button className="back-btn" onClick={() => setView('chats')} aria-label="Back to AI chats">
                  <IonIcon icon={chevronBackOutline} />
                  <span>Back</span>
                </button>
                <h1 className="chat-list-title">
                  <IonIcon icon={sparklesOutline} className="ai-title-icon" />
                  AI Coach Settings
                </h1>
                <button type="button" className="ai-settings-save" onClick={saveSettings}>
                  <IonIcon icon={saveOutline} />
                  Save
                </button>
              </div>
            </div>
            <section className="ai-settings-sheet ai-settings-sheet--full">

              <div className="ai-settings-section-label">Coach Identity</div>
              <label className="ai-coach-field">
                Coach Name
                <input value={draftCoachName} onChange={event => setDraftCoachName(event.target.value.slice(0, 32))} placeholder="Name your coach" />
              </label>
              <div className="ai-settings-section-label">Personality</div>
              <div className="ai-personality-grid">
                {PERSONALITY_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    className={`ai-personality-chip${draftPersonalities.includes(p.value) ? ' selected' : ''}`}
                    onClick={() => togglePersonality(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="ai-settings-section-label">Response Type</div>
              <div className="ai-response-pills">
                {RESPONSE_TYPE_OPTIONS.map(rt => (
                  <button
                    key={rt.value}
                    type="button"
                    className={`ai-response-pill${draftResponseType === rt.value ? ' selected' : ''}`}
                    onClick={() => setDraftResponseType(rt.value)}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>

              <div className="ai-settings-section-label">Response Style</div>
              <div className="ai-style-toggle">
                <button
                  type="button"
                  className={`ai-style-toggle-btn${draftResponseStyle === 'plan-strategy' ? ' selected' : ''}`}
                  onClick={() => setDraftResponseStyle('plan-strategy')}
                >
                  Plan &amp; Strategy
                </button>
                <button
                  type="button"
                  className={`ai-style-toggle-btn${draftResponseStyle === 'conversational' ? ' selected' : ''}`}
                  onClick={() => setDraftResponseStyle('conversational')}
                >
                  Conversational
                </button>
              </div>

              <div className="ai-settings-section-label">Categories</div>
              <div className="ai-category-color-swatches">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`ai-color-swatch${newCategoryColor === color ? ' selected' : ''}`}
                    style={{ background: color }}
                    aria-label={`Select color ${color}`}
                    onClick={() => setNewCategoryColor(color)}
                  />
                ))}
              </div>
              <div className="ai-category-create">
                <input
                  value={newCategoryName}
                  onChange={event => setNewCategoryName(event.target.value)}
                  placeholder="Create category"
                  style={{ boxShadow: `0 0 0 1.5px ${newCategoryColor}` }}
                />
                <button
                  type="button"
                  className="ai-category-add-btn"
                  onClick={createCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <IonIcon icon={addOutline} />
                </button>
              </div>
              <div className="ai-category-list">
                {draftCategories.map(category => (
                  <span
                    key={category.id}
                    className="ai-category-chip"
                    style={{ background: category.color, borderColor: 'transparent' }}
                  >
                    {category.name}
                  </span>
                ))}
              </div>

            </section>
          </div>
        ) : (
          <div className="chat-root">
            <section className={`chat-panel chat-list-panel ${listClass}`}>
              <div className="chat-list-header">
                <div className="chat-list-title-row">
                  <h1 className="chat-list-title">
                    <IonIcon icon={sparklesOutline} className="ai-title-icon" />
                    AI Coach
                    {totalUnreadReplies > 0 && <span className="chat-unread-chip">{totalUnreadReplies}</span>}
                  </h1>
                </div>
                <div className="ai-search-controls-row">
                  <button
                    type="button"
                    className={`ai-filter-toggle-btn${showFilterSelect ? ' active' : ''}`}
                    aria-label={showFilterSelect ? 'Hide chat filter' : 'Show chat filter'}
                    onClick={() => setShowFilterSelect(prev => !prev)}
                  >
                    <IonIcon icon={funnelOutline} />
                  </button>
                  <div className="chat-search-wrap">
                    <IonIcon icon={searchOutline} className="chat-search-icon" />
                    <input type="search" className="chat-search" placeholder="Search AI chats" value={search} onChange={event => setSearch(event.target.value)} />
                  </div>
                  <button className="ai-settings-btn" onClick={openSettingsView} aria-label="AI coach settings">
                    <IonIcon icon={settingsOutline} />
                  </button>
                </div>
                {showFilterSelect ? (
                  <div className="ai-filter-row">
                    <label htmlFor="ai-category-filter">Filter</label>
                    <select id="ai-category-filter" className="ai-filter-select" value={filterCategoryId} onChange={event => setFilterCategoryId(event.target.value)}>
                      <option value="all">All</option>
                      {state.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                      <option value={ARCHIVED_FILTER_ID}>Archived</option>
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="chat-list-body" onClick={() => swipedId && setSwipedId(null)}>
                {filteredConversations.map(conversation => {
                  const last = conversation.messages[conversation.messages.length - 1];
                  const isSwiped = swipedId === conversation.id;
                  return (
                    <div key={conversation.id} className="conv-swipe-wrap ai-conv-swipe">
                      <div className="conv-actions ai-conv-actions">
                        <label className="conv-action ai-conv-action ai-conv-action--category">
                          <span>Project</span>
                          <select
                            className="ai-conv-category-select"
                            value={conversation.categoryId}
                            onChange={event => updateConversationCategory(conversation.id, event.target.value)}
                          >
                            {state.categories.map(category => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                        </label>
                        <button type="button" className="conv-action ai-conv-action ai-conv-action--rename" onClick={() => renameConversation(conversation.id)}>
                          <IonIcon icon={createOutline} />
                          <span>Name</span>
                        </button>
                        <button type="button" className="conv-action ai-conv-action ai-conv-action--archive" onClick={() => archiveConversation(conversation.id)}>
                          <IonIcon icon={archiveOutline} />
                          <span>{conversation.archived ? 'Restore' : 'Archive'}</span>
                        </button>
                      </div>

                      <button
                        className={`conv-row ai-conv-row${isSwiped ? ' swiped' : ''}`}
                        onClick={() => openConversation(conversation.id)}
                        onTouchStart={onTouchStart}
                        onTouchEnd={event => onTouchEnd(conversation.id, event)}
                        onMouseDown={onMouseDown}
                        onMouseUp={event => onMouseUp(conversation.id, event)}
                      >
                        {(() => {
                          const cat = state.categories.find(c => c.id === conversation.categoryId);
                          const bg = cat?.color || colorForConversation(conversation.id);
                          return (
                            <div className="chat-avatar" style={{ background: bg }}>
                              {cat ? categoryInitials(cat.name) : 'AI'}
                            </div>
                          );
                        })()}
                        <div className="conv-body">
                          <div className="conv-top">
                            <span className="conv-name">{conversation.title}</span>
                            <div className="conv-top-right">
                              <span className="conv-time">{new Date(conversation.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="conv-bottom">
                            <span className="conv-preview">{last?.content ?? 'No messages yet'}</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
                {filteredConversations.length === 0 ? <div className="conv-empty"><p>No chats in this category yet.</p></div> : null}
              </div>
              <button className="new-message-fab" onClick={createConversation} aria-label="New AI coach chat">
                <IonIcon icon={addOutline} />
              </button>
              {!activeConversation ? (
                <button
                  type="button"
                  className={`ai-suggestion-chip ai-suggestion-chip--${suggestionPhase}`}
                  onClick={sendSuggestionPrompt}
                  disabled={isSending}
                >
                  <span className="ai-suggestion-chip-label">Try asking</span>
                  <span className="ai-suggestion-chip-text">{SUGGESTION_PROMPTS[suggestionIndex].text}</span>
                </button>
              ) : null}
            </section>

            <section className={`chat-panel chat-thread-panel ${threadClass}`}>
              {activeConversation ? (
                <>
                  <div className="thread-header ai-thread-header">
                    <div className="ai-thread-header-row">
                      <button className="back-btn" onClick={() => setState(prev => (prev ? { ...prev, activeConversationId: null } : prev))} aria-label="Back to AI chats">
                        <IonIcon icon={chevronBackOutline} />
                        <span>Back</span>
                      </button>
                      <span className="thread-name ai-thread-title">{activeConversation.title}</span>
                      {(() => {
                        const cat = state.categories.find(c => c.id === activeConversation.categoryId);
                        return (
                          <button
                            type="button"
                            className={`ai-thread-cat-btn${categoryPickerOpen ? ' open' : ''}`}
                            style={{ background: cat?.color || colorForConversation(activeConversation.id) }}
                            aria-label="Change category"
                            onClick={() => setCategoryPickerOpen(v => !v)}
                          >
                            {cat ? categoryInitials(cat.name) : 'AI'}
                          </button>
                        );
                      })()}
                      <button
                        type="button"
                        className="thread-action-btn ai-thread-rename-btn"
                        aria-label="Rename chat"
                        onClick={() => renameConversation(activeConversation.id)}
                      >
                        <IonIcon icon={createOutline} />
                      </button>
                    </div>
                    {categoryPickerOpen && (
                      <div className="ai-thread-cat-picker">
                        {state.categories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            className={`ai-thread-cat-picker-item${cat.id === activeConversation.categoryId ? ' selected' : ''}`}
                            style={{ background: cat.color }}
                            aria-label={cat.name}
                            onClick={() => {
                              updateConversationCategory(activeConversation.id, cat.id);
                              setCategoryPickerOpen(false);
                            }}
                          >
                            {categoryInitials(cat.name)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="thread-messages">
                    {activeConversation.messages.length ? (
                      activeConversation.messages.map((message, index) => {
                        const prev = activeConversation.messages[index - 1];
                        const next = activeConversation.messages[index + 1];
                        const groupStart = !prev || prev.role !== message.role;
                        const groupEnd = !next || next.role !== message.role;
                        const participantLabel = message.role === 'assistant'
                          ? (state.coachName || 'AI Coach')
                          : defaultLoggedInEmployee.displayName;
                        return (
                          <div key={message.id} className={`msg-row ${message.role === 'user' ? 'me' : 'other'}${groupStart ? ' group-start' : ''}`}>
                            <div className="bubble-stack">
                              {groupStart ? (
                                <span className={`ai-bubble-label ${message.role === 'user' ? 'ai-bubble-label--me' : 'ai-bubble-label--assistant'}`}>
                                  {participantLabel}
                                </span>
                              ) : null}
                              <div className={`bubble ${message.role === 'user' ? 'bubble-me' : 'bubble-other'}${groupEnd ? ' tail' : ''}`}>
                                {message.content}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="conv-empty">
                        <p>Ask for help with conflict handling, relationship management, or career growth planning.</p>
                      </div>
                    )}
                    {isSending ? <div className="ai-thinking">Thinking...</div> : null}
                    <div ref={msgEndRef} />
                  </div>

                  <div className="thread-input-bar">
                    <textarea className="msg-input" rows={1} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Ask your AI coach..." />
                    <button className={`send-btn${draft.trim() ? ' ready' : ''}`} type="button" onClick={sendMessage} disabled={!draft.trim() || isSending}>
                      <IonIcon icon={sendOutline} />
                    </button>
                  </div>
                  {error ? <p className="ai-error">{error}</p> : null}
                </>
              ) : null}
            </section>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

async function requestCoachReply(payload: CoachApiPayload): Promise<string> {
  const response = await fetch(apiUrl('/api/ai-coach'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // why this matters: a 404/500 returns an HTML error page; response.json()
  // then throws the same opaque WebKit pattern error. Read text first.
  const raw = await response.text();
  let parsed: { reply?: string; error?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Coach API ${response.status}: ${raw.slice(0, 140)}`);
  }

  if (!response.ok || !parsed.reply) throw new Error(parsed.error || 'AI coach request failed');
  return parsed.reply;
}

export default AICoachPage;
