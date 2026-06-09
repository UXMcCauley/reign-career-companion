import './ChartPrimitives.css';

type Segment = {
  label: string;
  percent: number;
  startColor: string;
  endColor: string;
};

type CareerOverviewChartProps = {
  title: string;
  segments: Segment[];
  percentageLabelFormat?: (segment: Segment) => string;
};

const CareerOverviewChart: React.FC<CareerOverviewChartProps> = ({
  title,
  segments,
  percentageLabelFormat = segment => `${segment.percent}%`
}) => {
  const normalized = segments.map(segment => ({
    ...segment,
    percent: Math.max(0, Math.min(100, segment.percent))
  }));

  return (
    <div className="career-overview-chart">
      <h4 className="chart-card-title">{title}</h4>
      <div className="career-overview-track">
        {normalized.map(segment => (
          <div
            key={segment.label}
            className="career-overview-segment"
            style={{
              width: `${segment.percent}%`,
              background: `linear-gradient(135deg, ${segment.startColor}, ${segment.endColor})`
            }}
            title={`${segment.label} - ${segment.percent}%`}
          >
            {percentageLabelFormat(segment)}
          </div>
        ))}
      </div>
      <div className="career-overview-label">
        {normalized.map(segment => `${segment.label} - ${segment.percent}%`).join(' | ')}
      </div>
    </div>
  );
};

export default CareerOverviewChart;
