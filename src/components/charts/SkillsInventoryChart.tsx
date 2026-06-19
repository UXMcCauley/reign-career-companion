import { useState } from 'react';
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
type ExperienceFilter = 'all' | 'full-time' | 'part-time' | 'contract' | 'internship' | 'volunteer';
type EducationFilter = 'education' | 'certifications' | 'apprenticeship';

const EXPERIENCE_OPTIONS: { id: ExperienceFilter; label: string }[] = [
  { id: 'all', label: 'All Experience' },
  { id: 'full-time', label: 'Full-time Employment' },
  { id: 'part-time', label: 'Part-time Employment' },
  { id: 'contract', label: 'Contract / Freelance' },
  { id: 'internship', label: 'Internship' },
  { id: 'volunteer', label: 'Volunteer Work' },
];

const EDUCATION_OPTIONS: { id: EducationFilter; label: string }[] = [
  { id: 'education', label: 'Formal Education' },
  { id: 'certifications', label: 'Certifications & Licenses' },
  { id: 'apprenticeship', label: 'Apprenticeship & OJT' },
];

const VIEWBOX_WIDTH = 500;
const VIEWBOX_HEIGHT = 290;
const CHART_TOP = 20;
const CHART_BOTTOM = 238;
const CHART_LEFT = 14;
const CHART_RIGHT = 486;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;
const LABEL_Y = 256;
const BAR_RADIUS = 5;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function topRoundedBar(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  const cr = Math.min(r, w / 2, h);
  return `M${x} ${y + h} L${x} ${y + cr} Q${x} ${y} ${x + cr} ${y} L${x + w - cr} ${y} Q${x + w} ${y} ${x + w} ${y + cr} L${x + w} ${y + h} Z`;
}

function getEducationHours(node: SkillsInventoryNode, filter: EducationFilter) {
  switch (filter) {
    case 'certifications': return node.certificationHours;
    case 'apprenticeship': return node.apprenticeshipHours;
    default: return node.educationHours;
  }
}

const SkillsInventoryChart: React.FC<SkillsInventoryChartProps> = ({
  nodes,
  className
}) => {
  const [mode, setMode] = useState<ViewMode>('experience');
  const [experienceSelection, setExperienceSelection] = useState<ExperienceFilter>('all');
  const [educationSelection, setEducationSelection] = useState<EducationFilter>('education');

  if (!nodes.length) return null;

  const total = nodes.length;
  const maxEduHours = Math.max(
    ...nodes.map(node => getEducationHours(node, educationSelection)),
    1
  );

  const groupWidth = (CHART_RIGHT - CHART_LEFT) / total;
  const barWidth = clamp(groupWidth * 0.55, 8, 28);

  const blueGradId = 'sic-blue-grad';
  const greenGradId = 'sic-green-grad';

  return (
    <section className={['skills-inventory-chart', className].filter(Boolean).join(' ')}>
      <header className="skills-inventory-chart__header">
        <h3 className="skills-inventory-chart__title">Skills Inventory</h3>
      </header>

      <div className="skills-inventory-chart__chart-area">
        <svg
          className="skills-inventory-chart__svg"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Skills Inventory bar chart"
        >
          <defs>
            <linearGradient id={blueGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(6, 119, 240, 1)" />
              <stop offset="100%" stopColor="rgba(6, 119, 240, 0.38)" />
            </linearGradient>
            <linearGradient id={greenGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(6, 197, 12, 1)" />
              <stop offset="100%" stopColor="rgba(6, 197, 12, 0.38)" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1].map(level => (
            <line
              key={level}
              x1={CHART_LEFT}
              y1={CHART_BOTTOM - level * CHART_HEIGHT}
              x2={CHART_RIGHT}
              y2={CHART_BOTTOM - level * CHART_HEIGHT}
              className="skills-inventory-chart__grid-line"
            />
          ))}

          <line
            x1={CHART_LEFT}
            y1={CHART_BOTTOM}
            x2={CHART_RIGHT}
            y2={CHART_BOTTOM}
            className="skills-inventory-chart__x-axis"
          />

          {nodes.map((node, i) => {
            const barH = mode === 'experience'
              ? (node.proficiency / 100) * CHART_HEIGHT
              : (getEducationHours(node, educationSelection) / maxEduHours) * CHART_HEIGHT;

            const groupX = CHART_LEFT + i * groupWidth;
            const barX = groupX + (groupWidth - barWidth) / 2;
            const gradId = mode === 'experience' ? blueGradId : greenGradId;

            return (
              <g key={node.id}>
                {barH > 0.5 && (
                  <path
                    d={topRoundedBar(barX, CHART_BOTTOM - barH, barWidth, barH, BAR_RADIUS)}
                    fill={`url(#${gradId})`}
                    className="skills-inventory-chart__bar"
                  />
                )}
                <text
                  x={groupX + groupWidth / 2}
                  y={LABEL_Y}
                  textAnchor="middle"
                  className="skills-inventory-chart__bar-label"
                >
                  {node.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <footer className="skills-inventory-chart__footer">
        <div className="skills-inventory-chart__toggle" role="tablist" aria-label="Skills view mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'experience'}
            className={[
              'skills-inventory-chart__toggle-btn',
              mode === 'experience' ? 'skills-inventory-chart__toggle-btn--active skills-inventory-chart__toggle-btn--blue' : ''
            ].filter(Boolean).join(' ')}
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
              mode === 'education' ? 'skills-inventory-chart__toggle-btn--active skills-inventory-chart__toggle-btn--green' : ''
            ].filter(Boolean).join(' ')}
            onClick={() => setMode('education')}
          >
            Education
          </button>
        </div>

        {mode === 'experience' ? (
          <select
            className="skills-inventory-chart__select"
            value={experienceSelection}
            onChange={event => setExperienceSelection(event.target.value as ExperienceFilter)}
            aria-label="Select experience type"
          >
            {EXPERIENCE_OPTIONS.map(option => (
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
            aria-label="Select education type"
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
