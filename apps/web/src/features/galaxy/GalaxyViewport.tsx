import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { initGalaxyScene } from '../../scene/bootstrapBabylon';
import type { GalaxyScene } from '../../scene/bootstrapBabylon';
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
  activeSegmentId,
}: GalaxyViewportProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef  = useRef<GalaxyScene | null>(null);

  // Initialise Babylon.js once on mount.
  // stars and onSelectStar are module-level constants and never change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let api: GalaxyScene | null = null;
    try {
      api = initGalaxyScene(canvas, stars, onSelectStar);
      sceneRef.current = api;
      api.updateSelection(selectedStarId);
    } catch {
      // WebGL unavailable (jsdom in tests) — skip silently
    }
    return () => {
      api?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once

  useEffect(() => {
    sceneRef.current?.updateSelection(selectedStarId);
  }, [selectedStarId]);

  useEffect(() => {
    sceneRef.current?.updateRoute(segments, activeSegmentId);
  }, [segments, activeSegmentId]);

  return (
    <section className="viewport-section" aria-label={t('sceneTitle')}>
      {/* Overlay star buttons — keyboard + screen reader access */}
      <div className="star-picker" role="listbox" aria-label={t('starPicker')}>
        {stars.map((star) => {
          const isSelected = selectedStarId === star.id;
          return (
            <button
              key={star.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={
                isSelected
                  ? t('starOptionSelectedLabel', { name: star.name })
                  : t('starOptionLabel', { name: star.name })
              }
              className={isSelected ? 'star-btn star-selected' : 'star-btn'}
              onClick={() => onSelectStar(star.id)}
            >
              {star.name}
            </button>
          );
        })}
      </div>
      <canvas ref={canvasRef} className="galaxy-canvas" />
    </section>
  );
};
