import './shortsViz.css';

export type LinearProgressShortProps = {
  title: string;
  value: number;
  valueLabel?: string;
  className?: string;
};

const LinearProgressShort: React.FC<LinearProgressShortProps> = ({
  title,
  value,
  valueLabel,
  className
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={['sv-linear-progress', className].filter(Boolean).join(' ')}>
      <div className="sv-linear-progress__header">
        <h4 className="sv-linear-progress__title">{title}</h4>
        <span className="sv-linear-progress__value">{valueLabel ?? `${clamped}%`}</span>
      </div>
      <div className="sv-linear-progress__track" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className="sv-linear-progress__fill" style={{ width: `${clamped}%` }} />
        <span className="sv-linear-progress__handle" style={{ left: `${clamped}%` }} aria-hidden="true" />
      </div>
    </div>
  );
};

export default LinearProgressShort;
