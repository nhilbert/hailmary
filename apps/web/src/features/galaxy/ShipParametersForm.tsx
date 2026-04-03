import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SHIP_PRESETS } from './data';
import type { FuelEstimate, ShipParameters } from './types';

interface ShipParametersFormProps {
  value: ShipParameters;
  onChange: (next: ShipParameters) => void;
  onSubmit: () => void;
  loading: boolean;
  infeasibilityReason: string | null;
  fuelEstimate: FuelEstimate | null;
}

const isValid = (params: ShipParameters) =>
  params.dryMassTons > 0 && params.maxAccelG > 0;

export const ShipParametersForm = ({
  value,
  onChange,
  onSubmit,
  loading,
  infeasibilityReason,
  fuelEstimate,
}: ShipParametersFormProps) => {
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
        onChange={(e) => onChange({ ...value, engineClass: e.target.value as ShipParameters['engineClass'] })}
      >
        <optgroup label={t('engineGroupRealistic')}>
          <option value="ion">{t('engine.ion')}</option>
          <option value="orion">{t('engine.orion')}</option>
          <option value="fusion">{t('engine.fusion')}</option>
          <option value="antimatter">{t('engine.antimatter')}</option>
          <option value="astrophage">{t('engine.astrophage')}</option>
        </optgroup>
        <optgroup label={t('engineGroupScifi')}>
          <option value="warp">{t('engine.warp')}</option>
          <option value="quantum">{t('engine.quantum')}</option>
          <option value="hyperdrive">{t('engine.hyperdrive')}</option>
        </optgroup>
      </select>

      <label htmlFor="dry-mass">{t('dryMass')}</label>
      <input
        id="dry-mass"
        type="number"
        min={0.1}
        step={0.1}
        value={value.dryMassTons}
        onChange={(e) => onChange({ ...value, dryMassTons: Number(e.target.value) })}
      />

      <label htmlFor="max-accel">{t('maxAccelG')}</label>
      <input
        id="max-accel"
        type="number"
        min={0.0001}
        max={1000}
        step={0.001}
        value={value.maxAccelG}
        onChange={(e) => onChange({ ...value, maxAccelG: Number(e.target.value) })}
      />

      {errors.length ? (
        <ul aria-live="assertive">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}

      <button type="submit" disabled={loading}>
        {loading ? t('shipSubmitting') : t('shipSubmit')}
      </button>

      {infeasibilityReason ? (
        <p className="ship-infeasible" role="alert" aria-live="assertive">
          {infeasibilityReason}
        </p>
      ) : null}

      {fuelEstimate ? (
        <dl className="fuel-estimate" aria-label={t('fuelEstimateLabel')}>
          <dt>{t('fuelNeeded')}</dt>
          <dd>
            {fuelEstimate.fuelAmountDisplay.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            {' '}{fuelEstimate.fuelUnitSuffix} {fuelEstimate.fuelUnit}
          </dd>
          <dt>{t('fuelMassKg')}</dt>
          <dd>{(fuelEstimate.fuelMassKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} t</dd>
        </dl>
      ) : null}
    </form>
  );
};
