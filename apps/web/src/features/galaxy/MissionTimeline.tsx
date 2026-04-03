import { useTranslation } from 'react-i18next';
import type { TimelineEvent } from './types';
import { PHASE_COLORS } from './data';

interface MissionTimelineProps {
  events: TimelineEvent[];
  activeIndex: number;
  onScrub: (index: number) => void;
}

export const MissionTimeline = ({ events, activeIndex, onScrub }: MissionTimelineProps) => {
  const { t } = useTranslation();

  if (events.length === 0) {
    return <p>{t('timelineEmpty')}</p>;
  }

  const activeEvent = events[activeIndex] ?? events[0];

  return (
    <section aria-label={t('timelineTitle')} className="timeline">
      <h3>{t('timelineTitle')}</h3>
      <label htmlFor="timeline-scrubber">{t('timelineScrubber')}</label>
      <input
        id="timeline-scrubber"
        type="range"
        min={0}
        max={events.length - 1}
        value={activeIndex}
        aria-valuetext={t('timelineValueText', { index: activeIndex + 1, total: events.length })}
        onChange={(event) => onScrub(Number(event.target.value))}
      />
      <p aria-live="polite">
        {t('timelineNow', {
          label: activeEvent.label,
          elapsedHours: activeEvent.elapsedHours.toFixed(1)
        })}
      </p>
      <ol>
        {events.map((item, index) => (
          <li key={item.id} className={index === activeIndex ? 'timeline-active' : ''}>
            <span aria-hidden="true" className="phase-dot" style={{ background: PHASE_COLORS[item.phase] }} />
            {item.label}
          </li>
        ))}
      </ol>
    </section>
  );
};
