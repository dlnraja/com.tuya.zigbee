'use strict';

/**
 * Zigbee + Tuya evolution brief (P2537).
 * Loads config/architecture/zigbee-tuya-evolution-ssot.json (Buffer parse — Homey heap safe).
 * WHY: Contre quoi = treating Suzi/Matter/GreenPower as drop-in EF00 fingerprints.
 */

const fs = require('fs');
const path = require('path');

const SSOT_PATH = path.join(__dirname, '..', '..', 'config', 'architecture', 'zigbee-tuya-evolution-ssot.json');
const ROOT = path.join(__dirname, '..', '..');

let _cache = null;

function loadEvolutionSsot() {
  if (_cache) {return _cache;}
  try {
    const buf = fs.readFileSync(SSOT_PATH);
    _cache = JSON.parse(buf);
    return _cache;
  } catch (e) {
    // Homey-safe fallback — never crash boot if SSOT path missing after compact
    _cache = {
      id: 'zigbee-tuya-evolution-ssot-fallback',
      patch: 'P2537',
      dualApp: 'BOTH',
      homeyDefaultRadio: '2.4 GHz IEEE 802.15.4 Zigbee (typical Zigbee 3.0 / PRO stack on Homey Pro)',
      doctrine: {
        noInventPid: true,
        noForumPost: true,
        complementaryOnly: true,
        suziNotDropInOnExistingHomey: true,
        matterNotRadio: true
      },
      zigbeeLineage: [
        { id: 'zigbee-3.0', year: 2016, status: 'deployed_majority' },
        { id: 'zigbee-pro-2023', year: 2023, status: 'active_evolution' },
        { id: 'zigbee-4.0', year: 2025, status: 'current_generation' }
      ],
      derivatives: [
        { id: 'zigbee-direct', kind: 'extension' },
        {
          id: 'suzi',
          kind: 'sub_ghz_extension',
          bands: { EU: '800 MHz', NA: '900 MHz' },
          replaces24ghz: false
        },
        { id: 'green-power', kind: 'energy_harvesting_profile' },
        { id: 'matter', kind: 'interop_layer' },
        { id: 'thread', kind: 'alternate_802_15_4_ip_mesh' }
      ],
      tuyaZigbeeStack: {
        manufacturerNamePrefixes: [
          { prefix: '_TZ3000_' },
          { prefix: '_TZ3210_' },
          { prefix: '_TZE200_' },
          { prefix: '_TZE204_' },
          { prefix: '_TZE284_' },
          { prefix: '_TZB210_' }
        ],
        mcuUartProtocol: {
          ef00Cluster: '0xEF00',
          versions: [
            { id: 'v3.1' },
            { id: 'v3.2' },
            { id: 'v3.3' },
            { id: 'v3.4' },
            { id: 'v3.5' }
          ]
        }
      },
      homeyAppImplications: [
        'Keep RF coexistence: Wi-Fi 1/6/11 ↔ Zigbee/Thread 15/20/25 @ 20 MHz',
        'Do not invent Suzi / Green Power productIds',
        'Never hardcode a single MCU time format',
        'Zigbee 4.0 / Suzi awareness ≠ new compose clusters without interview'
      ],
      enforcedImplications: {
        rfCoexistence: {
          wifiPrimary: [1, 6, 11],
          zigbeePreferred: [15, 20, 25],
          wifiWidthMhz: 20
        },
        forbiddenInventIdentityPatterns: [
          '(?i)^suzi',
          '(?i)suzi[_-]',
          '(?i)^greenpower',
          '(?i)green[_-]?power'
        ],
        mcuTimeSync: {
          requireGuessFormat: true,
          requireFallbackChainMinLen: 2,
          engineMustCallGuessFormat: true,
          enginePath: 'lib/tuya/GlobalTimeSyncEngine.js',
          formatsPath: 'lib/tuya/TuyaTimeSyncFormats.js'
        },
        composeInterviewGate: {
          forbidAwarenessOnlyClusterTags: ['suzi', 'sub_ghz', 'subghz', 'zigbee_direct_phy'],
          scanDriversCompose: true
        }
      },
      _fallbackReason: e.message
    };
    return _cache;
  }
}

function zigbeeLineageIds() {
  return loadEvolutionSsot().zigbeeLineage.map((e) => e.id);
}

function derivativeIds() {
  return loadEvolutionSsot().derivatives.map((e) => e.id);
}

function tuyaMfrPrefixes() {
  return loadEvolutionSsot().tuyaZigbeeStack.manufacturerNamePrefixes.map((e) => e.prefix);
}

function mcuUartVersions() {
  return loadEvolutionSsot().tuyaZigbeeStack.mcuUartProtocol.versions.map((e) => e.id);
}

function currentZigbeeGeneration() {
  const line = loadEvolutionSsot().zigbeeLineage;
  return line.find((e) => e.status === 'current_generation') || line[line.length - 1];
}

function suziBrief() {
  const d = loadEvolutionSsot().derivatives.find((e) => e.id === 'suzi');
  return d || null;
}

/**
 * Homey-facing frozen summary for troubleshooting / CI.
 */
function zigbeeTuyaEvolutionBrief() {
  const ssot = loadEvolutionSsot();
  const current = currentZigbeeGeneration();
  const suzi = suziBrief();
  return Object.freeze({
    patch: ssot.patch,
    homeyDefaultRadio: ssot.homeyDefaultRadio,
    currentZigbeeId: current.id,
    currentZigbeeYear: current.year,
    suziBandsEu: suzi?.bands?.EU || null,
    suziReplaces24ghz: suzi ? suzi.replaces24ghz === true : null,
    zigbeeLineageIds: Object.freeze(zigbeeLineageIds()),
    derivativeIds: Object.freeze(derivativeIds()),
    tuyaMfrPrefixes: Object.freeze(tuyaMfrPrefixes()),
    mcuUartVersions: Object.freeze(mcuUartVersions()),
    ef00Cluster: ssot.tuyaZigbeeStack.mcuUartProtocol.ef00Cluster,
    implications: Object.freeze([...(ssot.homeyAppImplications || [])]),
    tips: Object.freeze([
      ...ssot.homeyAppImplications,
      'Zigbee 4.0 (2025) + Suzi sub-GHz = extension/awareness; Homey Tuya app stays ZCL+EF00 on 2.4 GHz couples.',
      'Green Power kinetic switches ≠ invent _TZE*_TS0601 couples.',
      'MCU UART v3.3+ needs 10-byte seq time responses — see TuyaTimeSyncFormats.',
    ]),
  });
}

function _asStringList(v) {
  if (v == null) {return [];}
  if (Array.isArray(v)) {return v.map(String);}
  return [String(v)];
}

function _identityHitsForbidden(value, patterns) {
  const s = String(value || '');
  if (!s) {return null;}
  for (const p of patterns) {
    let re;
    try {
      re = new RegExp(p);
    } catch {
      continue;
    }
    if (re.test(s)) {return p;}
  }
  return null;
}

/**
 * Enforce the four Homey implications from the SSOT (CI + agent Contre quoi).
 * Returns { ok, failures[] }.
 */
function assertHomeyImplications(opts = {}) {
  const failures = [];
  const ssot = loadEvolutionSsot();
  const enf = ssot.enforcedImplications || {};
  const scanDrivers = opts.scanDrivers !== false && enf.composeInterviewGate?.scanDriversCompose !== false;

  // 1) RF coexistence
  try {
    const rf = require('./rf-channel-coexistence');
    const wantWifi = enf.rfCoexistence?.wifiPrimary || [1, 6, 11];
    const wantZig = enf.rfCoexistence?.zigbeePreferred || [15, 20, 25];
    const width = enf.rfCoexistence?.wifiWidthMhz || 20;
    for (const w of wantWifi) {
      if (!rf.WIFI_PRIMARY.includes(w)) {
        failures.push(`RF: WIFI_PRIMARY missing ${w}`);
      }
    }
    for (const z of wantZig) {
      if (!rf.PREFERRED_ZIGBEE_CHANNELS.includes(z)) {
        failures.push(`RF: PREFERRED_ZIGBEE_CHANNELS missing ${z}`);
      }
    }
    const rec = rf.recommendZigbeeChannels(wantWifi, width);
    for (const z of wantZig) {
      if (!rec.preferred.includes(z)) {
        failures.push(`RF: recommendZigbeeChannels preferred missing ${z}`);
      }
    }
  } catch (e) {
    failures.push(`RF: load/check failed — ${e.message}`);
  }

  // 2) Do not invent Suzi / Green Power productIds (compose scan)
  const patterns = enf.forbiddenInventIdentityPatterns || [];
  if (scanDrivers && patterns.length) {
    const driversDir = path.join(ROOT, 'drivers');
    let drivers = [];
    try {
      drivers = fs.readdirSync(driversDir);
    } catch (e) {
      failures.push(`invent-scan: drivers unreadable — ${e.message}`);
      drivers = [];
    }
    for (const id of drivers) {
      const composePath = path.join(driversDir, id, 'driver.compose.json');
      if (!fs.existsSync(composePath)) {continue;}
      let compose;
      try {
        compose = JSON.parse(fs.readFileSync(composePath));
      } catch {
        continue;
      }
      const zig = compose.zigbee || {};
      const mfrs = _asStringList(zig.manufacturerName);
      const pids = _asStringList(zig.productId);
      for (const m of mfrs) {
        const hit = _identityHitsForbidden(m, patterns);
        if (hit) {failures.push(`invent: ${id} manufacturerName "${m}" matches ${hit}`);}
      }
      for (const p of pids) {
        const hit = _identityHitsForbidden(p, patterns);
        if (hit) {failures.push(`invent: ${id} productId "${p}" matches ${hit}`);}
      }
      // 4) awareness ≠ invent compose cluster tags
      const forbidTags = enf.composeInterviewGate?.forbidAwarenessOnlyClusterTags || [];
      const blob = JSON.stringify(compose).toLowerCase();
      for (const tag of forbidTags) {
        if (blob.includes(String(tag).toLowerCase())) {
          failures.push(`compose-awareness: ${id} contains forbidden tag "${tag}" without interview lock`);
        }
      }
    }
  }

  // 3) Never hardcode a single MCU time format
  const mcu = enf.mcuTimeSync || {};
  try {
    const formatsPath = path.join(ROOT, mcu.formatsPath || 'lib/tuya/TuyaTimeSyncFormats.js');
    const enginePath = path.join(ROOT, mcu.enginePath || 'lib/tuya/GlobalTimeSyncEngine.js');
    const Formats = require(formatsPath);
    if (mcu.requireGuessFormat !== false) {
      if (typeof Formats.guessFormat !== 'function') {
        failures.push('MCU: TuyaTimeSyncFormats.guessFormat missing');
      } else {
        const guess = Formats.guessFormat({ manufacturerName: '_TZE200_aoclfnxz', productId: 'TS0601' });
        const primary = typeof guess === 'string'
          ? guess
          : (guess && (guess.primary || guess.format || guess.best || guess.recommended));
        if (!primary) {
          failures.push('MCU: guessFormat returned empty primary for sample MCU device');
        }
      }
    }
    if (typeof Formats.getFallbackChain === 'function') {
      const guess = typeof Formats.guessFormat === 'function'
        ? Formats.guessFormat({ manufacturerName: '_TZE200_aoclfnxz', productId: 'TS0601' })
        : null;
      const primaryId = typeof guess === 'string'
        ? guess
        : (guess && (guess.primary || guess.format || guess.best)) || 'tuya_dual_2000';
      const chain = Formats.getFallbackChain(primaryId, {
        manufacturerName: '_TZE200_aoclfnxz',
        productId: 'TS0601',
      }) || [];
      const minLen = Number(mcu.requireFallbackChainMinLen || 2);
      if (!Array.isArray(chain) || chain.length < minLen) {
        failures.push(`MCU: getFallbackChain length ${Array.isArray(chain) ? chain.length : 0} < ${minLen}`);
      }
    } else if (mcu.requireFallbackChainMinLen) {
      failures.push('MCU: getFallbackChain missing');
    }
    if (mcu.engineMustCallGuessFormat !== false && fs.existsSync(enginePath)) {
      const eng = fs.readFileSync(enginePath, 'utf8');
      if (!/guessFormat\s*\(/.test(eng)) {
        failures.push('MCU: GlobalTimeSyncEngine must call guessFormat(');
      }
      if (!/getFallbackChain/.test(eng)) {
        failures.push('MCU: GlobalTimeSyncEngine must use getFallbackChain');
      }
    }
  } catch (e) {
    failures.push(`MCU: check failed — ${e.message}`);
  }

  return { ok: failures.length === 0, failures };
}

/**
 * Soft diagnostics payload (Homey DiagnosticAPI + CI). Never throws.
 */
function getDiagnosticsRfBrief() {
  try {
    const rf = require('./rf-channel-coexistence');
    const brief = zigbeeTuyaEvolutionBrief();
    const ssot = loadEvolutionSsot();
    const rec = rf.recommendZigbeeChannels([1, 6, 11], 20);
    const flood = (ssot.operationalRisks || []).find((r) => r.id === 'tuya-tx-mesh-flood');
    const tips = rf.formatCoexistenceTips().slice(0, 6);
    if (flood?.homeyImpact) {
      tips.push(`Mesh TX: ${flood.homeyImpact}`);
    }
    return {
      wifiPrimary: [1, 6, 11],
      preferredZigbee: rec.preferred.slice(),
      wifiWidthMhz: 20,
      currentZigbeeGeneration: brief.currentZigbeeId,
      suziReplaces24ghz: brief.suziReplaces24ghz,
      suziNote: brief.suziReplaces24ghz === false
        ? 'Suzi/sub-GHz is an extension — Homey 2.4 GHz channel plan still applies.'
        : '',
      meshFloodNote: flood?.mitigations?.slice(0, 3) || [],
      implications: brief.implications.slice(),
      tips
    };
  } catch (_) {
    return {
      wifiPrimary: [1, 6, 11],
      preferredZigbee: [15, 20, 25],
      wifiWidthMhz: 20,
      currentZigbeeGeneration: 'zigbee-4.0',
      suziReplaces24ghz: false,
      suziNote: 'Suzi/sub-GHz is an extension — Homey 2.4 GHz channel plan still applies.',
      meshFloodNote: [],
      implications: [],
      tips: []
    };
  }
}

module.exports = {
  SSOT_PATH,
  loadEvolutionSsot,
  zigbeeLineageIds,
  derivativeIds,
  tuyaMfrPrefixes,
  mcuUartVersions,
  currentZigbeeGeneration,
  suziBrief,
  zigbeeTuyaEvolutionBrief,
  assertHomeyImplications,
  getDiagnosticsRfBrief,
};
