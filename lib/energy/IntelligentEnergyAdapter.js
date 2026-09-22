'use strict';

/**
 * IntelligentEnergyAdapter (P2672)
 *
 * Pourquoi: Homey Energy UI + mesh flood need ONE dynamic decision per device —
 * metered / approximate / battery / sleepy — without inventing parallel managers.
 * Comment: resolve profile from clusters + driver class + sacred couple hints,
 * then setEnergy + strip phantoms before SmartEnergyManager audit.
 * Pour qui: ALL tracks (Bastien + master + stable) BOTH.
 * Quand: onNodeInit via SmartEnergyManager.init / initSmartManagers.
 * Contre quoi: phantom measure_power on non-metered HOBEIAN; approximation+meter compose; battery on mains radar.
 *
 * Forbidden (energy-compensation-ssot): approximation + measure_power/meter_power together;
 * linear battery formulas; new parallel energy stack.
 */

const ENERGY_POWER_CAPS = ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
const BATTERY_CAPS = ['measure_battery', 'alarm_battery'];

const APPROX_USAGE_BY_CLASS = {
  light: 0.3,
  socket: 0.5,
  heater: 0,
  thermostat: 0.5,
  other: 0.2,
  button: 0,
  sensor: 0,
};

function containsCI(hay, needle) {
  return String(hay || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

function driverIdOf(device) {
  try {
    return String(device.driver?.id || device.driver?.manifest?.id || '').toLowerCase();
  } catch (_e) {
    return '';
  }
}

function classOf(device) {
  try {
    return String(typeof device.getClass === 'function' ? device.getClass() : '').toLowerCase();
  } catch (_e) {
    return '';
  }
}

function mfrPid(device) {
  const mfr = String(
    device.getSetting?.('zb_manufacturer_name')
    || device.getStoreValue?.('zb_manufacturer_name')
    || '',
  ).trim();
  const pid = String(
    device.getSetting?.('zb_model_id')
    || device.getStoreValue?.('zb_model_id')
    || '',
  ).trim();
  return { mfr, pid };
}

function hasZclEnergyClusters(device) {
  try {
    const eps = device.zclNode?.endpoints || {};
    for (const ep of Object.values(eps)) {
      const clusters = ep?.clusters || {};
      for (const key of Object.keys(clusters)) {
        const k = String(key).toLowerCase();
        if (
          k.includes('metering')
          || k.includes('electrical')
          || k === '0b04'
          || k === '0702'
          || k === '2820'
          || k === '1794'
        ) {
          return true;
        }
      }
    }
  } catch (_e) { /* soft */ }
  return false;
}

function looksHobeianLightingModule(device) {
  if (device._hobeianZg301z) return true;
  const { mfr, pid } = mfrPid(device);
  if (!containsCI(mfr, 'HOBEIAN') && !containsCI(mfr, 'heobian')) return false;
  // Wall modules without metering (Z2M: switch/countdown/switch_type only)
  if (/^ZG-301Z$/i.test(pid) || /^WHD02$/i.test(pid) || /^ZG-302Z1$/i.test(pid)) return true;
  if (!pid && driverIdOf(device).includes('switch_1gang')) return true;
  return false;
}

function looksBatteryDriver(driverId, cls) {
  return /sensor|button|remote|sos|leak|contact|motion|trv|radiator|knob|scene_switch|siren|climate|soil|rain|gas|vibration|illuminance|presence/.test(driverId)
    || /sensor|button|thermostat/.test(cls);
}

function looksMeteredDriver(driverId, cls) {
  // WHY: Homey class "socket" is also used for non-metered wall switches — never trust class alone.
  // Contre quoi: phantom Energy UI + ZCL storm on HOBEIAN / TS000x switches.
  if (/plug|outlet|energy_monitor|din_rail|smart_rcbo|smartplug|power_meter|energy_meter/.test(driverId)) {
    return true;
  }
  if (/^socket/.test(driverId) || /_socket$/.test(driverId)) return true;
  if (cls === 'socket' && /plug|outlet|meter|energy|din|rcbo/.test(driverId)) return true;
  return false;
}

function looksMainsNoBattery(driverId, device) {
  if (device.mainsPowered === true) return true;
  return /switch|dimmer|relay|gang|curtain|cover|plug|socket|radar|siren|gas|wall/.test(driverId)
    && !/button_wireless|scene_switch|climate|soil|contact|leak|motion/.test(driverId);
}

function guessBatteries(device) {
  const existing = device.getEnergy?.()?.batteries;
  if (Array.isArray(existing) && existing.length) return existing;
  const driverId = driverIdOf(device);
  if (/button|remote|knob|scene/.test(driverId)) return ['CR2032'];
  if (/leak|contact|door|window/.test(driverId)) return ['CR2032'];
  if (/climate|temp|humid|soil/.test(driverId)) return ['AAA'];
  if (/radar|presence|motion|pir/.test(driverId)) return ['CR2450'];
  return ['CR2032'];
}

/**
 * Resolve intelligent energy profile (pure — no side effects).
 * @returns {{ mode: string, reasons: string[], stripPowerCaps: boolean, stripBatteryCaps: boolean, setEnergy: object|null, mainsPowered: boolean|null, allowVirtualEstimate: boolean, skipZclEnergyBind: boolean }}
 */
function resolveProfile(device) {
  const driverId = driverIdOf(device);
  const cls = classOf(device);
  const meteredClusters = hasZclEnergyClusters(device);
  const reasons = [];
  const profile = {
    mode: 'unknown',
    reasons,
    stripPowerCaps: false,
    stripBatteryCaps: false,
    setEnergy: null,
    mainsPowered: null,
    allowVirtualEstimate: false,
    skipZclEnergyBind: false,
  };

  // 1) Real metering hardware wins
  if (meteredClusters || looksMeteredDriver(driverId, cls)) {
    reasons.push(meteredClusters ? 'zcl_electrical_or_metering' : 'driver_metered_class');
    profile.mode = 'metered';
    profile.mainsPowered = true;
    profile.stripBatteryCaps = true;
    profile.setEnergy = {}; // clear approximation if any — Homey keeps measured caps
    profile.allowVirtualEstimate = false;
    profile.skipZclEnergyBind = false;
    return profile;
  }

  // 2) HOBEIAN / lighting modules — approximation only (no phantom Energy)
  if (looksHobeianLightingModule(device)) {
    reasons.push('hobeian_lighting_no_meter');
    profile.mode = 'approximate';
    profile.mainsPowered = true;
    profile.stripPowerCaps = true;
    profile.stripBatteryCaps = true;
    profile.setEnergy = { approximation: { usageConstant: APPROX_USAGE_BY_CLASS.light } };
    profile.allowVirtualEstimate = false;
    profile.skipZclEnergyBind = true;
    return profile;
  }

  // 3) VicHY-style mains radar (presence) — no battery phantoms
  if (/presence|radar/.test(driverId) && (device.mainsPowered === true || looksMainsNoBattery(driverId, device))) {
    if (device.mainsPowered === true || !looksBatteryDriver(driverId, cls)) {
      reasons.push('mains_presence_radar');
      profile.mode = 'mains_sensor';
      profile.mainsPowered = true;
      profile.stripPowerCaps = true;
      profile.stripBatteryCaps = true;
      profile.setEnergy = { approximation: { usageConstant: 1.5 } };
      profile.skipZclEnergyBind = true;
      return profile;
    }
  }

  // 4) Mains switches/dimmers/curtains without metering clusters
  if (looksMainsNoBattery(driverId, device) && !looksBatteryDriver(driverId, cls)) {
    reasons.push('mains_without_meter_clusters');
    profile.mode = 'approximate';
    profile.mainsPowered = true;
    profile.stripPowerCaps = true;
    profile.stripBatteryCaps = true;
    const usage = APPROX_USAGE_BY_CLASS[cls] ?? APPROX_USAGE_BY_CLASS.other;
    profile.setEnergy = { approximation: { usageConstant: usage } };
    profile.allowVirtualEstimate = true;
    profile.skipZclEnergyBind = true;
    return profile;
  }

  // 5) Battery / sleepy sensors & remotes
  if (looksBatteryDriver(driverId, cls) || device.mainsPowered === false) {
    reasons.push('battery_or_sleepy');
    profile.mode = 'battery';
    profile.mainsPowered = false;
    profile.stripPowerCaps = true;
    profile.stripBatteryCaps = false;
    profile.setEnergy = { batteries: guessBatteries(device) };
    profile.skipZclEnergyBind = true;
    return profile;
  }

  reasons.push('fallback_unknown');
  profile.mode = 'unknown';
  return profile;
}

async function stripCaps(device, caps) {
  for (const cap of caps) {
    try {
      if (typeof device.hasCapability === 'function' && device.hasCapability(cap)) {
        await device.removeCapability(cap).catch(() => {});
      }
    } catch (_e) { /* soft */ }
  }
}

/**
 * Apply profile to live Homey device (idempotent).
 */
async function apply(device, options = {}) {
  if (!device || device._destroyed) return null;
  if (device._intelligentEnergyApplied && !options.force) {
    return device._intelligentEnergyProfile || null;
  }

  const profile = resolveProfile(device);
  device._intelligentEnergyProfile = profile;
  device._energyMode = profile.mode;

  if (profile.mainsPowered === true) {
    device.mainsPowered = true;
  } else if (profile.mainsPowered === false) {
    device.mainsPowered = false;
  }

  if (profile.stripPowerCaps) {
    await stripCaps(device, ENERGY_POWER_CAPS);
  }
  if (profile.stripBatteryCaps) {
    await stripCaps(device, BATTERY_CAPS);
  }

  if (profile.setEnergy && typeof device.setEnergy === 'function') {
    try {
      // Never send approximation while measure_power/meter_power still present
      const stillMetered = ENERGY_POWER_CAPS.slice(0, 2).some(
        (c) => typeof device.hasCapability === 'function' && device.hasCapability(c),
      );
      if (stillMetered && profile.setEnergy.approximation) {
        device.log?.('[P2672] skip setEnergy(approximation) — metering caps still present');
      } else {
        await device.setEnergy(profile.setEnergy).catch((e) => {
          device.log?.(`[P2672] setEnergy soft-fail: ${e.message}`);
        });
      }
    } catch (_e) { /* soft */ }
  }

  try {
    await device.setStoreValue?.('energy_mode', profile.mode).catch(() => {});
    await device.setStoreValue?.('energy_profile_reasons', profile.reasons).catch(() => {});
  } catch (_e) { /* soft */ }

  device._intelligentEnergyApplied = true;
  device.log?.(
    `[P2672] IntelligentEnergyAdapter mode=${profile.mode} reasons=${profile.reasons.join(',')}`,
  );
  return profile;
}

module.exports = {
  resolveProfile,
  apply,
  hasZclEnergyClusters,
  looksHobeianLightingModule,
  ENERGY_POWER_CAPS,
  APPROX_USAGE_BY_CLASS,
};
