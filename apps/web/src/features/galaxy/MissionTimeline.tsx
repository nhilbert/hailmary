import { useTranslation } from 'react-i18next';
import type { TimelineEvent } from './types';
import { PHASE_COLORS } from './data';

interface MissionTimelineProps {
  events: TimelineEvent[];
  activeIndex: number;
  onScrub: (index: number) => void;
}

function fmtDuration(hours: number): string {
  if (hours >= 8_760) return `${(hours / 8_760).toFixed(1)} yr`;
  if (hours >= 24)    return `${(hours / 24).toFixed(1)} d`;
  return `${hours.toFixed(1)} h`;
}

export const MissionTimeline = ({ events, activeIndex, onScrub }: MissionTimelineProps) => {
  const { t } = useTranslation();

  if (events.length === 0) {
    return <p>{t('timelineEmpty')}</p>;
  }

  const totalEarth   = events.reduce((s, e) => s + e.durationHours,        0);
  const totalOnboard = events.reduce((s, e) => s + e.durationHoursOnboard, 0);
  const activeEvent  = events[activeIndex] ?? events[0];

  return (
    <section aria-label={t('timelineTitle')} className="timeline">
      <h3>{t('timelineTitle')}</h3>

      {/* Relativistic time comparison table */}
      <table className="timeline-table">
        <thead>
          <tr>
            <th>{t('timelinePhase')}</th>
            <th>{t('timelineShipTime')}</th>
            <th>{t('timelineEarthTime')}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                <span aria-hidden="true" className="phase-dot" style={{ background: PHASE_COLORS[event.phase] }} />
                {t(`phase.${event.phase}`)}
              </td>
              <td>{fmtDuration(event.durationHoursOnboard)}</td>
              <td>{fmtDuration(event.durationHours)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{t('timelineTotal')}</td>
            <td>{fmtDuration(totalOnboard)}</td>
            <td>{fmtDuration(totalEarth)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Scrubber for 3D viewport sync */}
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

      {/* Segment list */}
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
