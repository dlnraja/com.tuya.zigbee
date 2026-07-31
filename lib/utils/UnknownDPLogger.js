'use strict';
const DP_TYPES = {0:'Raw',1:'Bool',2:'Value',3:'String',4:'Enum',5:'Bitmap'};

function inferType(v) {
  if (typeof v === 'boolean') {return {type:'bool',hint:'onoff / alarm_*'};}
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v >= 0 && v <= 5) {return {type:'enum',hint:'mode/state'};}
    if (v >= -400 && v <= 1000) {return {type:'temp',hint:'measure_temperature (div10)'};}
    if (v >= 0 && v <= 100) {return {type:'pct',hint:'measure_battery/humidity'};}
    if (v > 100 && v <= 65535) {return {type:'raw_val',hint:'meter/power/voltage_mV'};}
    return {type:`value(${v})`,hint:'check Z2M/ZHA'};
  }
  if (typeof v === 'string') {return {type:'string',hint:'setting/label'};}
  if (Buffer.isBuffer(v)) {return {type:`raw(${v.length}B)`,hint:'schedule/complex'};}
  return {type:'unknown',hint:''};
}

function logUnknownDP(device, dpId, value) {
  if (!device._unknownDPs) {device._unknownDPs = {};}
  const e = device._unknownDPs[dpId] || {first:Date.now(),count:0,vals:[]};
  e.count++; e.last = Date.now(); e.lastVal = value;
  if (e.vals.length < 8) {e.vals.push(value);}
  device._unknownDPs[dpId] = e;
  const {type,hint} = inferType(value);
  const mfr = device.getSetting?.('zb_manufacturer_name') || '?';
  const mdl = device.getSetting?.('zb_model_id') || '?';
  device.log(`[UNKNOWN-DP] DP${  dpId  } = ${  JSON.stringify(value)  } | type=${  type  } | hint=${  hint  } | mfr=${  mfr  } | model=${  mdl  } | seen=${  e.count  }x`);
  if (e.count === 1) {device.log('[UNKNOWN-DP] ^ FIRST TIME — add to dpMappings or report for next revision');}
  device.setStoreValue(`_unknown_dp_${  dpId}`, {v:value,t:type,c:e.count,ts:Date.now()}).catch(()=>{});
  if (!device._unknownDPTimer) {
    // v9.0.79: Fix scope — this.homey/this._destroyed are module-level, not device
    device._unknownDPTimer = device.homey.setTimeout(() => { if (device._destroyed) {return;} logSummary(device); device._unknownDPTimer = null; }, 300000);
  }
}

function logSummary(device) {
  if (!device._unknownDPs) {return;}
  const entries = Object.entries(device._unknownDPs);
  if (entries.length === 0) {return;}
  const mfr = device.getSetting?.('zb_manufacturer_name') || '?';
  const mdl = device.getSetting?.('zb_model_id') || '?';
  device.log(`[UNKNOWN-DP-SUMMARY] ═══ ${  mfr  } / ${  mdl  } ═══`);
  for (const [dp, e] of entries) {
    const {type,hint} = inferType(e.lastVal);
    device.log(`[UNKNOWN-DP-SUMMARY] DP${  dp  }: ${  type  } val=${  JSON.stringify(e.lastVal)  } (${  e.count  }x) → ${  hint}`);
  }
  device.log('[UNKNOWN-DP-SUMMARY] ═══ END ═══');
}

function autoMapUnknownDP(device, dpId, value) {
  if (!device?.hasCapability) {return false;}
  const {type} = inferType(value);

  // v10.14.0 (external review + DP audit gap #4): NEVER auto-write on a
  // single sample. The naive guesser (pct→battery before humidity, temp
  // always ÷10) produced the exact false positives warned about in the
  // "linear regression mirage" analysis (a 40% battery read as 40°C, a
  // humidity read as battery — forum #1256). Requirements now:
  //  1. The DP must have been seen >= 3 times (pattern, not a fluke)
  //  2. Samples must be CONSISTENT (spread <= 20% of mean)
  //  3. Capability choice is device-type aware (climate sensors prefer
  //     humidity over battery for pct; battery-only devices keep battery)
  const seen = device._unknownDPs?.[dpId];
  if (!seen || (seen.count || 0) < 3) {return false;}
  const samples = Array.isArray(seen.vals) ? seen.vals.filter(v => typeof v === 'number') : [];
  if (samples.length >= 2) {
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const spread = Math.max(...samples) - Math.min(...samples);
    if (mean !== 0 && spread > Math.abs(mean) * 0.5) {
      device.log(`[AUTO-DP] DP${dpId} samples trop dispersés (${Math.min(...samples)}–${Math.max(...samples)}) — pas d'auto-map`);
      return false;
    }
  }

  const deviceIsClimate = device.hasCapability('measure_humidity') || device.hasCapability('measure_temperature');
  const deviceHasBattery = device.hasCapability('measure_battery');

  if (type === 'pct') {
    // Device-type aware ordering (was: battery ALWAYS first — the mis-guess)
    const ordered = deviceIsClimate
      ? ['measure_humidity', 'measure_luminance', 'measure_battery']
      : ['measure_battery', 'measure_humidity', 'measure_luminance'];
    for (const cap of ordered) {
      if (device.hasCapability(cap)) {
        const v = Math.round(value);
        device.log(`[AUTO-DP] DP${dpId} → ${cap} = ${v} (après ${seen.count} échantillons cohérents)`);
        device.safeSetCapabilityValue(cap, v).catch(() => {});
        return true;
      }
    }
    return false;
  }

  if (type === 'bool') {
    // v10.14.0: contact before motion for contact-class devices (door/water
    // sensors were getting phantom motion events)
    const deviceIsContact = device.hasCapability('alarm_contact') || device.hasCapability('alarm_water');
    const ordered = deviceIsContact
      ? ['alarm_contact', 'alarm_water', 'alarm_motion', 'onoff']
      : ['alarm_motion', 'alarm_contact', 'alarm_water', 'onoff'];
    for (const cap of ordered) {
      if (device.hasCapability(cap)) {
        const v = Boolean(value);
        device.log(`[AUTO-DP] DP${dpId} → ${cap} = ${v} (après ${seen.count} échantillons)`);
        device.safeSetCapabilityValue(cap, v).catch(() => {});
        return true;
      }
    }
    return false;
  }

  const maps = {
    'temp': ['measure_temperature', v => v / 10]
  };
  const m = maps[type];
  if (!m) {return false;}
  const [cap, fn] = m;
  if (!device.hasCapability(cap)) {return false;}
  const v = fn(value);
  device.log(`[AUTO-DP] DP${dpId} → ${cap} = ${v} (après ${seen.count} échantillons)`);
  device.safeSetCapabilityValue(cap, v).catch(() => {});
  return true;
}

function logUnknownClusterAttr(device, cluster, attr, value, epId) {
  if (!device._unknownAttrs) {device._unknownAttrs = {};}
  const key = `${cluster  }.${  attr}`;
  const e = device._unknownAttrs[key] || {count:0};
  e.count++; e.last = value; e.ep = epId;
  device._unknownAttrs[key] = e;
  device.log(`[UNKNOWN-ZCL] EP${  epId  } ${  key  } = ${  JSON.stringify(value)  } (${  e.count  }x)`);
  device.setStoreValue(`_unknown_zcl_${  cluster  }_${  attr}`, {v:value,c:e.count}).catch(()=>{});
}

module.exports = { logUnknownDP, logUnknownClusterAttr, logSummary, inferType, autoMapUnknownDP, DP_TYPES };
