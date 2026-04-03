import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { solveRoute } from './api';
import { ALL_STARS } from './data';
import { GalaxyViewport } from './GalaxyViewport';
import { MissionTimeline } from './MissionTimeline';
import { ShipParametersForm } from './ShipParametersForm';
import type { FuelEstimate, ManeuverSegment, ShipParameters, TimelineEvent } from './types';

const defaultShip: ShipParameters = {
  engineClass: 'astrophage',
  dryMassTons: 200,
  maxAccelG: 1.5,
};

export const GalaxyWorkspace = () => {
  const { t } = useTranslation();
  const [selectedStarId, setSelectedStarId] = useState(ALL_STARS[0].id);
  const [routeStartId, setRouteStartId] = useState(ALL_STARS[0].id);
  const [routeEndId, setRouteEndId] = useState(ALL_STARS[1].id);
  const [routeFilter, setRouteFilter] = useState('');
  const [ship, setShip] = useState<ShipParameters>(defaultShip);
  const [segments, setSegments] = useState<ManeuverSegment[]>([]);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [status, setStatus] = useState('');
  const [solving, setSolving] = useState(false);
  const [coastFractionUsed, setCoastFractionUsed] = useState<number | undefined>(undefined);
  const [initialShieldKg, setInitialShieldKg] = useState<number | undefined>(undefined);
  const [fuelEstimate, setFuelEstimate] = useState<FuelEstimate | null>(null);
  const [infeasibilityReason, setInfeasibilityReason] = useState<string | null>(null);
  const [epochYears, setEpochYears] = useState(0);
  const [aberrationBeta, setAberrationBeta] = useState(0);

  const selectedStar = ALL_STARS.find((star) => star.id === selectedStarId) ?? ALL_STARS[0];
  const filteredRouteStars = routeFilter
    ? ALL_STARS.filter((s) => s.name.toLowerCase().includes(routeFilter.toLowerCase()))
    : ALL_STARS.filter((s) => !s.id.startsWith('hyg-'));

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
        elapsedHours: elapsed,
        durationHours: segment.durationHours,
        durationHoursOnboard: segment.durationHoursOnboard,
        shieldRemainingKg: segment.shieldRemainingKg,
      };
    });
  }, [segments, t]);

  const activeSegmentId = timeline[timelineIndex]?.segmentId ?? null;

  const handleSolve = async () => {
    if (!routeStartId || !routeEndId || routeStartId === routeEndId) {
      setStatus(t('routeInvalid'));
      return;
    }

    setSolving(true);
    setStatus('');
    setInfeasibilityReason(null);
    setFuelEstimate(null);
    try {
      const response = await solveRoute({ startStarId: routeStartId, endStarId: routeEndId, ship });
      if (response.infeasibilityReason) {
        setInfeasibilityReason(response.infeasibilityReason);
        setSegments([]);
        setStatus('');
      } else {
        setSegments(response.segments);
        setCoastFractionUsed(response.coastFractionUsed);
        setInitialShieldKg(response.segments[0]?.shieldRemainingKg);
        setFuelEstimate(response.fuelEstimate);
        setTimelineIndex(0);
        setStatus(t('routeSolved', { count: response.segments.length }));
      }
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
        stars={ALL_STARS}
        selectedStarId={selectedStarId}
        onSelectStar={setSelectedStarId}
        segments={segments}
        activeSegmentId={activeSegmentId}
        epochYears={epochYears}
        aberrationBeta={aberrationBeta}
      />

      <aside className="details-panel" aria-live="polite">
        <h3>{t('detailPanel')}</h3>
        <p>
          <strong>{selectedStar.name}</strong>
        </p>
        <p>{selectedStar.description ?? (selectedStar.descriptionKey ? t(selectedStar.descriptionKey) : '')}</p>
        <dl>
          <dt>{t('constellation')}</dt>
          <dd>{selectedStar.constellation}</dd>
          <dt>{t('magnitude')}</dt>
          <dd>{selectedStar.magnitude}</dd>
          <dt>{t('distanceLy')}</dt>
          <dd>{selectedStar.distanceLightYears}</dd>
        </dl>

        <div className="route-controls">
          <label htmlFor="route-star-filter">{t('starFilter')}</label>
          <input
            id="route-star-filter"
            type="search"
            placeholder={t('starFilterPlaceholder')}
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
          />

          <label htmlFor="route-start">{t('routeStart')}</label>
          <select id="route-start" value={routeStartId} onChange={(event) => setRouteStartId(event.target.value)}>
            {filteredRouteStars.map((star) => (
              <option key={star.id} value={star.id}>
                {star.name}
              </option>
            ))}
          </select>

          <label htmlFor="route-end">{t('routeEnd')}</label>
          <select id="route-end" value={routeEndId} onChange={(event) => setRouteEndId(event.target.value)}>
            {filteredRouteStars.map((star) => (
              <option key={star.id} value={star.id}>
                {star.name}
              </option>
            ))}
          </select>
        </div>

        {/* Proper-motion epoch slider */}
        <div className="epoch-controls">
          <label htmlFor="epoch-slider">
            {t('epochLabel')}: {epochYears >= 0 ? '+' : ''}{epochYears.toLocaleString()} {t('epochYears')}
          </label>
          <input
            id="epoch-slider"
            type="range"
            min={-50000}
            max={100000}
            step={100}
            value={epochYears}
            onChange={(e) => setEpochYears(Number(e.target.value))}
          />
          <button type="button" onClick={() => setEpochYears(0)}>{t('epochReset')}</button>
        </div>

        {/* Stellar aberration */}
        <div className="aberration-controls">
          <label htmlFor="aberration-slider">
            {t('aberrationLabel')}: {aberrationBeta > 0 ? `${(aberrationBeta * 100).toFixed(0)}% c` : t('aberrationOff')}
          </label>
          <input
            id="aberration-slider"
            type="range"
            min={0}
            max={0.9999}
            step={0.01}
            value={aberrationBeta}
            onChange={(e) => setAberrationBeta(Number(e.target.value))}
          />
          <button type="button" onClick={() => setAberrationBeta(0)}>{t('aberrationReset')}</button>
        </div>

        <ShipParametersForm
          value={ship}
          onChange={setShip}
          onSubmit={() => void handleSolve()}
          loading={solving}
          infeasibilityReason={infeasibilityReason}
          fuelEstimate={fuelEstimate}
        />

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
          coastFractionUsed={coastFractionUsed}
          initialShieldKg={initialShieldKg}
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
