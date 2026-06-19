import './shortsViz.css';

export type FeatureGridCardProps = {
  label: string;
  icon: React.ReactNode;
  glowColor?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
};

const FeatureGridCard: React.FC<FeatureGridCardProps> = ({
  label,
  icon,
  glowColor,
  onClick,
  href,
  className
}) => {
  const classes = ['sv-card sv-feature-grid-card', className].filter(Boolean).join(' ');
  const style = glowColor ? ({ '--sv-feature-glow': glowColor } as React.CSSProperties) : undefined;

  if (href) {
    return (
      <a className={classes} href={href} style={style}>
        <span className="sv-feature-grid-card__icon">{icon}</span>
        <p className="sv-feature-grid-card__label">{label}</p>
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} style={style}>
      <span className="sv-feature-grid-card__icon">{icon}</span>
      <p className="sv-feature-grid-card__label">{label}</p>
    </button>
  );
};

export default FeatureGridCard;
