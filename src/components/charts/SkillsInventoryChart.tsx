import { IonIcon } from '@ionic/react';
import { contractOutline, expandOutline } from 'ionicons/icons';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import './SkillsInventoryChart.css';

export type SkillsInventoryNode = {
  id: string;
  label: string;
  shortLabel: string;
  proficiency: number;
  educationHours: number;
  certificationHours: number;
  apprenticeshipHours: number;
};

export type SkillsInventorySelectOption = {
  id: string;
  label: string;
};

export type SkillsInventoryChartProps = {
  nodes: SkillsInventoryNode[];
  experienceOptions: SkillsInventorySelectOption[];
  className?: string;
};

type ViewMode = 'experience' | 'education';
type EducationFilter = 'education' | 'certifications' | 'apprenticeship';

type Point = { x: number; y: number };

const EDUCATION_OPTIONS: { id: EducationFilter; label: string }[] = [
  { id: 'education', label: 'Education' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'apprenticeship', label: 'Apprenticeship' }
];

const VIEWBOX_WIDTH = 500;
const VIEWBOX_HEIGHT = 400;
const CENTER_X = 250;
const CENTER_Y = 200;
const MAX_RADIUS = 88;
const LABEL_RADIUS = 126;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3.2;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function axisPoint(index: number, total: number, radius: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y + radius * Math.sin(angle),
    angle
  };
}

function polygonPath(
  values: number[],
  total: number,
  scale: (value: number) => number
) {
  return values
    .map((value, index) => {
      const point = axisPoint(index, total, scale(value));
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

function labelAnchor(angle: number): 'start' | 'middle' | 'end' {
  if (Math.abs(Math.cos(angle)) < 0.25) return 'middle';
  return Math.cos(angle) > 0 ? 'start' : 'end';
}

function getEducationHours(node: SkillsInventoryNode, filter: EducationFilter) {
  switch (filter) {
    case 'certifications':
      return node.certificationHours;
    case 'apprenticeship':
      return node.apprenticeshipHours;
    default:
      return node.educationHours;
  }
}

function isNodeSelected(nodeId: string, mode: ViewMode, experienceSelection: string) {
  return mode === 'experience' && experienceSelection === nodeId;
}

function isNodeInactive(nodeId: string, mode: ViewMode, experienceSelection: string) {
  return mode === 'experience' && experienceSelection !== 'all' && experienceSelection !== nodeId;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const SkillsInventoryChart: React.FC<SkillsInventoryChartProps> = ({
  nodes,
  experienceOptions,
  className
}) => {
  const blueGradientId = useId();
  const pinkGradientId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const panStartRef = useRef<{ pointerId: number; origin: Point; offset: Point } | null>(null);
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);

  const [mode, setMode] = useState<ViewMode>('experience');
  const [experienceSelection, setExperienceSelection] = useState('all');
  const [educationSelection, setEducationSelection] = useState<EducationFilter>('education');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const experienceSelectOptions = useMemo(
    () => [{ id: 'all', label: 'All key cards' }, ...experienceOptions],
    [experienceOptions]
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!stageRef.current) return;
    try {
      if (document.fullscreenElement === stageRef.current) {
        await document.exitFullscreen();
      } else {
        await stageRef.current.requestFullscreen();
      }
    } catch {
      // Fullscreen may be unavailable in some embedded webviews.
    }
  }, []);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = -event.deltaY * 0.0018;
    setZoom(current => {
      const next = clamp(current + delta, MIN_ZOOM, MAX_ZOOM);
      if (next <= 1) {
        setOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      viewportRef.current?.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointersRef.current.size === 1) {
        panStartRef.current = {
          pointerId: event.pointerId,
          origin: { x: event.clientX, y: event.clientY },
          offset: { ...offset }
        };
      }

      if (pointersRef.current.size === 2) {
        const points = [...pointersRef.current.values()];
        pinchStartRef.current = {
          distance: distance(points[0], points[1]),
          scale: zoom
        };
        panStartRef.current = null;
      }
    },
    [offset, zoom]
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;

    const previous = pointersRef.current.get(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const points = [...pointersRef.current.values()];
      const nextDistance = distance(points[0], points[1]);
      const ratio = nextDistance / pinchStartRef.current.distance;
      setZoom(clamp(pinchStartRef.current.scale * ratio, MIN_ZOOM, MAX_ZOOM));
      return;
    }

    if (
      pointersRef.current.size === 1 &&
      panStartRef.current?.pointerId === event.pointerId &&
      zoom > 1 &&
      previous
    ) {
      const dx = event.clientX - panStartRef.current.origin.x;
      const dy = event.clientY - panStartRef.current.origin.y;
      setOffset({
        x: panStartRef.current.offset.x + dx,
        y: panStartRef.current.offset.y + dy
      });
    }
  }, [zoom]);

  const onPointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      panStartRef.current = null;
    }
    if (zoom <= 1) {
      setOffset({ x: 0, y: 0 });
    }
  }, [zoom]);

  if (!nodes.length) {
    return null;
  }

  const total = nodes.length;
  const educationCap = Math.max(
    ...nodes.map(node => getEducationHours(node, educationSelection)),
    1
  );

  const proficiencyValues = nodes.map(node => clamp(node.proficiency, 0, 100));
  const trainingValues = nodes.map(node =>
    clamp((getEducationHours(node, educationSelection) / educationCap) * 100, 0, 100)
  );

  const proficiencyPath = polygonPath(
    proficiencyValues,
    total,
    value => (value / 100) * MAX_RADIUS
  );
  const trainingPath = polygonPath(
    trainingValues,
    total,
    value => (value / 100) * MAX_RADIUS
  );

  return (
    <section className={['skills-inventory-chart', className].filter(Boolean).join(' ')}>
      <header className="skills-inventory-chart__header">
        <h3 className="skills-inventory-chart__title">Skills Inventory</h3>
      </header>

      <div
        ref={stageRef}
        className={[
          'skills-inventory-chart__stage',
          isFullscreen ? 'skills-inventory-chart__stage--fullscreen' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          className="skills-inventory-chart__fullscreen-btn"
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? 'Exit fullscreen chart' : 'Open fullscreen chart'}
        >
          <IonIcon icon={isFullscreen ? contractOutline : expandOutline} />
        </button>

        <div
          ref={viewportRef}
          className="skills-inventory-chart__viewport"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onDoubleClick={resetZoom}
        >
          <div
            className="skills-inventory-chart__surface"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`
            }}
          >
            <svg
              className="skills-inventory-chart__svg"
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Skills Inventory radar chart"
            >
              <defs>
                <radialGradient id={blueGradientId} cx="50%" cy="42%" r="68%">
                  <stop offset="0%" stopColor="rgba(6, 119, 240, 0.44)" />
                  <stop offset="100%" stopColor="rgba(15, 47, 115, 0.05)" />
                </radialGradient>
                <radialGradient id={pinkGradientId} cx="50%" cy="58%" r="62%">
                  <stop offset="0%" stopColor="rgba(255, 0, 230, 0.34)" />
                  <stop offset="100%" stopColor="rgba(183, 0, 100, 0.05)" />
                </radialGradient>
              </defs>

              {[0.33, 0.66, 1].map(level => (
                <polygon
                  key={level}
                  points={polygonPath(
                    Array.from({ length: total }, () => level * 100),
                    total,
                    value => (value / 100) * MAX_RADIUS
                  )}
                  className="skills-inventory-chart__grid"
                />
              ))}

              {nodes.map((node, index) => {
                const point = axisPoint(index, total, MAX_RADIUS);
                return (
                  <line
                    key={`${node.id}-axis`}
                    x1={CENTER_X}
                    y1={CENTER_Y}
                    x2={point.x}
                    y2={point.y}
                    className="skills-inventory-chart__axis"
                  />
                );
              })}

              <polygon
                points={proficiencyPath}
                className="skills-inventory-chart__layer skills-inventory-chart__layer--proficiency"
                fill={`url(#${blueGradientId})`}
              />
              <polygon
                points={trainingPath}
                className="skills-inventory-chart__layer skills-inventory-chart__layer--training"
                fill={`url(#${pinkGradientId})`}
              />

              {proficiencyValues.map((value, index) => {
                const node = nodes[index];
                const point = axisPoint(index, total, (value / 100) * MAX_RADIUS);
                const selected = isNodeSelected(node.id, mode, experienceSelection);
                const inactive = isNodeInactive(node.id, mode, experienceSelection);

                return (
                  <circle
                    key={`proficiency-${node.id}`}
                    cx={point.x}
                    cy={point.y}
                    r={selected ? 6 : 4}
                    className={[
                      'skills-inventory-chart__node',
                      'skills-inventory-chart__node--proficiency',
                      selected ? 'skills-inventory-chart__node--active' : '',
                      inactive ? 'skills-inventory-chart__node--inactive' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                );
              })}

              {trainingValues.map((value, index) => {
                const node = nodes[index];
                const point = axisPoint(index, total, (value / 100) * MAX_RADIUS);
                const selected = isNodeSelected(node.id, mode, experienceSelection);
                const inactive = isNodeInactive(node.id, mode, experienceSelection);

                return (
                  <circle
                    key={`training-${node.id}`}
                    cx={point.x}
                    cy={point.y}
                    r={selected ? 5.5 : 3.5}
                    className={[
                      'skills-inventory-chart__node',
                      'skills-inventory-chart__node--training',
                      selected ? 'skills-inventory-chart__node--active' : '',
                      inactive ? 'skills-inventory-chart__node--inactive' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                );
              })}

              {nodes.map((node, index) => {
                const point = axisPoint(index, total, LABEL_RADIUS);
                const anchor = labelAnchor(point.angle);
                const selected = isNodeSelected(node.id, mode, experienceSelection);
                const inactive = isNodeInactive(node.id, mode, experienceSelection);
                const labelValue =
                  mode === 'experience'
                    ? `${node.proficiency}%`
                    : `${getEducationHours(node, educationSelection)}h`;
                const offsetX = anchor === 'start' ? 2 : anchor === 'end' ? -2 : 0;
                const labelX = point.x + offsetX;

                return (
                  <text
                    key={`${node.id}-label`}
                    x={labelX}
                    y={point.y}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    className={[
                      'skills-inventory-chart__vertex-label',
                      selected ? 'skills-inventory-chart__vertex-label--active' : '',
                      inactive ? 'skills-inventory-chart__vertex-label--inactive' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <tspan
                      x={labelX}
                      dy="-0.55em"
                      className={[
                        'skills-inventory-chart__vertex-name',
                        selected ? 'skills-inventory-chart__vertex-name--active' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {node.shortLabel}
                    </tspan>
                    <tspan
                      x={labelX}
                      dy="1.2em"
                      className={[
                        'skills-inventory-chart__vertex-value',
                        mode === 'experience'
                          ? 'skills-inventory-chart__vertex-value--blue'
                          : 'skills-inventory-chart__vertex-value--pink',
                        selected ? 'skills-inventory-chart__vertex-value--active' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {labelValue}
                    </tspan>
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <footer className="skills-inventory-chart__footer">
        <div className="skills-inventory-chart__toggle" role="tablist" aria-label="Skills view mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'experience'}
            className={[
              'skills-inventory-chart__toggle-btn',
              mode === 'experience' ? 'skills-inventory-chart__toggle-btn--active' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setMode('experience')}
          >
            Experience
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'education'}
            className={[
              'skills-inventory-chart__toggle-btn',
              mode === 'education' ? 'skills-inventory-chart__toggle-btn--active' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setMode('education')}
          >
            Education
          </button>
        </div>

        {mode === 'experience' ? (
          <select
            className="skills-inventory-chart__select"
            value={experienceSelection}
            onChange={event => setExperienceSelection(event.target.value)}
            aria-label="Select key card"
          >
            {experienceSelectOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            className="skills-inventory-chart__select"
            value={educationSelection}
            onChange={event => setEducationSelection(event.target.value as EducationFilter)}
            aria-label="Select training type"
          >
            {EDUCATION_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </footer>
    </section>
  );
};

export default SkillsInventoryChart;
