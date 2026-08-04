'use strict';

/**
 * v9.0.415 (P92.123): DoorWindowContactHelper — shared IAS contact logic
 * for the door/windowsensor family.
 *
 * The 5 door/window drivers were bare-bones (forum Peter_van_Werkhoven
 * #2108/#2114/#2118): no IAS enrollment (device never sends zone updates
 * → contact state frozen), no initial state read, no invert setting even
 * though users need it for reversed firmwares, no tamper.
 *
 * This helper provides, for all of them:
 *  1. IAS Zone enrollment (CIE address + enroll response) via IASZoneManager
 *     — without it the sensor NEVER reports;
 *  2. the zoneStatus listener + an immediate state read at boot;
 *  3. `invert_contact` setting (device setting, applied to every update
 *     and re-applied instantly when the setting changes);
 *  4. tamper bit → alarm_tamper when the driver exposes the capability;
 *  5. battery bit → alarm_battery.
 */

const IASZoneManager = require('../managers/IASZoneManager');

/**
 * @param {Object} device - Homey device instance
 * @param {Object} zclNode
 * @param {Object} [opts]
 * @param {boolean} [opts.hasTamper=false]
 */
async function setupDoorWindowSensor(device, zclNode, opts = {}) {
  const iasCluster = zclNode && zclNode.endpoints && zclNode.endpoints[1]
    && zclNode.endpoints[1].clusters
    && (zclNode.endpoints[1].clusters.iasZone || zclNode.endpoints[1].clusters.ssIasZone
      || zclNode.endpoints[1].clusters[0x0500]);

  const isInverted = () => {
    try { return device.getSetting && device.getSetting('invert_contact') === true; } catch (_e) { return false; }
  };

  const applyZoneStatus = (zoneStatus) => {
    // NOTE: 0 is a VALID zoneStatus (all clear) — only null/undefined skip.
    if (zoneStatus === undefined || zoneStatus === null) { return; }
    // zoneStatus may be a bitset object (zigbee-clusters) or a raw number
    const rawAlarm = typeof zoneStatus === 'number'
      ? (zoneStatus & 0x01) !== 0
      : Boolean(zoneStatus.alarm1);
    device._lastRawContact = rawAlarm;
    const contact = isInverted() ? !rawAlarm : rawAlarm;
    device.safeSetCapabilityValue
      ? device.safeSetCapabilityValue('alarm_contact', contact).catch(() => {})
      : device.setCapabilityValue('alarm_contact', contact).catch(() => {});

    const batteryBit = typeof zoneStatus === 'number'
      ? (zoneStatus & 0x08) !== 0
      : Boolean(zoneStatus.battery);
    if (device.hasCapability && device.hasCapability('alarm_battery')) {
      (device.safeSetCapabilityValue || device.setCapabilityValue).call(device, 'alarm_battery', batteryBit).catch(() => {});
    }
    const tamperBit = typeof zoneStatus === 'number'
      ? (zoneStatus & 0x04) !== 0
      : Boolean(zoneStatus.tamper);
    if (opts.hasTamper && device.hasCapability && device.hasCapability('alarm_tamper')) {
      (device.safeSetCapabilityValue || device.setCapabilityValue).call(device, 'alarm_tamper', tamperBit).catch(() => {});
    }
  };

  device._applyDoorWindowZoneStatus = applyZoneStatus;

  if (!iasCluster) {
    device.log('[DOORWIN] ⚠️ no IAS zone cluster on endpoint 1');
    return;
  }

  // 1. Status-change listener (re-attached at EVERY boot — listeners do
  //    not survive app restarts, root cause of frozen contact states).
  iasCluster.onZoneStatusChangeNotification = (payload) => {
    try {
      device.log('[DOORWIN] zoneStatus notification:', JSON.stringify(payload && payload.zoneStatus));
      applyZoneStatus(payload && payload.zoneStatus);
    } catch (e) {
      device.log(`[DOORWIN] ⚠️ notification error: ${e.message}`);
    }
  };
  if (typeof iasCluster.on === 'function') {
    try {
      iasCluster.on('attr.zoneStatus', (zs) => applyZoneStatus(zs));
    } catch (_e) { /* event not supported by this cluster impl */ }
  }

  // 3. Initial state read FIRST (fast, local — never blocked by enrollment)
  try {
    if (typeof iasCluster.readAttributes === 'function') {
      const attrs = await iasCluster.readAttributes(['zoneStatus']).catch(() => null);
      if (attrs && attrs.zoneStatus !== undefined) {
        applyZoneStatus(attrs.zoneStatus);
        device.log('[DOORWIN] initial zoneStatus applied');
      }
    }
  } catch (_e) { /* sleepy device — first report will set the state */ }

  // 4. Enrollment — CRITICAL for the device to ever report, but slow and
  //    retry-based (sleepy devices, Zigbee still starting). Fire-and-forget
  //    so it never blocks boot or the initial state read.
  try {
    const iasManager = new IASZoneManager(device);
    Promise.resolve()
      .then(() => iasManager.enrollIASZone())
      .then((ok) => device.log(`[DOORWIN] IAS enrollment ${ok ? '✅ done' : '⚠️ not confirmed (will retry on next event)'}`))
      .catch((err) => device.log(`[DOORWIN] ⚠️ IAS enrollment error (non-critical): ${err.message}`));
  } catch (err) {
    device.log(`[DOORWIN] ⚠️ IAS enrollment setup error (non-critical): ${err.message}`);
  }
}

/**
 * onSettings handler: re-apply the invert choice instantly from the last
 * known raw state (no need to wait for the next physical event).
 *
 * @param {Object} device
 * @param {Object} changedKeys - newSettings object or array of keys
 */
function handleDoorWindowSettings(device, changedKeys) {
  const keys = Array.isArray(changedKeys) ? changedKeys : Object.keys(changedKeys || {});
  if (!keys.includes('invert_contact')) { return; }
  if (typeof device._lastRawContact === 'boolean' && typeof device._applyDoorWindowZoneStatus === 'function') {
    device._applyDoorWindowZoneStatus({ alarm1: device._lastRawContact });
    try {
      device.log(`[DOORWIN] invert_contact=${device.getSetting('invert_contact')} re-applied (raw=${device._lastRawContact})`);
    } catch (_e) { /* no-op */ }
  }
}

/**
 * Settings block to inject into driver.compose.json / app.json.
 */
const INVERT_SETTING = {
  id: 'invert_contact',
  type: 'checkbox',
  label: { en: 'Invert contact state', fr: 'Inverser l’état du contact', nl: 'Contactstatus omkeren' },
  hint: {
    en: 'Enable when open/close is reported reversed by this device.',
    fr: 'Activer si ouvert/fermé est remonté à l’envers par ce capteur.',
    nl: 'Inschakelen als open/dicht omgekeerd wordt gemeld.',
  },
  value: false,
};

module.exports = { setupDoorWindowSensor, handleDoorWindowSettings, INVERT_SETTING };

/**
 * v9.0.418 (P92.126): tamper-only IAS listener for hybrid drivers
 * (contact_sensor_plug/curtain/dimmer, device_air_purifier_smoke,
 * device_din_rail_meter, dimmer_wall_water, sensor_contact_plug) —
 * they declare alarm_tamper but nothing ever fed it. Attaches to the IAS
 * zone cluster and updates ONLY alarm_tamper (bit 2 / 0x04), leaving all
 * other handling untouched. Idempotent.
 *
 * @param {Object} device
 * @param {Object} zclNode
 */
function attachTamperListener(device, zclNode) {
  try {
    if (device._tamperListenerAttached) { return; }
    if (typeof device.hasCapability === 'function' && !device.hasCapability('alarm_tamper')) { return; }
    const ep = zclNode && zclNode.endpoints && zclNode.endpoints[1];
    const ias = ep && ep.clusters && (ep.clusters.iasZone || ep.clusters.ssIasZone || ep.clusters[0x0500]);
    if (!ias) { return; }
    const apply = (zoneStatus) => {
      if (zoneStatus === undefined || zoneStatus === null) { return; }
      const tamper = typeof zoneStatus === 'number'
        ? (zoneStatus & 0x04) !== 0
        : Boolean(zoneStatus.tamper);
      (device.safeSetCapabilityValue || device.setCapabilityValue)
        .call(device, 'alarm_tamper', tamper).catch(() => {});
    };
    const previous = ias.onZoneStatusChangeNotification;
    ias.onZoneStatusChangeNotification = (payload) => {
      try { apply(payload && payload.zoneStatus); } catch (_e) { /* no-op */ }
      if (typeof previous === 'function') { return previous(payload); }
    };
    if (typeof ias.on === 'function') {
      try { ias.on('attr.zoneStatus', apply); } catch (_e) { /* not supported */ }
    }
    device._tamperListenerAttached = true;
    if (device.log) { device.log('[TAMPER] ✅ IAS tamper listener attached'); }
  } catch (e) {
    if (device.log) { device.log(`[TAMPER] ⚠️ attach failed (non-critical): ${e.message}`); }
  }
}

module.exports.attachTamperListener = attachTamperListener;
