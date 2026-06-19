import './ChartPrimitives.css';

type GaugeChartProps = {
  title: string;
  value: number;
  max: number;
  startLabel: string;
  endLabel: string;
  color: string;
  valueLabel?: string;
  subtitle?: string;
};

const CENTER_X = 100;
const CENTER_Y = 112;
const RADIUS = 76;
const STROKE_WIDTH = 16;
const START_ANGLE = 180;
const END_ANGLE = 0;
const TICK_OUTER = RADIUS - STROKE_WIDTH / 2 - 1;
const TICK_INNER = TICK_OUTER - 6;

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY - radius * Math.sin(angleInRadians)
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
  const delta = Math.abs(endAngle - startAngle);
  const largeArcFlag = delta > 180 ? 1 : 0;
  // Sweep 1 traces the upper semicircle from left (0) to right (max).
  const sweep = 1;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweep} ${end.x} ${end.y}`;
}

function formatRemaining(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const GaugeChart: React.FC<GaugeChartProps> = ({
  title,
  value,
  max,
  startLabel,
  endLabel,
  color,
  valueLabel,
  subtitle
}) => {
  const clamped = Math.max(0, Math.min(max, value));
  const ratio = max > 0 ? clamped / max : 0;
  const activeAngle = START_ANGLE - (START_ANGLE - END_ANGLE) * ratio;
  const tickCount = Math.max(1, Math.round(max));

  const trackPath = describeArc(CENTER_X, CENTER_Y, RADIUS, START_ANGLE, END_ANGLE);
  const activePath =
    ratio > 0 ? describeArc(CENTER_X, CENTER_Y, RADIUS, START_ANGLE, activeAngle) : '';

  const displayValue = valueLabel ?? formatRemaining(clamped);
  const remaining = max - clamped;
  const displaySubtitle =
    subtitle ??
    (remaining > 0
      ? `${formatRemaining(remaining)} to reach ${endLabel}`
      : `At ${endLabel}`);

  const leftLabelPoint = polarToCartesian(CENTER_X, CENTER_Y, RADIUS, START_ANGLE);
  const rightLabelPoint = polarToCartesian(CENTER_X, CENTER_Y, RADIUS, END_ANGLE);

  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const angle = START_ANGLE - ((START_ANGLE - END_ANGLE) * index) / tickCount;
    return {
      outer: polarToCartesian(CENTER_X, CENTER_Y, TICK_OUTER, angle),
      inner: polarToCartesian(CENTER_X, CENTER_Y, TICK_INNER, angle)
    };
  });

  return (
    <div className="gauge-chart-wrap">
      <h4 className="chart-card-title">{title}</h4>
      <svg
        className="gauge-svg"
        viewBox="0 0 200 138"
        role="img"
        aria-label={`${title} ${clamped} out of ${max}`}
      >
        <path d={trackPath} className="gauge-track" />
        {activePath ? (
          <path d={activePath} className="gauge-progress" style={{ stroke: color }} />
        ) : null}

        {ticks.map((tick, index) => (
          <line
            key={`tick-${index}`}
            x1={tick.outer.x}
            y1={tick.outer.y}
            x2={tick.inner.x}
            y2={tick.inner.y}
            className="gauge-tick"
          />
        ))}

        <text
          x={CENTER_X}
          y={CENTER_Y - 18}
          textAnchor="middle"
          dominantBaseline="middle"
          className="gauge-center-value"
        >
          {displayValue}
        </text>
        <text
          x={CENTER_X}
          y={CENTER_Y + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="gauge-center-subtitle"
        >
          {displaySubtitle}
        </text>

        <text
          x={leftLabelPoint.x}
          y={leftLabelPoint.y + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          className="gauge-scale-label"
        >
          {startLabel}
        </text>
        <text
          x={rightLabelPoint.x}
          y={rightLabelPoint.y + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          className="gauge-scale-label"
        >
          {endLabel}
        </text>
      </svg>
    </div>
  );
};

export default GaugeChart;
