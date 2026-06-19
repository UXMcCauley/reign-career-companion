import { useId, useMemo, useState } from 'react';
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

const SkillsInventoryChart: React.FC<SkillsInventoryChartProps> = ({
  nodes,
  experienceOptions,
  className
}) => {
  const blueGradientId = useId();
  const pinkGradientId = useId();
  const [mode, setMode] = useState<ViewMode>('experience');
  const [experienceSelection, setExperienceSelection] = useState('all');
  const [educationSelection, setEducationSelection] = useState<EducationFilter>('education');

  const experienceSelectOptions = useMemo(
    () => [{ id: 'all', label: 'All key cards' }, ...experienceOptions],
    [experienceOptions]
  );

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

        <div className="skills-inventory-chart__controls-row">
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
        </div>
      </header>

      <div className="skills-inventory-chart__chart">
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
            const offsetX =
              anchor === 'start' ? 2 : anchor === 'end' ? -2 : 0;
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
    </section>
  );
};

export default SkillsInventoryChart;
