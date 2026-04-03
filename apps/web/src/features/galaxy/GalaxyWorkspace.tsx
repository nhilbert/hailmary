import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { solveRoute } from './api';
import { STARS } from './data';
import { GalaxyViewport } from './GalaxyViewport';
import { MissionTimeline } from './MissionTimeline';
import { ShipParametersForm } from './ShipParametersForm';
import type { ManeuverSegment, ShipParameters, TimelineEvent } from './types';
import { SCENARIO_PRESETS } from '../scenarios/presets';

const defaultShip: ShipParameters = {
  engineClass: 'warp',
  cargoMassTons: 60,
  maxBurnHours: 24,
  safetyMarginPct: 15
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

  const timeline = useMemo<TimelineEvent[]>(() => {
    let elapsed = 0;
    return segments.map((segment) => {
      elapsed += segment.durationHours;
      return {
        id: `${segment.id}-${elapsed}`,
        label: t('timelineSegmentLabel', {
          phase: t(`phase.${segment.phase}`),
          from: segment.fromStarId,
          to: segment.toStarId
        }),
        phase: segment.phase,
        segmentId: segment.id,
        targetStarId: segment.toStarId,
        elapsedHours: elapsed
      };
    });
  }, [segments, t]);

  const activeSegmentId = timeline[timelineIndex]?.segmentId ?? null;

  const applyScenario = (scenarioId: string) => {
    const scenario = SCENARIO_PRESETS.find((entry) => entry.id === scenarioId);
    if (!scenario) {
      return;
    }

    setSelectedStarId(scenario.focusStarId);
    setRouteStartId(scenario.routeStartId);
    setRouteEndId(scenario.routeEndId);
    setShip(scenario.ship);
    setSegments(scenario.segments);
    setTimelineIndex(0);
    setStatus(t('scenarioLoaded', { title: t(scenario.titleKey) }));
  };

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
        <p>{t(selectedStar.descriptionKey)}</p>
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

        <section aria-label={t('scenario.sectionTitle')}>
          <h3>{t('scenario.sectionTitle')}</h3>
          <p>{t('scenario.oneClickHint')}</p>
          <ul>
            {SCENARIO_PRESETS.map((scenario) => (
              <li key={scenario.id}>
                <button
                  type="button"
                  onClick={() => applyScenario(scenario.id)}
                  aria-describedby={`${scenario.id}-details`}
                >
                  {t(scenario.titleKey)}
                </button>
                <p id={`${scenario.id}-details`}>
                  {t(scenario.summaryKey)}
                </p>
                <p>{t('scenario.assumptionsLabel')}</p>
                <ul>
                  {scenario.assumptions.map((assumptionKey) => (
                    <li key={assumptionKey}>{t(assumptionKey)}</li>
                  ))}
                </ul>
                <p>
                  <strong>{t('scenario.nonCanonLabel')}</strong> {t(scenario.disclaimer)}
                </p>
              </li>
            ))}
          </ul>
        </section>

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

        <section className="sr-only" aria-live="polite" aria-atomic="true">
          <h4>{t('routeSummaryTitle')}</h4>
          <p>
            {timeline.length
              ? t('routeSummaryNow', {
                  count: timeline.length,
                  destination: timeline[timeline.length - 1]?.targetStarId
                })
              : t('routeSummaryEmpty')}
          </p>
          <ol>
            {timeline.map((event) => (
              <li key={event.id}>{event.label}</li>
            ))}
          </ol>
        </section>

        <p aria-live="polite">{status}</p>
      </aside>
    </section>
  );
};
