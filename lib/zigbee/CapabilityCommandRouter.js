'use strict';

/**
 * CapabilityCommandRouter — low-level UNSUPPORTED_CLUSTER handling
 *
 * When Homey/ZCL rejects a control cluster (status 0x81 / "UNSUPPORTED_CLUSTER"),
 * cascade through parallel protocol methods and remember the winner:
 *   1. ZCL named cluster (onOff / levelControl / …)
 *   2. ZCL raw/numeric cluster id (0x0006 / 0x0008 / …)
 *   3. Tuya DP EF00 (bool / value)
 *   4. Optional custom runners from the caller
 *
 * Discovery mode (`parallelDiscover: true` on first unknown path) fires
 * ZCL + DP in parallel via Promise.allSettled — first success wins and is
 * persisted in `zcl_working_paths`. Subsequent writes use the remembered path.
 */

const { execChain, findRawCluster, CLUSTER_NAME_TO_ID } = require('./FallbackChains');
const { getRegistry, isUnsupportedError } = require('./UnsupportedRegistry');
const { shouldWaitForDefaultResponse } = require('./ZclDefaultResponsePolicy');
const {
  endpointForCapability,
  parseGangFromCapability,
  isZclOnlyDevice,
} = require('../utils/endpointCapability');

/** Default Tuya DP map for common control capabilities (gang1). */
const DEFAULT_DP_MAP = {
  onoff: { dp: 1, type: 'bool', encode: (v) => Boolean(v) },
  dim: { dp: 2, type: 'value', encode: (v) => Math.max(0, Math.min(1000, Math.round(Number(v) * 1000))) },
  'onoff.gang2': { dp: 2, type: 'bool', encode: (v) => Boolean(v) },
  'onoff.channel2': { dp: 3, type: 'bool', encode: (v) => Boolean(v) },
  'dim.channel2': { dp: 4, type: 'value', encode: (v) => Math.max(0, Math.min(1000, Math.round(Number(v) * 1000))) },
  'onoff.gang3': { dp: 3, type: 'bool', encode: (v) => Boolean(v) },
  'onoff.gang4': { dp: 4, type: 'bool', encode: (v) => Boolean(v) },
  windowcoverings_set: { dp: 2, type: 'value', encode: (v) => Math.max(0, Math.min(100, Math.round(Number(v) * 100))) },
  // P2544 complementary DP defaults (EF00 alternate — never invent pid)
  target_temperature: { dp: 2, type: 'value', encode: (v) => Math.round(Number(v) * 10) },
  thermostat_mode: { dp: 2, type: 'enum', encode: (v) => v },
  fan_speed: { dp: 3, type: 'enum', encode: (v) => v },
  locked: { dp: 1, type: 'bool', encode: (v) => Boolean(v) },
  volume_set: { dp: 5, type: 'value', encode: (v) => Math.max(0, Math.min(100, Math.round(Number(v)))) },
};

/** Polymorphic capability → ZCL cluster meta (discover + cascade). P2544 expands coverage. */
const CAP_CLUSTER = {
  onoff: { label: 'genOnOff', names: ['onOff', 'genOnOff'], id: 0x0006 },
  dim: { label: 'genLevelCtrl', names: ['levelControl', 'genLevelCtrl'], id: 0x0008 },
  light_temperature: { label: 'lightingColorCtrl', names: ['colorControl', 'lightingColorCtrl'], id: 0x0300 },
  light_hue: { label: 'lightingColorCtrl', names: ['colorControl', 'lightingColorCtrl'], id: 0x0300 },
  light_saturation: { label: 'lightingColorCtrl', names: ['colorControl', 'lightingColorCtrl'], id: 0x0300 },
  light_mode: { label: 'lightingColorCtrl', names: ['colorControl', 'lightingColorCtrl'], id: 0x0300 },
  windowcoverings_set: { label: 'closuresWindowCovering', names: ['windowCovering', 'closuresWindowCovering'], id: 0x0102 },
  windowcoverings_state: { label: 'closuresWindowCovering', names: ['windowCovering', 'closuresWindowCovering'], id: 0x0102 },
  windowcoverings_tilt_set: { label: 'closuresWindowCovering', names: ['windowCovering', 'closuresWindowCovering'], id: 0x0102 },
  target_temperature: { label: 'hvacThermostat', names: ['thermostat', 'hvacThermostat'], id: 0x0201 },
  thermostat_mode: { label: 'hvacThermostat', names: ['thermostat', 'hvacThermostat'], id: 0x0201 },
  fan_speed: { label: 'hvacFanCtrl', names: ['fanControl', 'hvacFanCtrl'], id: 0x0202 },
  locked: { label: 'closuresDoorLock', names: ['doorLock', 'closuresDoorLock'], id: 0x0101 },
  volume_set: { label: 'genLevelCtrl', names: ['levelControl', 'genLevelCtrl'], id: 0x0008 },
  measure_power: { label: 'haElectricalMeasurement', names: ['electricalMeasurement', 'haElectricalMeasurement'], id: 0x0B04 },
  meter_power: { label: 'seMetering', names: ['metering', 'seMetering'], id: 0x0702 },
  measure_voltage: { label: 'haElectricalMeasurement', names: ['electricalMeasurement', 'haElectricalMeasurement'], id: 0x0B04 },
  measure_current: { label: 'haElectricalMeasurement', names: ['electricalMeasurement', 'haElectricalMeasurement'], id: 0x0B04 },
  measure_temperature: { label: 'msTemperatureMeasurement', names: ['temperatureMeasurement', 'msTemperatureMeasurement'], id: 0x0402 },
  measure_humidity: { label: 'msRelativeHumidity', names: ['relativeHumidity', 'msRelativeHumidity'], id: 0x0405 },
  measure_co2: { label: 'msCO2', names: ['msCO2', 'carbonDioxideMeasurement', 'msCarbonDioxide'], id: 0x040d },
  measure_pm25: { label: 'pm25Measurement', names: ['pm25Measurement', 'msFineParticle'], id: 0x042a },
  measure_voc: { label: 'vocMeasurement', names: ['vocMeasurement', 'msVOC', 'msVoc'], id: 0x042b },
  measure_battery: { label: 'genPowerCfg', names: ['powerConfiguration', 'genPowerCfg'], id: 0x0001 },
  alarm_motion: { label: 'ssIasZone', names: ['iasZone', 'ssIasZone'], id: 0x0500 },
  alarm_contact: { label: 'ssIasZone', names: ['iasZone', 'ssIasZone'], id: 0x0500 },
  alarm_water: { label: 'ssIasZone', names: ['iasZone', 'ssIasZone'], id: 0x0500 },
};

function _endpointFor(capability, opts = {}) {
  return endpointForCapability(capability, opts);
}

function _dpIdFor(capability, opts = {}) {
  if (opts.dpId != null) {return opts.dpId;}
  if (opts.dpMap && opts.dpMap.dp != null) {return opts.dpMap.dp;}
  if (DEFAULT_DP_MAP[capability]) {return DEFAULT_DP_MAP[capability].dp;}
  const gang = parseGangFromCapability(capability);
  if (gang && gang >= 2) {return gang;}
  if (_baseCap(capability) === 'onoff' && capability !== 'onoff') {
    return null;
  }
  return DEFAULT_DP_MAP[_baseCap(capability)]?.dp ?? null;
}

function _baseCap(capability) {
  const s = String(capability);
  if (s.startsWith('onoff')) {return 'onoff';}
  if (s.startsWith('dim')) {return 'dim';}
  if (s.startsWith('windowcoverings')) {return s.split('.')[0];}
  if (s.startsWith('light_')) {return s;}
  if (s.startsWith('measure_')) {return s;}
  if (s.startsWith('meter_')) {return s;}
  if (s.startsWith('alarm_')) {return s;}
  if (s === 'target_temperature' || s.startsWith('target_temperature')) {return 'target_temperature';}
  return s;
}

function _findNamedCluster(device, capability, endpointId) {
  const meta = CAP_CLUSTER[_baseCap(capability)];
  if (!meta) {return null;}
  const ep = device?.zclNode?.endpoints?.[endpointId];
  if (!ep?.clusters) {return null;}
  for (const name of meta.names) {
    if (ep.clusters[name]) {return { cluster: ep.clusters[name], label: meta.label };}
  }
  return null;
}

async function _zclWrite(cluster, capability, value) {
  const base = _baseCap(capability);
  if (base === 'onoff') {
    if (value) {
      if (typeof cluster.setOn === 'function') {return cluster.setOn();}
      if (typeof cluster.on === 'function' && cluster.on.length === 0) {return cluster.on();}
    } else {
      if (typeof cluster.setOff === 'function') {return cluster.setOff();}
      if (typeof cluster.off === 'function') {return cluster.off();}
    }
    throw Object.assign(new Error('UNSUPPORTED_CLUSTER_COMMAND'), { status: 0x81 });
  }
  if (base === 'dim') {
    const level = Math.max(0, Math.min(254, Math.round(Number(value) * 254)));
    if (typeof cluster.moveToLevel === 'function') {
      return cluster.moveToLevel({ level, transitionTime: 10 });
    }
    if (typeof cluster.moveToLevelWithOnOff === 'function') {
      return cluster.moveToLevelWithOnOff({ level, transitionTime: 10 });
    }
    throw Object.assign(new Error('UNSUPPORTED_CLUSTER_COMMAND'), { status: 0x81 });
  }
  if (base === 'windowcoverings_set') {
    const pct = Math.max(0, Math.min(100, Math.round(Number(value) * 100)));
    if (typeof cluster.goToLiftPercentage === 'function') {
      return cluster.goToLiftPercentage({ percentageLiftValue: pct });
    }
    throw Object.assign(new Error('UNSUPPORTED_CLUSTER_COMMAND'), { status: 0x81 });
  }
  // P2544 complementary control writes (thermostat / lock / fan)
  if (base === 'target_temperature') {
    const raw = Math.round(Number(value) * 100);
    if (typeof cluster.writeAttributes === 'function') {
      return cluster.writeAttributes({ occupiedHeatingSetpoint: raw });
    }
    throw Object.assign(new Error('UNSUPPORTED_CLUSTER_COMMAND'), { status: 0x81 });
  }
  if (base === 'locked') {
    if (value) {
      if (typeof cluster.lockDoor === 'function') {return cluster.lockDoor();}
    } else if (typeof cluster.unlockDoor === 'function') {
      return cluster.unlockDoor();
    }
    throw Object.assign(new Error('UNSUPPORTED_CLUSTER_COMMAND'), { status: 0x81 });
  }
  // measure_* / alarm_* are RX-oriented — no ZCL write cascade here
  if (base.startsWith('measure_') || base.startsWith('meter_') || base.startsWith('alarm_')) {
    throw Object.assign(new Error('RX_ONLY_CAPABILITY'), { status: 0x81 });
  }
  throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
}

async function _sendTuyaDp(device, capability, value, opts = {}) {
  const map = opts.dpMap || DEFAULT_DP_MAP[capability] || (
    capability === 'onoff' || _baseCap(capability) !== 'onoff'
      ? DEFAULT_DP_MAP[_baseCap(capability)]
      : null
  );
  const dp = _dpIdFor(capability, opts);
  if (dp == null) {
    throw new Error(`no-dp-map:${capability}`);
  }
  const type = opts.dpType || map?.type || 'bool';
  const encoded = typeof map?.encode === 'function'
    ? map.encode(value)
    : (_baseCap(capability) === 'onoff' ? Boolean(value) : value);

  if (device.tuyaEF00Manager && typeof device.tuyaEF00Manager.sendDP === 'function') {
    const ok = await device.tuyaEF00Manager.sendDP(dp, encoded, type);
    if (ok === false) {throw new Error(`dp-send-failed:${dp}`);}
    return { dp, encoded };
  }
  if (typeof device._sendTuyaDP === 'function') {
    const ok = await device._sendTuyaDP(dp, encoded, type);
    if (ok === false) {throw new Error(`dp-send-failed:${dp}`);}
    return { dp, encoded };
  }
  if (typeof device.writeBool === 'function' && type === 'bool') {
    const ok = await device.writeBool(dp, encoded);
    // P2314: writeBool soft-returns false on IEEE miss — must not fake success
    if (ok === false) {throw new Error(`dp-send-failed:${dp}`);}
    return { dp, encoded };
  }
  if (typeof device.writeData32 === 'function' && type === 'value') {
    const ok = await device.writeData32(dp, encoded);
    if (ok === false) {throw new Error(`dp-send-failed:${dp}`);}
    return { dp, encoded };
  }
  if (typeof device.writeEnum === 'function' && type === 'enum') {
    const ok = await device.writeEnum(dp, encoded);
    if (ok === false) {throw new Error(`dp-send-failed:${dp}`);}
    return { dp, encoded };
  }
  throw new Error('no-tuya-dp-sender');
}

/**
 * Write a capability value with low-level protocol cascade.
 *
 * @param {Object} device
 * @param {string} capability
 * @param {*} value
 * @param {Object} [opts]
 * @param {number} [opts.endpoint]
 * @param {number} [opts.dpId]
 * @param {string} [opts.dpType]
 * @param {Object} [opts.dpMap]
 * @param {boolean} [opts.parallelDiscover] - race ZCL+DP when path unknown
 * @param {Array<{name:string,run:Function}>} [opts.extraSteps]
 * @returns {Promise<{ok:boolean,via:string|null,error?:Error}>}
 */
async function writeCapabilityWithFallbacks(device, capability, value, opts = {}) {
  const endpointId = _endpointFor(capability, opts);
  const domain = `cmd.${capability}`;
  const registry = getRegistry(device);
  const named = _findNamedCluster(device, capability, endpointId);
  const meta = CAP_CLUSTER[_baseCap(capability)];
  const skipDp = opts.skipDp === true
    || (isZclOnlyDevice(device) && opts.forceDp !== true)
    || (opts.forceDp !== true
      && Number(device?.gangCount) > 1
      && device?._isPureTuyaDP !== true);

  const steps = [];

  if (named?.cluster) {
    steps.push({
      name: 'zcl-named',
      run: async () => {
        await _zclWrite(named.cluster, capability, value);
        return 'zcl-named';
      },
    });
  }

  if (meta) {
    steps.push({
      name: 'zcl-raw-numeric',
      run: async () => {
        const raw = findRawCluster(device, meta.label, endpointId)
          || device?.zclNode?.endpoints?.[endpointId]?.clusters?.[meta.id]
          || device?.zclNode?.endpoints?.[endpointId]?.clusters?.[String(meta.id)];
        if (!raw || raw === named?.cluster) {
          throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
        }
        await _zclWrite(raw, capability, value);
        return 'zcl-raw-numeric';
      },
    });
  }

  if (!skipDp) {
    steps.push({
      name: 'tuya-dp',
      run: async () => {
        await _sendTuyaDp(device, capability, value, opts);
        return 'tuya-dp';
      },
    });
  }

  if (Array.isArray(opts.extraSteps)) {
    for (const s of opts.extraSteps) {steps.push(s);}
  }

  // Parallel discovery: when no remembered path, race ZCL + DP once
  const remembered = (() => {
    try {
      const paths = device.getStoreValue?.('zcl_working_paths');
      return paths && paths[domain];
    } catch (_e) { return null; }
  })();

  if (opts.parallelDiscover && !remembered && steps.length >= 2) {
    // Never race Tuya DP against ZCL for gang≥2 — leftover EF00 DP1/DP2
    // cross-links relays on ZCL-standard multi-gang switches.
    const probes = (endpointId > 1)
      ? steps.filter((s) => s.name !== 'tuya-dp').slice(0, 2)
      : steps.slice(0, 3);
    if (probes.length) {
      const settled = await Promise.allSettled(probes.map(async (step) => {
        if (registry.isKnown(domain, step.name)) {
          throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
        }
        const result = await step.run();
        return { name: step.name, result };
      }));

      let winner = null;
      for (let i = 0; i < settled.length; i++) {
        const s = settled[i];
        const step = probes[i];
        if (s.status === 'fulfilled') {
          if (!winner) {winner = s.value;}
        } else if (isUnsupportedError(s.reason)) {
          registry.mark(domain, step.name, 'parallel-next');
        }
      }
      if (winner) {
        try {
          const paths = { ...(device.getStoreValue?.('zcl_working_paths') || {}) };
          paths[domain] = winner.name;
          await device.setStoreValue?.('zcl_working_paths', paths);
          device.log?.(`[CMD-FALLBACK] ${capability} parallel discover → ${winner.name}`);
        } catch (_e) { /* noop */ }
        return { ok: true, via: winner.name };
      }
    }
  }

  const out = await execChain(device, domain, steps);
  if (!out.ok && out.error && isUnsupportedError(out.error)) {
    device.log?.(`[CMD-FALLBACK] ${capability} all paths unsupported: ${out.error.message}`);
  }
  return { ok: out.ok, via: out.via, error: out.error };
}

/**
 * Safe registerCapability: if Homey/ZCL throws UNSUPPORTED_CLUSTER, fall back
 * to a plain capability listener that uses writeCapabilityWithFallbacks.
 */
async function registerCapabilitySafe(device, capability, cluster, opts = {}) {
  const cmdOpts = { ...opts };
  if (cmdOpts.waitForResponse === undefined && shouldWaitForDefaultResponse(device) === false) {
    cmdOpts.waitForResponse = false;
  }
  const hasCluster = (() => {
    try {
      const ep = cmdOpts.endpoint || 1;
      const clusters = device.zclNode?.endpoints?.[ep]?.clusters || {};
      if (!cluster) {return false;}
      if (typeof cluster === 'string') {
        return !!(clusters[cluster] || clusters[cluster.replace(/^gen/, '')] || clusters[cluster.toLowerCase()]);
      }
      if (cluster && cluster.ID != null) {
        return !!(clusters[cluster.ID] || clusters[String(cluster.ID)]);
      }
      return true;
    } catch (_e) { return false; }
  })();

  if (!hasCluster) {
    device.log?.(`[CMD-FALLBACK] skip registerCapability(${capability}) — cluster absent, listener+DP only`);
    if (typeof device.registerCapabilityListener === 'function') {
      device.registerCapabilityListener(capability, async (value) => {
        const r = await writeCapabilityWithFallbacks(device, capability, value, {
          ...cmdOpts,
          parallelDiscover: true,
        });
        if (!r.ok) {throw r.error || new Error(`capability_unreachable:${capability}`);}
      });
    }
    return false;
  }

  try {
    if (typeof device.registerCapability === 'function') {
      if (typeof cmdOpts.parentRegister === 'function') {
        await cmdOpts.parentRegister.call(device, capability, cluster, cmdOpts);
      } else {
        await Object.getPrototypeOf(Object.getPrototypeOf(device))
          ?.registerCapability?.call(device, capability, cluster, cmdOpts);
      }
    }
    return true;
  } catch (err) {
    if (!isUnsupportedError(err)) {throw err;}
    getRegistry(device).mark(String(cluster?.NAME || cluster || 'cluster'), capability, 'capability-listener+dp');
    device.log?.(`[CMD-FALLBACK] registerCapability(${capability}) unsupported → DP listener`);
    if (typeof device.registerCapabilityListener === 'function') {
      device.registerCapabilityListener(capability, async (value) => {
        const r = await writeCapabilityWithFallbacks(device, capability, value, {
          ...cmdOpts,
          parallelDiscover: true,
        });
        if (!r.ok) {throw r.error || new Error(`capability_unreachable:${capability}`);}
      });
    }
    return false;
  }
}

module.exports = {
  writeCapabilityWithFallbacks,
  registerCapabilitySafe,
  DEFAULT_DP_MAP,
  CAP_CLUSTER,
  isUnsupportedError,
  CLUSTER_NAME_TO_ID,
  _endpointFor,
  _dpIdFor,
};
