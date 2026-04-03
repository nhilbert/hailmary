import { useTranslation } from 'react-i18next';
import { PHASE_COLORS } from './data';
import type { GalaxyStar, ManeuverSegment } from './types';

interface GalaxyViewportProps {
  stars: GalaxyStar[];
  selectedStarId: string;
  onSelectStar: (id: string) => void;
  segments: ManeuverSegment[];
  activeSegmentId: string | null;
}

export const GalaxyViewport = ({
  stars,
  selectedStarId,
  onSelectStar,
  segments,
  activeSegmentId
}: GalaxyViewportProps) => {
  const { t } = useTranslation();

  const resolveStar = (id: string) => stars.find((star) => star.id === id);

  return (
    <section aria-label={t('sceneTitle')}>
      <div className="star-picker" role="listbox" aria-label={t('starPicker')}>
        {stars.map((star) => {
          const isSelected = selectedStarId === star.id;
          return (
            <button
              key={star.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={isSelected ? t('starOptionSelectedLabel', { name: star.name }) : t('starOptionLabel', { name: star.name })}
              className={isSelected ? 'star-selected' : ''}
              onClick={() => onSelectStar(star.id)}
            >
              {star.name}
            </button>
          );
        })}
      </div>
      <svg viewBox="0 0 100 100" className="route-map" aria-label={t('routeOverlay')} role="img">
        {segments.map((segment) => {
          const from = resolveStar(segment.fromStarId);
          const to = resolveStar(segment.toStarId);
          if (!from || !to) {
            return null;
          }
          const isActive = segment.id === activeSegmentId;

          return (
            <line
              key={segment.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={PHASE_COLORS[segment.phase]}
              strokeWidth={isActive ? 1.8 : 0.9}
              opacity={isActive ? 1 : 0.55}
              data-phase={segment.phase}
            />
          );
        })}
        {stars.map((star) => (
          <g key={star.id}>
            <circle
              cx={star.x}
              cy={star.y}
              r={selectedStarId === star.id ? 2.1 : 1.4}
              className="star-node"
              onClick={() => onSelectStar(star.id)}
            />
            <text x={star.x + 2} y={star.y - 2} fontSize={3}>
              {star.name}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
};
