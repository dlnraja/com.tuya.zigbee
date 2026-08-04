'use strict';

/**
 * ZclBatteryMonitor — v9.0.413 (P92.118)
 *
 * Universal battery wiring for drivers that declare `measure_battery` but
 * have NO runtime battery path (raw ZigBeeDevice Johan-style drivers:
 * doorwindowsensor, pirsensor, flood_sensor, slim_motion_sensor, smoke_*,
 * siren+TH, lcd*, contact_*, water_detector, TRV, smart sensors…).
 *
 * What it does:
 *  1. Attaches attribute listeners on the powerConfiguration cluster
 *     (batteryPercentageRemaining AND batteryVoltage).
 *  2. Normalizes via UnifiedBatteryHandler (200-sentinel, 0-50 anomaly,
 *     non-linear chemistry curves, mV/cV/dV auto-detect).
 *  3. Writes measure_battery + alarm_battery (threshold 20%).
 *  4. Attempts one immediate read, sleepy-tolerant (catch-all, never throws).
 *
 * One-line usage in onNodeInit:
 *   require('../../lib/battery/ZclBatteryMonitor').attach(this, zclNode);
 */

const UnifiedBatteryHandler = require('./UnifiedBatteryHandler');

function normalizePercent(device, raw) {
  if (UnifiedBatteryHandler?.normalizeZigbeeValue) {
    return UnifiedBatteryHandler.normalizeZigbeeValue(raw, {
      manufacturer: (device.getSetting && device.getSetting('zb_manufacturer_name')) || '',
      batteryType: 'CR2032',
    });
  }
  if (raw === 255 || raw === 0xFFFF) { return null; }
  return raw > 100 ? Math.round(raw / 2) : Math.round(raw);
}

async function applyPercent(device, percent) {
  if (percent === null || percent === undefined || percent < 0 || percent > 100) { return; }
  if (device._destroyed) { return; }
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

function updateFromVoltage(device, rawVoltage) {
  let voltage = typeof rawVoltage === 'number' ? rawVoltage : parseFloat(rawVoltage);
  if (!Number.isFinite(voltage)) { return; }
  // ZCL batteryVoltage is in 100mV units (30 = 3.0V); tolerate mV and volts
  if (voltage > 300) { voltage = voltage / 1000; }
  else if (voltage >= 10) { voltage = voltage / 10; }
  if (UnifiedBatteryHandler?.calculateFromVoltage) {
    applyPercent(device, UnifiedBatteryHandler.calculateFromVoltage(voltage, '3V_2100'));
  }
}

function attach(device, zclNode, options = {}) {
  if (!device || !zclNode) { return false; }
  const endpointId = options.endpointId || 1;
  const cluster = zclNode.endpoints?.[endpointId]?.clusters?.powerConfiguration
    || zclNode.endpoints?.[endpointId]?.clusters?.genPowerCfg;
  if (!cluster) {
    device.log?.('[BATTERY] no powerConfiguration cluster — battery stays unknown');
    return false;
  }

  if (typeof cluster.on === 'function') {
    cluster.on('attr.batteryPercentageRemaining', (raw) => {
      applyPercent(device, normalizePercent(device, raw));
    });
    cluster.on('attr.batteryVoltage', (raw) => {
      updateFromVoltage(device, raw);
    });
  }

  // Immediate read, sleepy-tolerant
  if (typeof cluster.readAttributes === 'function') {
    cluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage'])
      .then((attrs) => {
        if (attrs?.batteryPercentageRemaining !== undefined) {
          applyPercent(device, normalizePercent(device, attrs.batteryPercentageRemaining));
        } else if (attrs?.batteryVoltage !== undefined) {
          updateFromVoltage(device, attrs.batteryVoltage);
        }
      })
      .catch(() => {});
  }

  device.log?.('[BATTERY] ZclBatteryMonitor attached');
  return true;
}

module.exports = { attach };
