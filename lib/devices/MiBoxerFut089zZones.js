'use strict';

/**
 * Folded into button_wireless_4 (exact couple _TZ3000_xwh1e22x + TS1002). Pure helpers + bound clusters for the MiBoxer FUT089Z (TS1002) 8-zone RGB+CCT remote.
 * The remote sends ZCL commands (onOff, levelControl, colorControl) to Zigbee group base+N for zone N
 * (factory base 100), plus the Tuya scene command 0xFD on genOnOff.
 * Behaviour credit: Zigbee2MQTT miboxer.ts (Koen Kanters and contributors); u236/homed-service-zigbee and
 * JohanBendz/com.tuya.zigbee#1361 confirm the device. Our own implementation for Homey.
 */
const { BoundCluster } = require('zigbee-clusters');

const MAX_ZONES = 8;

function zoneFromMeta(meta, base = 100) {
  const g = meta && typeof meta.groupId === 'number' ? meta.groupId : null;
  if (g === null) {return 0;}
  const z = g - Number(base);
  return z >= 1 && z <= MAX_ZONES ? z : 0;
}

const levelPct = (level) => Math.max(0, Math.min(100, Math.round((Number(level) || 0) / 254 * 100)));
const huePct = (hue) => Math.round((Number(hue) || 0) / 254 * 360);
const satPct = (sat) => Math.max(0, Math.min(100, Math.round((Number(sat) || 0) / 254 * 100)));
// FUT089Z CCT range 153..370 mired (Z2M colorTemp range); warmth 0 = coolest, 100 = warmest
const warmthPct = (mireds) => Math.max(0, Math.min(100, Math.round(((Number(mireds) || 153) - 153) / (370 - 153) * 100)));

const sceneFromData = (d) => {
  if (Buffer.isBuffer(d) || Array.isArray(d)) {return d[0];}
  if (d && typeof d === 'object' && 'value' in d) {return d.value;}
  return typeof d === 'number' ? d : undefined;
};

function makeBound(emit) {
  const safe = (event, data, meta) => { try { emit(event, data, meta); } catch (_e) { /* never drop frames */ } };

  class OnOff extends BoundCluster {
    on(_a, meta) { safe('on', {}, meta); }
    off(_a, meta) { safe('off', {}, meta); }
    async handleFrame(frame, meta, rawFrame) {
      const cmd = frame && (frame.cmdId ?? frame.commandId);
      if (cmd === 0xFD) {
        const data = frame.data ?? rawFrame;
        safe('scene', { scene: sceneFromData(Buffer.isBuffer(data) ? data : frame.data) }, meta);
        return;
      }
      return super.handleFrame(frame, meta, rawFrame);
    }
  }

  class Level extends BoundCluster {
    moveToLevel(a, meta) { safe('brightness', { brightness: levelPct(a && a.level) }, meta); }
    moveToLevelWithOnOff(a, meta) { safe('brightness', { brightness: levelPct(a && a.level) }, meta); }
  }

  class Color extends BoundCluster {
    moveToColorTemperature(a, meta) {
      const m = Number(a && a.colorTemperature) || 0;
      safe('color_temperature', { mireds: m, warmth: warmthPct(m) }, meta);
    }
    moveToHueAndSaturation(a, meta) { safe('color', { hue: huePct(a && a.hue), saturation: satPct(a && a.saturation) }, meta); }
  }

  return { OnOff, Level, Color };
}

const COUPLE_MFR = '_tz3000_xwh1e22x';
const COUPLE_PID = 'TS1002';
const EVENTS = ['on', 'off', 'brightness', 'color_temperature', 'color', 'scene'];
const TRIGGER_PREFIX = 'button_wireless_4_fut089z_';

/** Exact couple only (case-insensitive mfr, exact pid). */
function isFut089z(device) {
  try {
    const mfr = String(device.getSetting?.('zb_manufacturer_name') || device.getData?.()?.manufacturerName || device.getStoreValue?.('manufacturerName') || '').toLowerCase();
    const pid = String(device.getSetting?.('zb_model_id') || device.getData?.()?.productId || device.getStoreValue?.('modelId') || '').toUpperCase();
    return mfr === COUPLE_MFR && pid === COUPLE_PID;
  } catch (_e) { return false; }
}

/**
 * Folded profile (2026-10-11): the FUT089Z ships through button_wireless_4 because new driver ids are
 * rejected by Athom processing. Battery + bound onOff/levelControl/colorControl, one trigger per event
 * with a zone token; zone base = factory 100 (groups 101..108).
 */
function installFut089z(device, zclNode, base = 100) {
  try {
    const { CLUSTER } = require('zigbee-clusters');
    try { device.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION); } catch (e) { device.log('[FUT089Z] battery skipped:', e.message); }
    const emit = (event, data, meta) => {
      const zone = zoneFromMeta(meta, base);
      device.log(`[FUT089Z] ${event} zone=${zone}`, JSON.stringify(data));
      try {
        device.homey.flow.getDeviceTriggerCard(`${TRIGGER_PREFIX}${event}`)
          .trigger(device, { zone, ...data }, { zone })
          .catch((e) => device.error(`[FUT089Z] trigger ${event}: ${e.message}`));
      } catch (e) { device.error(`[FUT089Z] card ${event}: ${e.message}`); }
    };
    const { OnOff, Level, Color } = makeBound(emit);
    const ep = zclNode && zclNode.endpoints && zclNode.endpoints[1];
    for (const [name, Cls] of [[CLUSTER.ON_OFF.NAME, OnOff], [CLUSTER.LEVEL_CONTROL.NAME, Level], [CLUSTER.COLOR_CONTROL.NAME, Color]]) {
      try { ep.bind(name, new Cls()); } catch (e) { device.log(`[FUT089Z] bind ${name} skipped:`, e.message); }
    }
    return true;
  } catch (e) { try { device.error('[FUT089Z] install failed:', e.message); } catch (_e) { /* ignore */ } return false; }
}

module.exports = { isFut089z, installFut089z, EVENTS, TRIGGER_PREFIX, zoneFromMeta, levelPct, huePct, satPct, warmthPct, sceneFromData, makeBound, MAX_ZONES };
