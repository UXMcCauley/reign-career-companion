import { useId } from 'react';
import './ChartPrimitives.css';

type GaugeChartProps = {
  title: string;
  value: number;
  max: number;
  startLabel: string;
  endLabel: string;
  gradient: string[];
  valueLabel?: string;
};

const CENTER_X = 100;
const CENTER_Y = 92;
const RADIUS = 72;
const START_ANGLE = 180;
const END_ANGLE = 0;

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const sweep = startAngle > endAngle ? 0 : 1;
  const delta = Math.abs(endAngle - startAngle);
  const largeArcFlag = delta > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweep} ${end.x} ${end.y}`;
}


const GaugeChart: React.FC<GaugeChartProps> = ({
  title,
  value,
  max,
  startLabel,
  endLabel,
  gradient,
  valueLabel
}) => {
  const gradientId = useId();
  const clamped = Math.max(0, Math.min(max, value));
  const ratio = max > 0 ? clamped / max : 0;
  const startColor = gradient[0] ?? '#038908';
  const endColor = gradient[1] ?? '#06c50c';
  const activeAngle = START_ANGLE - (START_ANGLE - END_ANGLE) * ratio;

  const trackPath = describeArc(CENTER_X, CENTER_Y, RADIUS, START_ANGLE, END_ANGLE);
  const activePath =
    ratio > 0 ? describeArc(CENTER_X, CENTER_Y, RADIUS, START_ANGLE, activeAngle) : '';

  const valuePoint = polarToCartesian(CENTER_X, CENTER_Y, RADIUS + 18, activeAngle);
  const leftPoint = polarToCartesian(CENTER_X, CENTER_Y, RADIUS, START_ANGLE);
  const rightPoint = polarToCartesian(CENTER_X, CENTER_Y, RADIUS, END_ANGLE);
  const displayValue = valueLabel ?? clamped.toFixed(1);

  return (
    <div className="gauge-chart-wrap">
      <h4 className="chart-card-title">{title}</h4>
      <svg
        className="gauge-svg"
        viewBox="0 0 200 118"
        role="img"
        aria-label={`${title} ${clamped} out of ${max}`}
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={leftPoint.x}
            y1={leftPoint.y}
            x2={rightPoint.x}
            y2={rightPoint.y}
          >
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>

        <path d={trackPath} className="gauge-track" />
        {activePath ? (
          <path d={activePath} className="gauge-progress" style={{ stroke: `url(#${gradientId})` }} />
        ) : null}

        {ratio > 0 ? (
          <g className="gauge-arc-value-wrap">
            <circle cx={valuePoint.x} cy={valuePoint.y} r="13" className="gauge-arc-value-bg" />
            <text
              x={valuePoint.x}
              y={valuePoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="gauge-arc-value"
            >
              {displayValue}
            </text>
          </g>
        ) : null}
      </svg>

      <div className="gauge-end-labels">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
};

export default GaugeChart;
