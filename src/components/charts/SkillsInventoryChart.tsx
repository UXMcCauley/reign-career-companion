import { useState } from 'react';
import './SkillsInventoryChart.css';

export type SkillsInventoryNode = {
  id: string;
  label: string;
  shortLabel: string;
  proficiency: number;
  fullTimeHours: number;
  partTimeHours: number;
  contractHours: number;
  educationHours: number;
  certificationHours: number;
  apprenticeshipHours: number;
  location: string;
  organizations: string[];
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
type ExperienceFilter = 'all' | 'full-time' | 'part-time' | 'contract';
type EducationFilter = 'education' | 'certifications' | 'apprenticeship';

const EXPERIENCE_OPTIONS: { id: ExperienceFilter; label: string }[] = [
  { id: 'all',       label: 'All Work Experience' },
  { id: 'full-time', label: 'Full-time Employment' },
  { id: 'part-time', label: 'Part-time & Seasonal' },
  { id: 'contract',  label: 'Contract & Freelance' },
];

const EDUCATION_OPTIONS: { id: EducationFilter; label: string }[] = [
  { id: 'education',       label: 'Formal Education' },
  { id: 'certifications',  label: 'Certifications & Licenses' },
  { id: 'apprenticeship',  label: 'Apprenticeship & OJT' },
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

function getExperienceHours(node: SkillsInventoryNode, filter: ExperienceFilter): number {
  switch (filter) {
    case 'full-time': return node.fullTimeHours;
    case 'part-time': return node.partTimeHours;
    case 'contract':  return node.contractHours;
    default:          return node.fullTimeHours + node.partTimeHours + node.contractHours;
  }
}

function getEducationHours(node: SkillsInventoryNode, filter: EducationFilter): number {
  switch (filter) {
    case 'certifications':  return node.certificationHours;
    case 'apprenticeship':  return node.apprenticeshipHours;
    default:                return node.educationHours;
  }
}

const SkillsInventoryChart: React.FC<SkillsInventoryChartProps> = ({
  nodes,
  className
}) => {
  const [mode, setMode] = useState<ViewMode>('experience');
  const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>('all');
  const [educationFilter, setEducationFilter] = useState<EducationFilter>('education');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('all');

  if (!nodes.length) return null;

  const total = nodes.length;
  const groupWidth = (CHART_RIGHT - CHART_LEFT) / total;
  const barWidth = clamp(groupWidth * 0.55, 8, 28);

  const maxBarValue = mode === 'experience'
    ? Math.max(...nodes.map(n => getExperienceHours(n, experienceFilter)), 1)
    : Math.max(...nodes.map(n => getEducationHours(n, educationFilter)), 1);

  const hasSelection = selectedNodeId !== 'all';
  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

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
            const rawValue = mode === 'experience'
              ? getExperienceHours(node, experienceFilter)
              : getEducationHours(node, educationFilter);
            const barH = (rawValue / maxBarValue) * CHART_HEIGHT;

            const groupX = CHART_LEFT + i * groupWidth;
            const barX = groupX + (groupWidth - barWidth) / 2;
            const gradId = mode === 'experience' ? blueGradId : greenGradId;
            const isActive = !hasSelection || node.id === selectedNodeId;
            const isSelected = hasSelection && node.id === selectedNodeId;

            return (
              <g key={node.id}>
                {barH > 0.5 && (
                  <path
                    d={topRoundedBar(barX, CHART_BOTTOM - barH, barWidth, barH, BAR_RADIUS)}
                    fill={`url(#${gradId})`}
                    className={[
                      'skills-inventory-chart__bar',
                      isActive ? 'skills-inventory-chart__bar--active' : 'skills-inventory-chart__bar--dim',
                      isSelected
                        ? mode === 'experience'
                          ? 'skills-inventory-chart__bar--glow-blue'
                          : 'skills-inventory-chart__bar--glow-green'
                        : ''
                    ].filter(Boolean).join(' ')}
                  />
                )}
                <text
                  key={`label-${node.id}-${isSelected}`}
                  x={groupX + groupWidth / 2}
                  y={LABEL_Y}
                  textAnchor="middle"
                  className={[
                    'skills-inventory-chart__bar-label',
                    isSelected ? 'skills-inventory-chart__bar-label--selected' : '',
                    !isActive && !isSelected ? 'skills-inventory-chart__bar-label--dim' : ''
                  ].filter(Boolean).join(' ')}
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
              mode === 'experience'
                ? 'skills-inventory-chart__toggle-btn--active skills-inventory-chart__toggle-btn--blue'
                : ''
            ].filter(Boolean).join(' ')}
            onClick={() => setMode('experience')}
          >
            Work Experience
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'education'}
            className={[
              'skills-inventory-chart__toggle-btn',
              mode === 'education'
                ? 'skills-inventory-chart__toggle-btn--active skills-inventory-chart__toggle-btn--green'
                : ''
            ].filter(Boolean).join(' ')}
            onClick={() => setMode('education')}
          >
            Academics & Training
          </button>
        </div>

        {mode === 'experience' ? (
          <select
            className="skills-inventory-chart__select"
            value={experienceFilter}
            onChange={event => setExperienceFilter(event.target.value as ExperienceFilter)}
            aria-label="Filter by work experience type"
          >
            {EXPERIENCE_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <select
            className="skills-inventory-chart__select"
            value={educationFilter}
            onChange={event => setEducationFilter(event.target.value as EducationFilter)}
            aria-label="Filter by education type"
          >
            {EDUCATION_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        )}

        <select
          className="skills-inventory-chart__select skills-inventory-chart__select--skill"
          value={selectedNodeId}
          onChange={event => setSelectedNodeId(event.target.value)}
          aria-label="Select skill for details"
        >
          <option value="all">— Select a skill for details —</option>
          {nodes.map(node => (
            <option key={node.id} value={node.id}>{node.shortLabel}</option>
          ))}
        </select>

        {selectedNode && (
          <div className={[
            'skills-inventory-chart__detail',
            mode === 'experience'
              ? 'skills-inventory-chart__detail--blue'
              : 'skills-inventory-chart__detail--green'
          ].join(' ')}>
            <p className="skills-inventory-chart__detail-title">{selectedNode.label}</p>
            <div className="skills-inventory-chart__detail-grid">
              {mode === 'experience' ? (
                <>
                  <div className="skills-inventory-chart__detail-field">
                    <span className="skills-inventory-chart__detail-label">Full-time</span>
                    <span className="skills-inventory-chart__detail-value skills-inventory-chart__detail-value--blue">
                      {selectedNode.fullTimeHours.toLocaleString()}h
                    </span>
                  </div>
                  <div className="skills-inventory-chart__detail-field">
                    <span className="skills-inventory-chart__detail-label">Part-time</span>
                    <span className="skills-inventory-chart__detail-value">
                      {selectedNode.partTimeHours.toLocaleString()}h
                    </span>
                  </div>
                  <div className="skills-inventory-chart__detail-field">
                    <span className="skills-inventory-chart__detail-label">Contract</span>
                    <span className="skills-inventory-chart__detail-value">
                      {selectedNode.contractHours.toLocaleString()}h
                    </span>
                  </div>
                  <div className="skills-inventory-chart__detail-field">
                    <span className="skills-inventory-chart__detail-label">Total Hours</span>
                    <span className="skills-inventory-chart__detail-value">
                      {(selectedNode.fullTimeHours + selectedNode.partTimeHours + selectedNode.contractHours).toLocaleString()}h
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="skills-inventory-chart__detail-field">
                    <span className="skills-inventory-chart__detail-label">Formal Education</span>
                    <span className="skills-inventory-chart__detail-value skills-inventory-chart__detail-value--green">
                      {selectedNode.educationHours}h
                    </span>
                  </div>
                  <div className="skills-inventory-chart__detail-field">
                    <span className="skills-inventory-chart__detail-label">Certifications</span>
                    <span className="skills-inventory-chart__detail-value skills-inventory-chart__detail-value--green">
                      {selectedNode.certificationHours}h
                    </span>
                  </div>
                  <div className="skills-inventory-chart__detail-field">
                    <span className="skills-inventory-chart__detail-label">Apprenticeship</span>
                    <span className="skills-inventory-chart__detail-value skills-inventory-chart__detail-value--green">
                      {selectedNode.apprenticeshipHours}h
                    </span>
                  </div>
                  <div className="skills-inventory-chart__detail-field">
                    <span className="skills-inventory-chart__detail-label">Total Hours</span>
                    <span className="skills-inventory-chart__detail-value">
                      {(selectedNode.educationHours + selectedNode.certificationHours + selectedNode.apprenticeshipHours)}h
                    </span>
                  </div>
                </>
              )}
              <div className="skills-inventory-chart__detail-field skills-inventory-chart__detail-field--wide">
                <span className="skills-inventory-chart__detail-label">Location</span>
                <span className="skills-inventory-chart__detail-value">{selectedNode.location}</span>
              </div>
              <div className="skills-inventory-chart__detail-field skills-inventory-chart__detail-field--wide">
                <span className="skills-inventory-chart__detail-label">Organizations</span>
                <div className="skills-inventory-chart__detail-chips">
                  {selectedNode.organizations.map(org => (
                    <span key={org} className="skills-inventory-chart__detail-chip">{org}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </footer>
    </section>
  );
};

export default SkillsInventoryChart;
