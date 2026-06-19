import type { TaskSliderItem } from './types';
import './shortsViz.css';

export type TaskProgressSliderListProps = {
  items: TaskSliderItem[];
  className?: string;
};

const TaskProgressSliderList: React.FC<TaskProgressSliderListProps> = ({ items, className }) => (
  <div className={['sv-task-slider-list', className].filter(Boolean).join(' ')}>
    {items.map(item => {
      const progress = Math.max(0, Math.min(100, item.progress));

      return (
        <div key={item.id} className="sv-task-slider">
          <div className="sv-task-slider__row">
            <div className="sv-task-slider__left">
              <span className="sv-task-slider__dot" style={{ background: item.color }} />
              <p className="sv-task-slider__title">{item.title}</p>
            </div>
            <span className="sv-task-slider__value">{item.value}</span>
          </div>
          <div
            className="sv-task-slider__track"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={item.statusLabel ?? item.title}
          >
            <span className="sv-task-slider__fill" style={{ width: `${progress}%`, background: item.color }} />
            <span className="sv-task-slider__thumb" style={{ left: `${progress}%` }} aria-hidden="true" />
          </div>
        </div>
      );
    })}
  </div>
);

export default TaskProgressSliderList;
