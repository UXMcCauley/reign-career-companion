/**
 * Weekly-progress header outline traced in a 400×118 viewBox.
 * Clockwise: rounded top, right wall, bottom-right tab pocket, bottom edge, rounded bottom-left.
 */
export const DOTTED_OUTLINE_PATH =
  'M 20 1 H 380 A 19 19 0 0 1 399 20 V 68 H 364 V 102 A 12 12 0 0 1 352 114 H 288 A 12 12 0 0 1 276 102 V 68 H 20 A 19 19 0 0 1 1 49 V 20 A 19 19 0 0 1 20 1 Z';

type DottedOutlineBorderProps = {
  className?: string;
};

const DottedOutlineBorder: React.FC<DottedOutlineBorderProps> = ({ className }) => (
  <svg
    className={['sv-dotted-outline', className].filter(Boolean).join(' ')}
    viewBox="0 0 400 118"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      d={DOTTED_OUTLINE_PATH}
      fill="none"
      stroke="rgba(255, 255, 255, 0.72)"
      strokeWidth="1"
      strokeDasharray="4 4"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

export default DottedOutlineBorder;
