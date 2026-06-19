import './shortsViz.css';

export type TabPill = {
  id: string;
  label: string;
};

export type TabPillsShortProps = {
  tabs: TabPill[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

const TabPillsShort: React.FC<TabPillsShortProps> = ({ tabs, activeId, onChange, className }) => (
  <div className={['sv-tab-pills', className].filter(Boolean).join(' ')} role="tablist">
    {tabs.map(tab => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={tab.id === activeId}
        className={['sv-tab-pill', tab.id === activeId ? 'sv-tab-pill--active' : ''].filter(Boolean).join(' ')}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default TabPillsShort;
