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
};

const CAP_CLUSTER = {
  onoff: { label: 'genOnOff', names: ['onOff', 'genOnOff'], id: 0x0006 },
  dim: { label: 'genLevelCtrl', names: ['levelControl', 'genLevelCtrl'], id: 0x0008 },
  light_temperature: { label: 'lightingColorCtrl', names: ['colorControl', 'lightingColorCtrl'], id: 0x0300 },
  windowcoverings_set: { label: 'closuresWindowCovering', names: ['windowCovering', 'closuresWindowCovering'], id: 0x0102 },
  windowcoverings_state: { label: 'closuresWindowCovering', names: ['windowCovering', 'closuresWindowCovering'], id: 0x0102 },
};

function _endpointFor(capability, opts = {}) {
  if (opts.endpoint) {return opts.endpoint;}
  const m = String(capability).match(/(?:gang|channel)(\d+)/i);
  if (m) {return Number(m[1]);}
  return 1;
}

function _baseCap(capability) {
  const s = String(capability);
  if (s.startsWith('onoff')) {return 'onoff';}
  if (s.startsWith('dim')) {return 'dim';}
  if (s.startsWith('windowcoverings')) {return s.split('.')[0];}
  if (s.startsWith('light_')) {return s;}
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
  throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
}

async function _sendTuyaDp(device, capability, value, opts = {}) {
  const map = opts.dpMap || DEFAULT_DP_MAP[capability] || DEFAULT_DP_MAP[_baseCap(capability)];
  if (!map) {
    throw new Error(`no-dp-map:${capability}`);
  }
  const dp = opts.dpId != null ? opts.dpId : map.dp;
  const type = opts.dpType || map.type;
  const encoded = typeof map.encode === 'function' ? map.encode(value) : value;

  if (device.tuyaEF00Manager && typeof device.tuyaEF00Manager.sendDP === 'function') {
    const ok = await device.tuyaEF00Manager.sendDP(dp, encoded, type);
    if (ok === false) {throw new Error(`dp-send-failed:${dp}`);}
    return { dp, encoded };
  }
  if (typeof device._sendTuyaDP === 'function') {
    await device._sendTuyaDP(dp, encoded, type);
    return { dp, encoded };
  }
  if (typeof device.writeBool === 'function' && type === 'bool') {
    await device.writeBool(dp, encoded);
    return { dp, encoded };
  }
  if (typeof device.writeData32 === 'function' && type === 'value') {
    await device.writeData32(dp, encoded);
    return { dp, encoded };
  }
  if (typeof device.writeEnum === 'function' && type === 'enum') {
    await device.writeEnum(dp, encoded);
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

  steps.push({
    name: 'tuya-dp',
    run: async () => {
      await _sendTuyaDp(device, capability, value, opts);
      return 'tuya-dp';
    },
  });

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
    const probes = steps.slice(0, 3); // named, raw, dp
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
  const hasCluster = (() => {
    try {
      const ep = opts.endpoint || 1;
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
          ...opts,
          parallelDiscover: true,
        });
        if (!r.ok) {throw r.error || new Error(`capability_unreachable:${capability}`);}
      });
    }
    return false;
  }

  try {
    if (typeof device.registerCapability === 'function') {
      // Call through the original ZigBeeDevice path carefully — callers should
      // pass the parent registerCapability bound method as opts.parentRegister.
      if (typeof opts.parentRegister === 'function') {
        await opts.parentRegister.call(device, capability, cluster, opts);
      } else {
        // Best-effort: many bases already overrode registerCapability
        await Object.getPrototypeOf(Object.getPrototypeOf(device))
          ?.registerCapability?.call(device, capability, cluster, opts);
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
          ...opts,
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
};
