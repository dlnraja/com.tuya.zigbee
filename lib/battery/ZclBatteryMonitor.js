'use strict';

/**
 * ZclBatteryMonitor — v9.0.413 (P92.118) / v9.0.581
 *
 * Universal battery wiring for drivers that declare `measure_battery` but
 * have NO runtime battery path (raw ZigBeeDevice Johan-style drivers:
 * doorwindowsensor, pirsensor, flood_sensor, slim_motion_sensor, smoke_*,
 * siren+TH, lcd*, contact_*, water_detector, TRV, smart sensors…).
 *
 * What it does:
 *  1. Attaches attribute listeners on the powerConfiguration cluster
 *     (batteryPercentageRemaining AND batteryVoltage).
 *  2. Normalizes via MultiProtocolBatteryPercent / UnifiedBatteryHandler
 *     (200-sentinel, 0-50 anomaly, non-linear chemistry curves, mV/cV/dV).
 *  3. Writes measure_battery + alarm_battery (threshold 20%).
 *  4. Attempts one immediate read on mains/non-sleepy nodes only.
 *
 * Idempotent: re-attach on DeviceAnnounce must not stack listeners.
 *
 * One-line usage in onNodeInit:
 *   require('../../lib/battery/ZclBatteryMonitor').attach(this, zclNode);
 */

const UnifiedBatteryHandler = require('./UnifiedBatteryHandler');
const { readAttributesSmart } = require('../zigbee/UnsupportedRegistry');

let ingestBatterySample;
try {
  ({ ingestBatterySample } = require('./MultiProtocolBatteryPercent'));
} catch (_e) {
  ingestBatterySample = null;
}

function chemistryOf(device) {
  try {
    const t = device.getSetting?.('battery_type')
      || device.getStoreValue?.('battery_type')
      || device.driver?.manifest?.energy?.batteries?.[0]
      || device.getEnergy?.()?.batteries?.[0];
    if (t) {return t;}
  } catch (_e) { /* soft */ }
  try {
    const mfr = device.getSetting?.('zb_manufacturer_name') || '';
    const pid = device.getSetting?.('zb_model_id') || '';
    const p = UnifiedBatteryHandler.lookupBatteryProfile?.(mfr, pid);
    if (p?.chemistry && p.chemistry !== 'MAINS' && p.chemistry !== 'USB') {
      return p.chemistry;
    }
  } catch (_e) { /* soft */ }
  return 'CR2032';
}

function manufacturerOf(device) {
  try {
    return device.getSetting?.('zb_manufacturer_name') || '';
  } catch (_e) {
    return '';
  }
}

async function applySample(device, raw, protocol) {
  if (device._destroyed) {return;}
  const batteryType = chemistryOf(device);
  const manufacturer = manufacturerOf(device);
  if (typeof ingestBatterySample === 'function') {
    await ingestBatterySample(device, raw, { protocol, batteryType, manufacturer }).catch(() => {});
    return;
  }
  if (protocol === 'voltage') {
    const voltage = UnifiedBatteryHandler.normalizeVoltage?.(raw);
    if (voltage == null) {return;}
    const percent = UnifiedBatteryHandler.calculateFromVoltage?.(voltage, batteryType);
    if (percent == null) {return;}
    await writePercent(device, percent);
    return;
  }
  const percent = UnifiedBatteryHandler.normalizeZigbeeValue?.(raw, { manufacturer, batteryType });
  if (percent == null) {return;}
  await writePercent(device, percent);
}

async function writePercent(device, percent) {
  if (percent === null || percent === undefined || percent < 0 || percent > 100) {return;}
  if (device._destroyed) {return;}
  if (typeof device.safeSetCapabilityValue === 'function') {
    await device.safeSetCapabilityValue('measure_battery', percent).catch(() => {});
    if (device.hasCapability?.('alarm_battery')) {
      await device.safeSetCapabilityValue('alarm_battery', percent <= 20).catch(() => {});
    }
  } else if (typeof device.setCapabilityValue === 'function') {
    await device.setCapabilityValue('measure_battery', percent).catch(() => {});
    if (device.hasCapability?.('alarm_battery')) {
      await device.setCapabilityValue('alarm_battery', percent <= 20).catch(() => {});
    }
  }
}

function attach(device, zclNode, options = {}) {
  if (!device || !zclNode) {return false;}
  if (device._zclBatteryMonitorAttached) {return true;}

  const endpointId = options.endpointId || 1;
  const cluster = zclNode.endpoints?.[endpointId]?.clusters?.powerConfiguration
    || zclNode.endpoints?.[endpointId]?.clusters?.genPowerCfg;
  if (!cluster) {
    device.log?.('[BATTERY] no powerConfiguration cluster — battery stays unknown');
    return false;
  }

  device._zclBatteryMonitorAttached = true;

  if (typeof cluster.on === 'function') {
    cluster.on('attr.batteryPercentageRemaining', (raw) => {
      applySample(device, raw, 'zcl').catch(() => {});
    });
    cluster.on('attr.batteryVoltage', (raw) => {
      applySample(device, raw, 'voltage').catch(() => {});
    });
  }

  // Immediate read: sleepy remotes / ButtonDevice already read on wake.
  // Polling PowerCfg on a timer drains CR2032 remotes (z2m #8072).
  let allowRead = options.forceRead === true;
  if (!allowRead && device._ownsBatteryHandling !== true) {
    try {
      const { shouldProactivePowerCfgRead } = require('../zigbee/PowerClusterPolicy');
      allowRead = shouldProactivePowerCfgRead(device);
    } catch (_e) {
      allowRead = true;
    }
  }

  if (allowRead && typeof cluster.readAttributes === 'function') {
    readAttributesSmart(device, cluster, 'genPowerCfg', ['batteryPercentageRemaining', 'batteryVoltage'])
      .then(async (attrs) => {
        if (attrs?.batteryPercentageRemaining !== undefined) {
          await applySample(device, attrs.batteryPercentageRemaining, 'zcl');
        } else if (attrs?.batteryVoltage !== undefined) {
          await applySample(device, attrs.batteryVoltage, 'voltage');
        }
      })
      .catch(() => {});
  }

  device.log?.('[BATTERY] ZclBatteryMonitor attached');
  return true;
}

module.exports = { attach };
