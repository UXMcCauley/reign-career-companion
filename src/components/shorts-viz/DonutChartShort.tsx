import type { DonutSegment } from './types';
import './shortsViz.css';

export type DonutChartShortProps = {
  title?: string;
  centerTitle?: string;
  centerValue?: string;
  segments: DonutSegment[];
  className?: string;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DonutChartShort: React.FC<DonutChartShortProps> = ({
  title,
  centerTitle = 'Total Activities',
  centerValue,
  segments,
  className
}) => {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0) || 1;
  let offset = 0;

  const resolvedCenterValue =
    centerValue ??
    `${Math.round(segments.reduce((sum, segment) => sum + segment.value, 0))}%`;

  return (
    <div className={['sv-donut', className].filter(Boolean).join(' ')}>
      {title ? <h4 className="sv-donut__title">{title}</h4> : null}
      <svg className="sv-donut__svg" viewBox="0 0 140 140" role="img" aria-label={title ?? 'Donut chart'}>
        <circle cx="70" cy="70" r={RADIUS} className="sv-donut__track" />
        {segments.map(segment => {
          const length = (Math.max(0, segment.value) / total) * CIRCUMFERENCE;
          const dasharray = `${length} ${CIRCUMFERENCE - length}`;
          const dashoffset = -offset;
          offset += length;

          return (
            <circle
              key={segment.label}
              cx="70"
              cy="70"
              r={RADIUS}
              className="sv-donut__segment"
              stroke={segment.color}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 70 70)"
            />
          );
        })}
        <text x="70" y="64" textAnchor="middle" className="sv-donut__center-title">
          {centerTitle}
        </text>
        <text x="70" y="84" textAnchor="middle" className="sv-donut__center-value">
          {resolvedCenterValue}
        </text>
      </svg>

      <div className="sv-donut__legend">
        {segments.map(segment => {
          const percent = Math.round((Math.max(0, segment.value) / total) * 100);
          return (
            <div key={segment.label} className="sv-donut__legend-item">
              <span className="sv-donut__legend-left">
                <span className="sv-donut__legend-dot" style={{ background: segment.color }} />
                {segment.label}
              </span>
              <span>{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonutChartShort;
