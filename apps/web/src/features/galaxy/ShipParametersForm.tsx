import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SHIP_PRESETS } from './data';
import type { ShipParameters } from './types';

interface ShipParametersFormProps {
  value: ShipParameters;
  onChange: (next: ShipParameters) => void;
  onSubmit: () => void;
  loading: boolean;
}

const isValid = (params: ShipParameters) =>
  params.cargoMassTons > 0 &&
  params.cargoMassTons <= 500 &&
  params.maxBurnHours >= 1 &&
  params.maxBurnHours <= 120 &&
  params.safetyMarginPct >= 0 &&
  params.safetyMarginPct <= 40;

export const ShipParametersForm = ({ value, onChange, onSubmit, loading }: ShipParametersFormProps) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<string[]>([]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid(value)) {
      setErrors([t('shipValidationError')]);
      return;
    }

    setErrors([]);
    onSubmit();
  };

  return (
    <form className="ship-form" onSubmit={submit} noValidate>
      <h3>{t('shipFormTitle')}</h3>
      <div className="ship-presets" role="group" aria-label={t('shipPresets')}>
        {Object.entries(SHIP_PRESETS).map(([key, preset]) => (
          <button key={key} type="button" onClick={() => onChange(preset)}>
            {t(`preset.${key}`)}
          </button>
        ))}
      </div>

      <label htmlFor="engine-class">{t('engineClass')}</label>
      <select
        id="engine-class"
        value={value.engineClass}
        onChange={(event) => onChange({ ...value, engineClass: event.target.value as ShipParameters['engineClass'] })}
      >
        <option value="ion">{t('engine.ion')}</option>
        <option value="warp">{t('engine.warp')}</option>
        <option value="quantum">{t('engine.quantum')}</option>
      </select>

      <label htmlFor="cargo">{t('cargoMass')}</label>
      <input
        id="cargo"
        type="number"
        min={1}
        max={500}
        value={value.cargoMassTons}
        onChange={(event) => onChange({ ...value, cargoMassTons: Number(event.target.value) })}
      />

      <label htmlFor="burn">{t('maxBurnHours')}</label>
      <input
        id="burn"
        type="number"
        min={1}
        max={120}
        value={value.maxBurnHours}
        onChange={(event) => onChange({ ...value, maxBurnHours: Number(event.target.value) })}
      />

      <label htmlFor="margin">{t('safetyMargin')}</label>
      <input
        id="margin"
        type="number"
        min={0}
        max={40}
        value={value.safetyMarginPct}
        onChange={(event) => onChange({ ...value, safetyMarginPct: Number(event.target.value) })}
      />

      {errors.length ? (
        <ul aria-live="assertive">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      <button type="submit" disabled={loading}>
        {loading ? t('shipSubmitting') : t('shipSubmit')}
      </button>
    </form>
  );
};
