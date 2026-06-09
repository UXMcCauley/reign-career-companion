import './ChartPrimitives.css';

type SuccessSegment = {
  label: string;
  weight: number;
  startColor: string;
  endColor: string;
};

type SuccessProbabilityChartProps = {
  title: string;
  value: number;
  valueLabel?: string;
  segments: SuccessSegment[];
};

const SuccessProbabilityChart: React.FC<SuccessProbabilityChartProps> = ({
  title,
  value,
  valueLabel,
  segments
}) => {
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0) || 1;
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="success-chart">
      <h4 className="chart-card-title">{title}</h4>
      <div className="success-track">
        {segments.map(segment => (
          <div
            key={segment.label}
            className="success-segment"
            style={{
              width: `${(segment.weight / totalWeight) * 100}%`,
              background: `linear-gradient(135deg, ${segment.startColor}, ${segment.endColor})`
            }}
          >
            {segment.label}
          </div>
        ))}
        <div className="success-marker" style={{ left: `${clampedValue}%` }} />
      </div>
      <div className="success-value-label">{valueLabel ?? `${clampedValue}%`}</div>
    </div>
  );
};

export default SuccessProbabilityChart;
