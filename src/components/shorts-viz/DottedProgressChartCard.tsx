import { IonIcon } from '@ionic/react';
import { arrowForwardOutline } from 'ionicons/icons';
import DottedOutlineBorder from './DottedOutlineBorder';
import { SHORTS_VIZ_COLORS } from './tokens';
import type { BarChartConfig, ShortLink, ShortMetric } from './types';
import './shortsViz.css';

export type DottedProgressChartCardProps = {
  title: string;
  link?: ShortLink;
  metric: ShortMetric;
  chart: BarChartConfig;
  className?: string;
};

function resolveMaxValue(chart: BarChartConfig): number {
  if (chart.maxValue && chart.maxValue > 0) return chart.maxValue;
  const peak = chart.data.reduce((max, item) => Math.max(max, item.value), 0);
  return peak > 0 ? peak : 1;
}

function resolveTicks(maxValue: number, ticks?: number[]): number[] {
  if (ticks && ticks.length > 0) return ticks;
  const step = maxValue / 4;
  return [0, step, step * 2, step * 3, maxValue].map(value => Math.round(value));
}

const DottedProgressChartCard: React.FC<DottedProgressChartCardProps> = ({
  title,
  link,
  metric,
  chart,
  className
}) => {
  const maxValue = resolveMaxValue(chart);
  const yAxisTicks = resolveTicks(maxValue, chart.yAxisTicks);
  const metricTone = metric.tone ?? 'positive';

  const linkContent = link ? (
    <>
      {link.label}
      <IonIcon icon={arrowForwardOutline} aria-hidden="true" />
    </>
  ) : null;

  return (
    <section className={['sv-card sv-dotted-progress', className].filter(Boolean).join(' ')}>
      <header className="sv-dotted-progress__header">
        <DottedOutlineBorder />
        <div className="sv-dotted-progress__header-inner">
          <div className="sv-dotted-progress__top">
            <h3 className="sv-dotted-progress__title">{title}</h3>
            <div className="sv-dotted-progress__actions">
              {link &&
                (link.href ? (
                  <a className="sv-dotted-progress__link" href={link.href}>
                    {linkContent}
                  </a>
                ) : (
                  <button type="button" className="sv-dotted-progress__link" onClick={link.onClick}>
                    {linkContent}
                  </button>
                ))}
            </div>
          </div>
          <span
            className={`sv-dotted-progress__metric sv-dotted-progress__metric--${metricTone} sv-dotted-progress__metric--tab`}
            style={metric.backgroundColor ? { background: metric.backgroundColor } : undefined}
          >
            {metric.icon ? <span className="sv-dotted-progress__metric-icon">{metric.icon}</span> : null}
            <span>{metric.value}</span>
          </span>
        </div>
      </header>

      <div className="sv-dotted-progress__chart">
        {chart.subtitle ? <p className="sv-dotted-progress__chart-subtitle">{chart.subtitle}</p> : null}
        <div className="sv-dotted-progress__chart-body">
          <div className="sv-dotted-progress__y-axis" aria-hidden="true">
            {yAxisTicks.map(tick => (
              <span key={tick}>{String(tick).padStart(2, '0')}</span>
            ))}
          </div>

          <div className="sv-dotted-progress__plot" role="img" aria-label={`${title} bar chart`}>
            {yAxisTicks.slice(1).map((tick, index) => (
              <span
                key={tick}
                className="sv-dotted-progress__grid-line"
                style={{ bottom: `${(tick / maxValue) * 100}%` }}
                aria-hidden="true"
              />
            ))}

            {chart.data.map((bar, index) => {
              const heightPercent = Math.max(4, (bar.value / maxValue) * 100);
              const color =
                bar.color ??
                [SHORTS_VIZ_COLORS.green, SHORTS_VIZ_COLORS.gold, SHORTS_VIZ_COLORS.purple][index % 3];

              return (
                <div key={`${bar.label}-${index}`} className="sv-dotted-progress__bar-col">
                  <div
                    className="sv-dotted-progress__bar"
                    style={{
                      height: `${heightPercent}%`,
                      background: `linear-gradient(180deg, ${color}, rgba(8, 9, 18, 0.15))`
                    }}
                  />
                  <span
                    className={[
                      'sv-dotted-progress__bar-label',
                      bar.highlighted ? 'sv-dotted-progress__bar-label--active' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={bar.highlighted ? { color } : undefined}
                  >
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DottedProgressChartCard;
