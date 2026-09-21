'use strict';

/**
 * P2663 — Zigbee mesh flood calm
 *
 * WHY (P215):
 * - Pourquoi: Bastien live mesh (~8× HOBEIAN switch_1gang) saturated with thousands
 *   of msgs — tip 1.0.34 configured haElectricalMeasurement reporting (minInterval 10)
 *   on modules without real electrical clusters (blank zb_model_id skipped heal).
 * - Comment: disable/overwrite aggressive electrical reporting; jitter calm intervals
 *   for real plugs (Machado HomeSuite lesson — no thundering herd / no hammering).
 * - Pour qui: Bastien house + Universal BOTH reliability.
 * - Quand: onNodeInit heal + any configureAttributeReporting path.
 * - Contre quoi: minInterval:10 activePower × N switches → mesh saturation.
 *
 * Peer study (ideas only, no code copied): gpmachado/com.gpm.homesuite — jitter,
 * backoff, skip Poll Control on sleepy, no boot stampede.
 */

const { applyReportingJitter } = require('./ZclClusterLexicon');
const { containsCI } = require('../utils/CaseInsensitiveMatcher');

/** Calm defaults for real energy plugs (was 10/300 — too hot for mesh). */
const ELECTRICAL_CALM = {
  activePower: { minInterval: 60, maxInterval: 900, minChange: 10 },
  rmsVoltage: { minInterval: 120, maxInterval: 1800, minChange: 5 },
  rmsCurrent: { minInterval: 120, maxInterval: 1800, minChange: 50 },
};

/** Effectively stop periodic electrical reports (device may ignore missing cluster). */
const ELECTRICAL_DISABLE = {
  minInterval: 3600,
  maxInterval: 65534,
  minChange: 65534,
};

function hasElectricalCluster(device) {
  try {
    const ep = device?.zclNode?.endpoints?.[1];
    if (!ep?.clusters) return false;
    return !!(
      ep.clusters.haElectricalMeasurement
      || ep.clusters.electricalMeasurement
      || ep.clusters[0x0B04]
      || ep.clusters['0x0B04']
      || ep.clusters['2820']
    );
  } catch (_e) {
    return false;
  }
}

/**
 * Skip / never enable electrical attribute reporting.
 * Sets device._skipElectricalReporting for announce reconfigure guards.
 */
function shouldSkipElectricalReporting(device) {
  if (!device) return false;
  if (device._hobeianZg301z || device._skipElectricalReporting) return true;
  try {
    const mfr = String(
      device.getSetting?.('zb_manufacturer_name')
      || device.getData?.()?.manufacturerName
      || device.getStoreValue?.('zb_manufacturer_name')
      || '',
    );
    if (containsCI(mfr, 'HOBEIAN') && !hasElectricalCluster(device)) return true;
  } catch (_e) { /* soft */ }
  return false;
}

function jitterReportingConfig(cfg, jitterPercent = 15) {
  const minInterval = applyReportingJitter(cfg.minInterval, jitterPercent);
  const maxInterval = Math.max(
    Number(cfg.maxInterval) || minInterval,
    applyReportingJitter(cfg.maxInterval, Math.min(10, jitterPercent)),
  );
  return { ...cfg, minInterval, maxInterval };
}

function buildCalmElectricalReportingConfigs({ withBattery = false, withJitter = true } = {}) {
  const wrap = withJitter ? jitterReportingConfig : (c) => c;
  const configs = [
    wrap({
      cluster: 'haElectricalMeasurement',
      attributeName: 'activePower',
      ...ELECTRICAL_CALM.activePower,
    }),
    wrap({
      cluster: 'haElectricalMeasurement',
      attributeName: 'rmsVoltage',
      ...ELECTRICAL_CALM.rmsVoltage,
    }),
    wrap({
      cluster: 'haElectricalMeasurement',
      attributeName: 'rmsCurrent',
      ...ELECTRICAL_CALM.rmsCurrent,
    }),
  ];
  if (withBattery) {
    configs.unshift(wrap({
      cluster: 'genPowerCfg',
      attributeName: 'batteryPercentageRemaining',
      minInterval: 3600,
      maxInterval: 43200,
      minChange: 2,
    }));
  }
  return configs;
}

async function configureReportingSoft(device, configs) {
  if (!device || typeof device.configureAttributeReporting !== 'function') return false;
  if (!Array.isArray(configs) || configs.length === 0) return false;
  try {
    await device.configureAttributeReporting(configs);
    return true;
  } catch (e) {
    device.log?.(`[P2663] configureAttributeReporting soft-fail: ${e.message}`);
    return false;
  }
}

/**
 * Overwrite any prior aggressive electrical reporting (tip 1.0.34 residue).
 */
async function disableElectricalReporting(device) {
  const configs = ['activePower', 'rmsVoltage', 'rmsCurrent'].map((attributeName) => ({
    cluster: 'haElectricalMeasurement',
    attributeName,
    ...ELECTRICAL_DISABLE,
  }));
  const ok = await configureReportingSoft(device, configs);
  if (ok) device.log?.('[P2663] disabled electrical attribute reporting (mesh calm)');
  return ok;
}

async function calmOnOffReporting(device) {
  return configureReportingSoft(device, [{
    cluster: 'onOff',
    attributeName: 'onOff',
    minInterval: 0,
    maxInterval: 3600,
    minChange: 1,
  }]);
}

/**
 * HOBEIAN ZG-301Z / no-electrical path — mark skip + disable leftovers + calm onOff.
 */
async function calmHobeianMesh(device) {
  if (!device) return false;
  device._skipElectricalReporting = true;
  device._hobeianZg301z = device._hobeianZg301z || true;
  await disableElectricalReporting(device);
  await calmOnOffReporting(device);
  device.log?.('[P2663] HOBEIAN mesh calm applied (Machado-style: no electrical hammer)');
  return true;
}

module.exports = {
  ELECTRICAL_CALM,
  ELECTRICAL_DISABLE,
  hasElectricalCluster,
  shouldSkipElectricalReporting,
  jitterReportingConfig,
  buildCalmElectricalReportingConfigs,
  configureReportingSoft,
  disableElectricalReporting,
  calmOnOffReporting,
  calmHobeianMesh,
};
