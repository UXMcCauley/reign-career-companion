import { IonIcon } from '@ionic/react';
import { trendingUpOutline } from 'ionicons/icons';
import './shortsViz.css';

export type MetricShortCardProps = {
  title: string;
  value: string | number;
  glowColor?: string;
  trendIcon?: React.ReactNode;
  className?: string;
};

const MetricShortCard: React.FC<MetricShortCardProps> = ({
  title,
  value,
  glowColor,
  trendIcon,
  className
}) => (
  <article
    className={['sv-card sv-metric-short', className].filter(Boolean).join(' ')}
    style={glowColor ? ({ '--sv-metric-glow': glowColor } as React.CSSProperties) : undefined}
  >
    <h4 className="sv-metric-short__title">{title}</h4>
    <div className="sv-metric-short__value-row">
      <p className="sv-metric-short__value">{value}</p>
      <span className="sv-metric-short__trend" aria-hidden="true">
        {trendIcon ?? <IonIcon icon={trendingUpOutline} />}
      </span>
    </div>
  </article>
);

export default MetricShortCard;
