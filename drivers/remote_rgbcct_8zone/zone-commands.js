'use strict';

/**
 * Pure helpers + bound clusters for the MiBoxer FUT089Z (TS1002) 8-zone RGB+CCT remote.
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

module.exports = { zoneFromMeta, levelPct, huePct, satPct, warmthPct, sceneFromData, makeBound, MAX_ZONES };
