import { IonIcon } from '@ionic/react';
import { openOutline } from 'ionicons/icons';
import './shortsViz.css';

export type ListLinkShortProps = {
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
};

const ListLinkShort: React.FC<ListLinkShortProps> = ({ label, onClick, href, className }) => {
  const content = (
    <>
      <span>{label}</span>
      <IonIcon icon={openOutline} className="sv-list-link__icon" aria-hidden="true" />
    </>
  );

  if (href) {
    return (
      <a className={['sv-list-link', className].filter(Boolean).join(' ')} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={['sv-list-link', className].filter(Boolean).join(' ')} onClick={onClick}>
      {content}
    </button>
  );
};

export default ListLinkShort;
