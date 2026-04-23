'use strict';
const { safeMultiply } = require('../utils/tuyaUtils.js');

const CID = 0xFC11;
const MFR = { manufacturerCode: 0x1286, disableDefaultResponse: false };
const A = {
  networkLed: 0x0001,
  backLight: 0x0002,
  radioPower: 0x0012,
  delayedPowerOnState: 0x0014,
  delayedPowerOnTime: 0x0015,
  externalTriggerMode: 0x0016,
  detachRelayMode: 0x0017,
};

async function handleSonoffEwlSettings(device, key, value) {
  var cl = device._sonoffEwlCluster;
  if (!cl) return false;
  try {
    if (key === 'sonoff_network_led')
      await cl.writeAttributes({ [A.networkLed]: value === 'on' ? 1 : 0 }, MFR);
    else if (key === 'sonoff_turbo_mode')
      await cl.writeAttributes({ [A.radioPower]: value === 'on' ? 0x14 : 0x09 }, MFR);
    else if (key === 'sonoff_detach_relay')
      await cl.writeAttributes({ [A.detachRelayMode]: value === 'on' ? 1 : 0 }, MFR);
    else if (key === 'sonoff_external_trigger') {
      var m2 = { edge: 0, pulse: 1, following: 2 };
      await cl.writeAttributes({ [A.externalTriggerMode]: m2[value] || 0 }, MFR);
    } else if (key === 'sonoff_delayed_power_on')
      await cl.writeAttributes({ [A.delayedPowerOnState]: value === 'on' ? 1 : 0 }, MFR);
    else if (key === 'sonoff_delayed_power_on_time') {
      var t = Math.round((Math.round(parseFloat(value) || 1)));
      await cl.writeAttributes({ [A.delayedPowerOnTime]: t }, MFR);
    } else return false;
    device.log('[SONOFF-EWL] Wrote', key, '=', value);
    return true;
  } catch (e) {
    device.log('[SONOFF-EWL] Write err:', key, e.message);
    return false;
  }
}

async function setupSonoffEwelink(device, zclNode) {
  var m = (device.getSetting('zb_manufacturer_name') || '').toLowerCase();
  if (m !== 'sonoff' && m !== 'ewelink') return false;
  var ep = zclNode && zclNode.endpoints && zclNode.endpoints[1];
  if (!ep) return false;
  var cl = ep.clusters && ep.clusters[CID];
  if (!cl) return false;
  device.log('[SONOFF-EWL] Init 0xFC11');
  var vals = {};
  try { vals = (await cl.readAttributes(Object.values(A), MFR)) || {}; }
  catch (e) { device.log('[SONOFF-EWL] Read:', e.message); }

  if (vals[A.networkLed] !== undefined)
    device.setSettings({ sonoff_network_led: vals[A.networkLed] ? 'on' : 'off' }).catch(function () {});
  if (vals[A.radioPower] !== undefined)
    device.setSettings({ sonoff_turbo_mode: vals[A.radioPower] === 0x14 ? 'on' : 'off' }).catch(function () {});
  if (vals[A.detachRelayMode] !== undefined)
    device.setSettings({ sonoff_detach_relay: vals[A.detachRelayMode] ? 'on' : 'off' }).catch(function () {});
  if (vals[A.externalTriggerMode] !== undefined) {
    var tmap = { 0: 'edge', 1: 'pulse', 2: 'following' };
    device.setSettings({ sonoff_external_trigger: tmap[vals[A.externalTriggerMode]] || 'edge' }).catch(function () {});
  }

  device._sonoffEwlCluster = cl;
  device.log('[SONOFF-EWL] Ready');
  return true;
}

module.exports = { setupSonoffEwelink, handleSonoffEwlSettings };

