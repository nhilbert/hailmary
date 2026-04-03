import { useTranslation } from 'react-i18next';
import type { TimelineEvent } from './types';
import { PHASE_COLORS } from './data';

const C_MPS = 299_792_458;

function fmtVelocity(mps: number): string {
  const frac = mps / C_MPS;
  if (frac >= 0.01) return `${frac.toFixed(2)}c`;
  const kms = mps / 1000;
  if (kms >= 1) return `${kms.toFixed(0)} km/s`;
  return `${mps.toFixed(0)} m/s`;
}

interface SpeedChartProps {
  events: TimelineEvent[];
  activeIndex: number;
}

function SpeedChart({ events, activeIndex }: SpeedChartProps) {
  const totalHours = events.reduce((s, e) => s + e.durationHours, 0);
  const maxV = Math.max(...events.map((e) => Math.max(e.startVelocityMps, e.endVelocityMps)), 1);

  // SVG layout constants
  const W = 400, H = 80;
  const ML = 42, MR = 8, MT = 8, MB = 18;
  const cw = W - ML - MR;  // chart width
  const ch = H - MT - MB;  // chart height

  const tx = (hours: number) => ML + (hours / totalHours) * cw;
  const ty = (mps: number)   => MT + ch - (mps / maxV) * ch;

  let elapsed = 0;
  const segments = events.map((event) => {
    const x1 = tx(elapsed);
    const y1 = ty(event.startVelocityMps);
    elapsed += event.durationHours;
    const x2 = tx(elapsed);
    const y2 = ty(event.endVelocityMps);
    return { x1, y1, x2, y2, color: PHASE_COLORS[event.phase], phase: event.phase };
  });

  const yMid = ty(maxV / 2);

  return (
    <svg
      className="speed-chart"
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {/* Axes */}
      <line x1={ML} y1={MT} x2={ML} y2={MT + ch} stroke="var(--border)" strokeWidth="1" />
      <line x1={ML} y1={MT + ch} x2={ML + cw} y2={MT + ch} stroke="var(--border)" strokeWidth="1" />

      {/* Midpoint grid line */}
      <line x1={ML} y1={yMid} x2={ML + cw} y2={yMid}
        stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />

      {/* Y axis labels */}
      <text x={ML - 4} y={MT + ch} textAnchor="end" dominantBaseline="middle"
        className="speed-chart-label">0</text>
      <text x={ML - 4} y={yMid} textAnchor="end" dominantBaseline="middle"
        className="speed-chart-label">{fmtVelocity(maxV / 2)}</text>
      <text x={ML - 4} y={MT} textAnchor="end" dominantBaseline="middle"
        className="speed-chart-label">{fmtVelocity(maxV)}</text>

      {/* Speed segments */}
      {segments.map((seg, i) => (
        <line
          key={i}
          x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
          stroke={seg.color}
          strokeWidth={i === activeIndex ? 3 : 2}
          strokeLinecap="round"
          opacity={i === activeIndex ? 1 : 0.7}
        />
      ))}

      {/* Active segment endpoint dot */}
      {segments[activeIndex] && (
        <circle
          cx={segments[activeIndex].x2}
          cy={segments[activeIndex].y2}
          r={3}
          fill={segments[activeIndex].color}
        />
      )}
    </svg>
  );
}

interface MissionTimelineProps {
  events: TimelineEvent[];
  activeIndex: number;
  onScrub: (index: number) => void;
  coastFractionUsed?: number;
  initialShieldKg?: number;
}

function fmtDuration(hours: number): string {
  if (hours >= 8_760) return `${(hours / 8_760).toFixed(1)} yr`;
  if (hours >= 24)    return `${(hours / 24).toFixed(1)} d`;
  return `${hours.toFixed(1)} h`;
}

function fmtMass(kg: number): string {
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)} t`;
  return `${kg.toFixed(0)} kg`;
}

export const MissionTimeline = ({
  events,
  activeIndex,
  onScrub,
  coastFractionUsed,
  initialShieldKg,
}: MissionTimelineProps) => {
  const { t } = useTranslation();

  if (events.length === 0) {
    return <p>{t('timelineEmpty')}</p>;
  }

  const totalEarth   = events.reduce((s, e) => s + e.durationHours,        0);
  const totalOnboard = events.reduce((s, e) => s + e.durationHoursOnboard, 0);
  const finalShield  = events[events.length - 1]?.shieldRemainingKg ?? 0;
  const shieldDepleted = (initialShieldKg ?? 0) > 0 && finalShield <= 0;

  return (
    <section aria-label={t('timelineTitle')} className="timeline">
      <h3>{t('timelineTitle')}</h3>

      {coastFractionUsed !== undefined && (
        <p className="timeline-coast-note">
          {t('timelineCoastNote', { pct: (coastFractionUsed * 100).toFixed(1) })}
        </p>
      )}

      {shieldDepleted && (
        <p className="timeline-shield-warn" role="alert">
          {t('timelineShieldWarn')}
        </p>
      )}

      {/* Speed profile chart */}
      <SpeedChart events={events} activeIndex={activeIndex} />

      {/* Relativistic time comparison table */}
      <table className="timeline-table">
        <thead>
          <tr>
            <th>{t('timelinePhase')}</th>
            <th>{t('timelineShipTime')}</th>
            <th>{t('timelineEarthTime')}</th>
            {(initialShieldKg ?? 0) > 0 && <th>{t('timelineShield')}</th>}
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
              {(initialShieldKg ?? 0) > 0 && (
                <td>{fmtMass(event.shieldRemainingKg)}</td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{t('timelineTotal')}</td>
            <td>{fmtDuration(totalOnboard)}</td>
            <td>{fmtDuration(totalEarth)}</td>
            {(initialShieldKg ?? 0) > 0 && <td>{fmtMass(finalShield)}</td>}
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
