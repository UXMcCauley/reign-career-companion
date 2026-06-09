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

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
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
  const clamped = Math.max(0, Math.min(max, value));
  const startColor = gradient[0] ?? '#7D2EFF';
  const endColor = gradient[1] ?? '#EF2C7B';
  const ratio = max > 0 ? clamped / max : 0;
  const startAngle = 180;
  const endAngle = 360;
  const activeEnd = startAngle + (endAngle - startAngle) * ratio;
  const centerX = 100;
  const centerY = 100;
  const radius = 72;

  const trackPath = describeArc(centerX, centerY, radius, startAngle, endAngle);
  const activePath = describeArc(centerX, centerY, radius, startAngle, activeEnd);

  const needleAngle = startAngle + (endAngle - startAngle) * ratio;
  const needleTip = polarToCartesian(centerX, centerY, 48, needleAngle);

  return (
    <div className="gauge-chart-wrap">
      <h4 className="chart-card-title">{title}</h4>
      <svg className="gauge-svg" viewBox="0 0 200 130" role="img" aria-label={`${title} ${clamped} out of ${max}`}>
        <defs>
          <linearGradient id={`${title}-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
        <path d={trackPath} className="gauge-track" />
        <path d={activePath} className="gauge-progress" style={{ stroke: `url(#${title}-gradient)` }} />
        <line x1={centerX} y1={centerY} x2={needleTip.x} y2={needleTip.y} className="gauge-needle" strokeWidth="3.5" />
        <circle cx={centerX} cy={centerY} r="6" className="gauge-center-dot" />
      </svg>
      <div className="gauge-value">{valueLabel ?? clamped.toFixed(1)}</div>
      <div className="gauge-end-labels">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
};

export default GaugeChart;
