import { useId } from 'react';
import './SkillsInventoryChart.css';

export type SkillsInventoryNode = {
  id: string;
  label: string;
  shortLabel: string;
  proficiency: number;
  trainingHours: number;
  emphasis: string;
};

export type SkillsInventoryChartProps = {
  title?: string;
  subtitle?: string;
  proficiencyLabel?: string;
  trainingLabel?: string;
  nodes: SkillsInventoryNode[];
  maxTrainingHours?: number;
  className?: string;
};

const CENTER = 120;
const MAX_RADIUS = 78;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function axisPoint(index: number, total: number, radius: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle)
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

const SkillsInventoryChart: React.FC<SkillsInventoryChartProps> = ({
  title = 'Skills in Inventory',
  subtitle = 'Trade proficiency rises with education, certification, and apprenticeship hours across active key cards.',
  proficiencyLabel = 'Trade proficiency',
  trainingLabel = 'Education, certs & apprenticeships',
  nodes,
  maxTrainingHours,
  className
}) => {
  const blueGradientId = useId();
  const pinkGradientId = useId();

  if (!nodes.length) {
    return null;
  }

  const total = nodes.length;
  const trainingCap =
    maxTrainingHours ?? Math.max(...nodes.map(node => node.trainingHours), 1);

  const proficiencyValues = nodes.map(node => clamp(node.proficiency, 0, 100));
  const trainingValues = nodes.map(node =>
    clamp((node.trainingHours / trainingCap) * 100, 0, 100)
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
    <div className={['skills-inventory-chart', className].filter(Boolean).join(' ')}>
      <div className="skills-inventory-chart__header">
        <h4 className="skills-inventory-chart__title">{title}</h4>
        {subtitle ? <p className="skills-inventory-chart__subtitle">{subtitle}</p> : null}
      </div>

      <div className="skills-inventory-chart__stage">
        <svg
          className="skills-inventory-chart__svg"
          viewBox="0 0 240 240"
          role="img"
          aria-label={`${title} radar chart`}
        >
          <defs>
            <radialGradient id={blueGradientId} cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="rgba(6, 119, 240, 0.4)" />
              <stop offset="100%" stopColor="rgba(15, 47, 115, 0.06)" />
            </radialGradient>
            <radialGradient id={pinkGradientId} cx="50%" cy="55%" r="58%">
              <stop offset="0%" stopColor="rgba(255, 0, 230, 0.32)" />
              <stop offset="100%" stopColor="rgba(183, 0, 100, 0.06)" />
            </radialGradient>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={MAX_RADIUS + 14} className="skills-inventory-chart__halo" />

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
                x1={CENTER}
                y1={CENTER}
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
            const point = axisPoint(index, total, (value / 100) * MAX_RADIUS);
            return (
              <circle
                key={`proficiency-${nodes[index].id}`}
                cx={point.x}
                cy={point.y}
                r="4"
                className="skills-inventory-chart__node skills-inventory-chart__node--proficiency"
              />
            );
          })}

          {trainingValues.map((value, index) => {
            const point = axisPoint(index, total, (value / 100) * MAX_RADIUS);
            return (
              <circle
                key={`training-${nodes[index].id}`}
                cx={point.x}
                cy={point.y}
                r="3.5"
                className="skills-inventory-chart__node skills-inventory-chart__node--training"
              />
            );
          })}
        </svg>
      </div>

      <div className="skills-inventory-chart__legend">
        <span className="skills-inventory-chart__legend-item">
          <span className="skills-inventory-chart__legend-swatch skills-inventory-chart__legend-swatch--proficiency" />
          {proficiencyLabel}
        </span>
        <span className="skills-inventory-chart__legend-item">
          <span className="skills-inventory-chart__legend-swatch skills-inventory-chart__legend-swatch--training" />
          {trainingLabel}
        </span>
      </div>

      <ul className="skills-inventory-chart__nodes">
        {nodes.map(node => (
          <li key={node.id} className="skills-inventory-chart__node-card">
            <div className="skills-inventory-chart__node-head">
              <strong>{node.shortLabel}</strong>
              <span className="skills-inventory-chart__node-metrics">
                <span className="skills-inventory-chart__metric-blue">{node.proficiency}%</span>
                <span className="skills-inventory-chart__metric-pink">{node.trainingHours}h</span>
              </span>
            </div>
            <p>{node.emphasis}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SkillsInventoryChart;
