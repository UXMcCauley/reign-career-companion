import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { arrowBackOutline, arrowForwardOutline, statsChartOutline, timeOutline, trophyOutline } from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { demoEmployeeTalentCards } from '../data/talentCards';
import './KeycardsPage.css';

type ShiftHistoryEntry = {
  id: string;
  label: string;
  hours: string;
  rating: number;
  progress: number;
};

type KeycardItem = {
  id: string;
  title: string;
  details: string;
  level: number;
  progress: number;
  industryImage: string;
  overallTime: string;
  rating: number;
  milestones: Array<{ label: string; progress: number }>;
  shiftHistory: ShiftHistoryEntry[];
};

const industryImages = [
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1581091014534-8987c1d64718?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1200&q=80'
];

const shiftLabels = ['Mon Shift', 'Wed Shift', 'Fri Shift'];

const keycards: KeycardItem[] = demoEmployeeTalentCards.map((card, index) => {
  const progressSeed = 52 + index * 8;
  const ratingSeed = 4.1 + index * 0.15;

  return {
    id: card.id,
    title: card.name,
    details: `${card.name} follows a ${card.majorGroupName.toLowerCase()} path and tracks execution quality through core skills.`,
    level: Math.floor(Math.random() * 5) + 1,
    progress: Math.min(94, progressSeed),
    industryImage: industryImages[index % industryImages.length],
    overallTime: `${128 + index * 36}h total logged`,
    rating: Math.min(4.9, Number(ratingSeed.toFixed(1))),
    milestones: card.skills.map((skill, skillIndex) => ({
      label: skill.name,
      progress: Math.min(95, progressSeed - 8 + skillIndex * 10)
    })),
    shiftHistory: shiftLabels.map((label, shiftIndex) => ({
      id: `${card.id}-shift-${shiftIndex}`,
      label,
      hours: `${7 + ((index + shiftIndex) % 3) * 0.5}h`,
      rating: Math.min(4.9, Number((ratingSeed + shiftIndex * 0.1).toFixed(1))),
      progress: Math.min(97, progressSeed - 4 + shiftIndex * 4)
    }))
  };
});

const SWIPE_NAV_THRESHOLD = 46;
const SWIPE_DISMISS_THRESHOLD = 86;
const DETAIL_SWIPE_ANIMATION_MS = 300;

type SwipeTransitionState = {
  fromIndex: number;
  toIndex: number;
  direction: 'next' | 'previous';
};

type ViewMode = 'grid' | 'list';
type SortMode = 'alphabetical' | 'progress';

const KeycardsPage: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [swipeTransition, setSwipeTransition] = useState<SwipeTransitionState | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('progress');
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const draggingPanelRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);

  const visibleKeycards = useMemo(() => {
    const cards = [...keycards];
    if (sortMode === 'alphabetical') {
      cards.sort((a, b) => a.title.localeCompare(b.title));
      return cards;
    }
    cards.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.progress - a.progress;
    });
    return cards;
  }, [sortMode]);

  const selectedCard = useMemo(
    () => (selectedIndex !== null ? visibleKeycards[selectedIndex] : null),
    [selectedIndex, visibleKeycards]
  );

  const openDetails = (index: number) => {
    setSelectedIndex(index);
  };

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const dismissDetails = () => {
    setSelectedIndex(null);
    setSwipeTransition(null);
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    startPointRef.current = null;
    draggingPanelRef.current = false;
  };

  const swipeToCard = (direction: 'next' | 'previous') => {
    setSelectedIndex(current => {
      if (current === null) return current;
      if (swipeTransition) return current;
      const toIndex =
        direction === 'next'
          ? (current + 1) % visibleKeycards.length
          : (current - 1 + visibleKeycards.length) % visibleKeycards.length;

      setSwipeTransition({
        fromIndex: current,
        toIndex,
        direction
      });

      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = window.setTimeout(() => {
        setSelectedIndex(toIndex);
        setSwipeTransition(null);
        transitionTimerRef.current = null;
      }, DETAIL_SWIPE_ANIMATION_MS);

      return current;
    });
  };

  const onPanelTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    startPointRef.current = { x: touch.clientX, y: touch.clientY };
    draggingPanelRef.current = true;
  };

  const onPanelTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!draggingPanelRef.current || !startPointRef.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startPointRef.current.x;
    const dy = touch.clientY - startPointRef.current.y;
    const horizontalSwipe = Math.abs(dx) > Math.abs(dy);

    if (horizontalSwipe && Math.abs(dx) >= SWIPE_NAV_THRESHOLD) {
      if (dx < 0) swipeToCard('next');
      else swipeToCard('previous');
    } else if (!horizontalSwipe && dy >= SWIPE_DISMISS_THRESHOLD) {
      dismissDetails();
    }

    startPointRef.current = null;
    draggingPanelRef.current = false;
  };

  const renderDetailsContainer = (card: KeycardItem) => (
    <article className="keycard-details-container">
      <div className="keycards-sheet-head">
        <div>
          <h3>{card.title}</h3>
        </div>
      </div>

      <div className="detail-metric-grid">
        <div className="detail-metric-box">
          <IonIcon icon={statsChartOutline} />
          <span>Work Rating</span>
          <strong>{card.rating.toFixed(1)} / 5</strong>
        </div>
        <div className="detail-metric-box">
          <IonIcon icon={timeOutline} />
          <span>Overall Time</span>
          <strong>{card.overallTime}</strong>
        </div>
        <div className="detail-metric-box">
          <IonIcon icon={trophyOutline} />
          <span>Milestone Progress</span>
          <strong>{card.progress}%</strong>
        </div>
      </div>

      <div className="detail-section">
        <h4>Progress milestones</h4>
        {card.milestones.map(milestone => (
          <div key={milestone.label} className="milestone-row">
            <div className="milestone-top">
              <span>{milestone.label}</span>
              <strong>{milestone.progress}%</strong>
            </div>
            <div className="milestone-track">
              <div className="milestone-fill" style={{ width: `${milestone.progress}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="detail-section">
        <h4>Shift history</h4>
        <div className="shift-history-list">
          {card.shiftHistory.map(entry => (
            <article key={entry.id} className="shift-history-item">
              <div>
                <h5>{entry.label}</h5>
                <p>{entry.hours} logged</p>
              </div>
              <div className="shift-history-right">
                <span>{entry.rating.toFixed(1)} rating</span>
                <strong>{entry.progress}% progress</strong>
              </div>
            </article>
          ))}
        </div>
      </div>
    </article>
  );

  return (
    <IonPage className="keycards-page">
      <IonContent fullscreen>
        <div className="keycards-scene">
          <div className="keycards-header">
            <h1>Keycards</h1>
            <p>Tap a card to open details. Swipe in details to browse.</p>
          </div>

          <div className="keycards-controls" aria-label="Keycard view and sort controls">
            <div className="keycards-toggle">
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
              >
                Grid
              </button>
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
              >
                List
              </button>
            </div>
            <div className="keycards-toggle">
              <button
                className={sortMode === 'alphabetical' ? 'active' : ''}
                onClick={() => setSortMode('alphabetical')}
                aria-pressed={sortMode === 'alphabetical'}
              >
                A-Z
              </button>
              <button
                className={sortMode === 'progress' ? 'active' : ''}
                onClick={() => setSortMode('progress')}
                aria-pressed={sortMode === 'progress'}
              >
                Progress
              </button>
            </div>
          </div>

          <section className={`keycards-grid${viewMode === 'list' ? ' list-view' : ''}`} aria-label="Keycards list">
            {visibleKeycards.map((card, index) => (
              <button
                key={card.id}
                className={`keycard-tile${viewMode === 'list' ? ' list-tile' : ''}`}
                style={{ backgroundImage: `url(${card.industryImage})` }}
                onClick={() => openDetails(index)}
                aria-label={`Open ${card.title} keycard`}
              >
                <div className="keycard-overlay">
                  <h2>{card.title}</h2>
                  <p className="keycard-level">Level {card.level}</p>
                  <div className="keycard-progress-inline">
                    <div className="keycard-progress-track">
                      <div className="keycard-progress-fill" style={{ width: `${card.progress}%` }} />
                    </div>
                    <span className="keycard-progress-value">{card.progress}%</span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        </div>

        {selectedCard ? (
          <div className="keycards-detail-layer" role="dialog" aria-modal="true" aria-label={`${selectedCard.title} details`}>
            <button className="keycards-backdrop" onClick={dismissDetails} aria-label="Dismiss details" />
            {/* <div className="keycards-selected-title">{selectedCard.title}</div> */}
            <section
              className="keycards-detail-sheet"
              onTouchStart={onPanelTouchStart}
              onTouchEnd={onPanelTouchEnd}
            >
              <div className="keycards-sheet-handle" />
              <div className="keycard-details-stage">
                {swipeTransition ? (
                  <>
                    <div className={`keycard-details-pane ${swipeTransition.direction === 'next' ? 'pane-exit-left' : 'pane-exit-right'}`}>
                      {renderDetailsContainer(visibleKeycards[swipeTransition.fromIndex])}
                    </div>
                    <div
                      className={`keycard-details-pane ${swipeTransition.direction === 'next' ? 'pane-enter-from-right-lower' : 'pane-enter-from-left-lower'}`}
                    >
                      {renderDetailsContainer(visibleKeycards[swipeTransition.toIndex])}
                    </div>
                  </>
                ) : (
                  <div className="keycard-details-pane pane-active">{renderDetailsContainer(selectedCard)}</div>
                )}
              </div>

              <div className="sheet-swipe-hint">
                <IonIcon icon={arrowBackOutline} />
                <span>Swipe left/right to move between keycards</span>
                <IonIcon icon={arrowForwardOutline} />
              </div>
            </section>
          </div>
        ) : null}
      </IonContent>
    </IonPage>
  );
};

export default KeycardsPage;
