import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { solveRoute } from './api';
import { STARS } from './data';
import { GalaxyViewport } from './GalaxyViewport';
import { MissionTimeline } from './MissionTimeline';
import { ShipParametersForm } from './ShipParametersForm';
import type { ManeuverSegment, ShipParameters, TimelineEvent } from './types';

const defaultShip: ShipParameters = {
  engineClass: 'warp',
  cargoMassTons: 60,
  maxBurnHours: 24,
  safetyMarginPct: 15
};

const buildTimeline = (segments: ManeuverSegment[]): TimelineEvent[] => {
  let elapsed = 0;
  return segments.map((segment) => {
    elapsed += segment.durationHours;
    return {
      id: `${segment.id}-${elapsed}`,
      label: `${segment.phase}: ${segment.fromStarId} → ${segment.toStarId}`,
      phase: segment.phase,
      segmentId: segment.id,
      targetStarId: segment.toStarId,
      elapsedHours: elapsed
    };
  });
};

export const GalaxyWorkspace = () => {
  const { t } = useTranslation();
  const [selectedStarId, setSelectedStarId] = useState(STARS[0].id);
  const [routeStartId, setRouteStartId] = useState(STARS[0].id);
  const [routeEndId, setRouteEndId] = useState(STARS[1].id);
  const [ship, setShip] = useState<ShipParameters>(defaultShip);
  const [segments, setSegments] = useState<ManeuverSegment[]>([]);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [status, setStatus] = useState('');
  const [solving, setSolving] = useState(false);

  const selectedStar = STARS.find((star) => star.id === selectedStarId) ?? STARS[0];
  const timeline = useMemo(() => buildTimeline(segments), [segments]);

  const activeSegmentId = timeline[timelineIndex]?.segmentId ?? null;

  const handleSolve = async () => {
    if (!routeStartId || !routeEndId || routeStartId === routeEndId) {
      setStatus(t('routeInvalid'));
      return;
    }

    setSolving(true);
    setStatus('');
    try {
      const response = await solveRoute({ startStarId: routeStartId, endStarId: routeEndId, ship });
      setSegments(response.segments);
      setTimelineIndex(0);
      setStatus(t('routeSolved', { count: response.segments.length }));
    } catch {
      setStatus(t('routeFailed'));
      setSegments([]);
    } finally {
      setSolving(false);
    }
  };

  return (
    <section className="galaxy-layout" aria-label={t('mainHeading')}>
      <GalaxyViewport
        stars={STARS}
        selectedStarId={selectedStarId}
        onSelectStar={setSelectedStarId}
        segments={segments}
        activeSegmentId={activeSegmentId}
      />

      <aside className="details-panel" aria-live="polite">
        <h3>{t('detailPanel')}</h3>
        <p>
          <strong>{selectedStar.name}</strong>
        </p>
        <p>{selectedStar.description}</p>
        <dl>
          <dt>{t('constellation')}</dt>
          <dd>{selectedStar.constellation}</dd>
          <dt>{t('magnitude')}</dt>
          <dd>{selectedStar.magnitude}</dd>
          <dt>{t('distanceLy')}</dt>
          <dd>{selectedStar.distanceLightYears}</dd>
        </dl>

        <div className="route-controls">
          <label htmlFor="route-start">{t('routeStart')}</label>
          <select id="route-start" value={routeStartId} onChange={(event) => setRouteStartId(event.target.value)}>
            {STARS.map((star) => (
              <option key={star.id} value={star.id}>
                {star.name}
              </option>
            ))}
          </select>

          <label htmlFor="route-end">{t('routeEnd')}</label>
          <select id="route-end" value={routeEndId} onChange={(event) => setRouteEndId(event.target.value)}>
            {STARS.map((star) => (
              <option key={star.id} value={star.id}>
                {star.name}
              </option>
            ))}
          </select>
        </div>

        <ShipParametersForm value={ship} onChange={setShip} onSubmit={() => void handleSolve()} loading={solving} />

        <MissionTimeline
          events={timeline}
          activeIndex={Math.min(timelineIndex, Math.max(timeline.length - 1, 0))}
          onScrub={(index) => {
            setTimelineIndex(index);
            const target = timeline[index];
            if (target) {
              setSelectedStarId(target.targetStarId);
            }
          }}
        />

        <p aria-live="polite">{status}</p>
      </aside>
    </section>
  );
};
