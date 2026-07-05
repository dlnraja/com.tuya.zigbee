'use strict';

const PRIVATE_E000 = 0xE000;
const PRIVATE_E001 = 0xE001;
const TUYA_EF00 = 0xEF00;
const GREEN_POWER_ENDPOINT = 242;
const GREEN_POWER_PROFILE = 0xA1E0;

const CLUSTER_NAME_IDS = {
  basic: 0x0000,
  powerconfiguration: 0x0001,
  genpowercfg: 0x0001,
  onoff: 0x0006,
  genonoff: 0x0006,
  levelcontrol: 0x0008,
  genlevelctrl: 0x0008,
  colorcontrol: 0x0300,
  manuspecifictuya_3: TUYA_EF00,
  manuspecifictuya: TUYA_EF00,
  tuya: TUYA_EF00,
  tuyaspecific: TUYA_EF00,
};

const TS004F_4_BUTTON_MANUFACTURERS = [
  '_TZ3000_u3nv1jwk',
  '_TZ3000_kfu8zapd',
  '_TZ3000_xabckq1v',
  '_TZ3000_czuyt8lz',
  '_TZ3000_b3mgfu0d',
  '_TZ3000_rco1yzb1',
  '_TZ3000_abrsvsou',
  '_TZ3000_4fjiwweb',
];

const TS004F_ROTARY_MANUFACTURERS = [
  '_TZ3000_402vrq2i',
  '_TZ3000_qja6nq5z',
  '_TZ3000_gwkzibhs',
  '_TZ3000_ugi8ky6u',
];

const TS004F_ONE_BUTTON_MANUFACTURERS = [
  '_TZ3000_kaflzta4',
  '_TZ3000_ja5osu5g',
  '_TZ3000_an5rjiwd',
];

const KNOWN_QUIRKS = [
  {
    id: 'moes_ts0014_4gang_actuator_false_battery',
    manufacturers: ['_TZ3000_mrduubod'],
    modelIds: ['TS0014'],
    preferredDrivers: ['wall_switch_4gang_1way', 'switch_4gang'],
    penalizedDrivers: ['button_wireless_4', 'button_wireless_3', 'button_wireless_2', 'button_wireless_1', 'smart_knob', 'smart_knob_rotary', 'climate_sensor', 'device_generic_tuya_universal'],
    boost: 76,
    candidateBoost: 30,
    penalty: 48,
    capabilities: ['onoff', 'button.1', 'button.2', 'button.3', 'button.4'],
    deviceTypes: ['switch', 'actuator', 'wall_switch'],
    powerSourceOverride: 'mains',
    evidence: ['exact_moes_ts0014', 'four_onoff_endpoints', 'private_e000_e001', 'ignore_basic_power_source_battery'],
    sourceRefs: ['homey_forum_2099', 'johan_1413', 'z2m_15339', 'z2m_ts0014'],
  },
  {
    id: 'ts004f_known_4button_scene_remote',
    manufacturers: TS004F_4_BUTTON_MANUFACTURERS,
    modelIds: ['TS004F', 'TS0044'],
    preferredDrivers: ['button_wireless_4'],
    penalizedDrivers: ['smart_knob_rotary', 'switch_4gang', 'wall_switch_4gang_1way', 'climate_sensor', 'device_generic_tuya_universal'],
    boost: 68,
    candidateBoost: 26,
    penalty: 42,
    capabilities: ['measure_battery', 'button.1', 'button.2', 'button.3', 'button.4'],
    deviceTypes: ['button', 'scene_remote'],
    evidence: ['known_ts004f_4button_manufacturer', 'operation_mode_command_event', 'zcl_e000_levelcontrol_paths'],
    sourceRefs: ['z2m_ts004f', 'johan_270', 'z2m_27119'],
  },
  {
    id: 'ts004f_known_rotary_knob',
    manufacturers: TS004F_ROTARY_MANUFACTURERS,
    modelIds: ['TS004F'],
    preferredDrivers: ['smart_knob_rotary', 'smart_knob'],
    penalizedDrivers: ['button_wireless_4', 'switch_4gang', 'wall_switch_4gang_1way', 'climate_sensor', 'device_generic_tuya_universal'],
    boost: 74,
    candidateBoost: 30,
    penalty: 48,
    capabilities: ['measure_battery', 'button.1', 'dim'],
    deviceTypes: ['rotary', 'button', 'scene_remote'],
    evidence: ['known_ts004f_rotary_manufacturer', 'single_endpoint_rotary_signature', 'levelcontrol_rotation_actions'],
    sourceRefs: ['zha_3604', 'zha_4301', 'z2m_27239'],
  },
  {
    id: 'ts004f_known_one_button_variant',
    manufacturers: TS004F_ONE_BUTTON_MANUFACTURERS,
    modelIds: ['TS004F'],
    preferredDrivers: ['button_wireless_1', 'smart_knob'],
    penalizedDrivers: ['button_wireless_4', 'switch_4gang', 'wall_switch_4gang_1way', 'climate_sensor'],
    boost: 62,
    candidateBoost: 24,
    penalty: 40,
    capabilities: ['measure_battery', 'button.1'],
    deviceTypes: ['button', 'scene_remote'],
    evidence: ['known_ts004f_not_4gang', 'single_button_variant'],
    sourceRefs: ['local_variation_audit', 'z2m_8951'],
  },
];

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function unique(values) {
  return [...new Set(values.filter(value => value !== undefined && value !== null && value !== ''))];
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^0x/i.test(trimmed)) return parseInt(trimmed, 16);
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function clusterIdFromValue(value) {
  const direct = parseNumber(value);
  if (direct !== null) return direct;
  const named = CLUSTER_NAME_IDS[normalizeText(value)];
  if (named !== undefined) return named;
  if (value && typeof value === 'object') {
    return parseNumber(value.ID ?? value.id ?? value.clusterId ?? value.cluster);
  }
  return null;
}

function collectClusters(endpoint, keys) {
  const clusters = new Set();
  for (const key of keys) {
    const raw = endpoint?.[key];
    if (!raw) continue;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const id = clusterIdFromValue(item);
        if (id !== null) clusters.add(id);
      }
      continue;
    }
    if (typeof raw === 'object') {
      for (const [clusterKey, clusterValue] of Object.entries(raw)) {
        const id = clusterIdFromValue(clusterKey) ?? clusterIdFromValue(clusterValue);
        if (id !== null) clusters.add(id);
      }
    }
  }
  return [...clusters].sort((a, b) => a - b);
}

function endpointIdFromEntry(entryId, endpoint) {
  return parseNumber(endpoint?.endpointId ?? endpoint?.epId ?? endpoint?.id ?? entryId);
}

function normalizeEndpointEntries(endpoints = {}) {
  if (!endpoints) return [];
  if (Array.isArray(endpoints)) {
    return endpoints.map((endpoint, index) => [endpointIdFromEntry(index + 1, endpoint), endpoint]);
  }
  if (Array.isArray(endpoints.endpointDescriptors)) {
    return endpoints.endpointDescriptors.map((endpoint, index) => [endpointIdFromEntry(index + 1, endpoint), endpoint]);
  }
  if (endpoints.endpoints && endpoints.endpoints !== endpoints) {
    return normalizeEndpointEntries(endpoints.endpoints);
  }
  if (endpoints.extendedEndpointDescriptors && typeof endpoints.extendedEndpointDescriptors === 'object') {
    return Object.entries(endpoints.extendedEndpointDescriptors).map(([endpointId, endpoint]) => [endpointIdFromEntry(endpointId, endpoint), endpoint]);
  }
  return Object.entries(endpoints).map(([endpointId, endpoint]) => [endpointIdFromEntry(endpointId, endpoint), endpoint]);
}

function normalizeEndpointSummary(endpoints = {}) {
  const records = [];
  for (const [entryId, endpoint] of normalizeEndpointEntries(endpoints)) {
    if (!endpoint || typeof endpoint !== 'object') continue;
    const endpointId = endpointIdFromEntry(entryId, endpoint);
    if (endpointId === null) continue;
    const profileId = parseNumber(endpoint.applicationProfileId ?? endpoint.profileId ?? endpoint.profId);
    const deviceId = parseNumber(endpoint.applicationDeviceId ?? endpoint.deviceType ?? endpoint.devId);
    const inputClusters = collectClusters(endpoint, ['clusters', 'inputClusters', 'serverClusters', 'inClusterList', 'inputClusterList']);
    const outputClusters = collectClusters(endpoint, ['outputClusters', 'clientClusters', 'outClusterList', 'outputClusterList']);
    const allClusters = unique([...inputClusters, ...outputClusters]).sort((a, b) => a - b);
    const greenPower = Number(endpointId) === GREEN_POWER_ENDPOINT || profileId === GREEN_POWER_PROFILE;
    records.push({ endpointId, profileId, deviceId, inputClusters, outputClusters, allClusters, greenPower });
  }
  return records;
}

function hasCluster(record, clusterId, direction = 'all') {
  if (direction === 'input') return record.inputClusters.includes(clusterId);
  if (direction === 'output') return record.outputClusters.includes(clusterId);
  return record.allClusters.includes(clusterId);
}

function countWhere(records, predicate) {
  return records.filter(record => !record.greenPower && predicate(record)).length;
}

function collectPowerSourceHints(value, hints = [], depth = 0) {
  if (!value || depth > 6) return hints;
  if (Array.isArray(value)) {
    for (const item of value) collectPowerSourceHints(item, hints, depth + 1);
    return hints;
  }
  if (typeof value !== 'object') return hints;

  const namedPowerSource = normalizeText(value.name) === 'powersource' || normalizeText(value.name) === 'power_source';
  if (namedPowerSource && value.value !== undefined) {
    hints.push(String(value.value));
  }
  for (const [key, nested] of Object.entries(value)) {
    if (normalizeText(key) === 'powersource' || normalizeText(key) === 'power_source') {
      hints.push(String(nested));
      continue;
    }
    collectPowerSourceHints(nested, hints, depth + 1);
  }
  return hints;
}

function addQuirk(quirks, quirk, extra = {}) {
  quirks.push({
    ...quirk,
    ...extra,
    evidence: unique([...(quirk.evidence || []), ...(extra.evidence || [])]),
    sourceRefs: unique([...(quirk.sourceRefs || []), ...(extra.sourceRefs || [])]),
  });
}

function matchesFingerprint(quirk, manufacturerName, modelId) {
  const mfr = normalizeText(manufacturerName);
  const model = normalizeText(modelId);
  const manufacturerMatches = !quirk.manufacturers?.length ||
    quirk.manufacturers.some(value => normalizeText(value) === mfr);
  const modelMatches = !quirk.modelIds?.length ||
    quirk.modelIds.some(value => normalizeText(value) === model);
  return manufacturerMatches && modelMatches;
}

function hasDriverMatch(driverId, matchers = []) {
  const driver = normalizeText(driverId);
  return asArray(matchers).some(matcher => {
    const normalized = normalizeText(matcher);
    if (!normalized) return false;
    if (normalized.endsWith('*')) return driver.startsWith(normalized.slice(0, -1));
    return driver === normalized;
  });
}

class ManufacturerDeviceQuirkRegistry {
  static analyze(context = {}) {
    const data = context.data || context;
    const manufacturerName = data.manufacturerName || data.manufacturer || data.mfr || '';
    const modelId = data.modelId || data.productId || data.model || '';
    const model = normalizeText(modelId);
    const endpoints = normalizeEndpointSummary(data.endpoints || data.zclNode?.endpoints || {});
    const functional = endpoints.filter(record => !record.greenPower);
    const powerSourceHints = unique(collectPowerSourceHints(data).map(normalizeText));
    const dpIds = unique(asArray(context.dpIds).map(Number).filter(Number.isFinite));

    const stats = {
      functionalEndpointCount: functional.length,
      inputOnOffEndpointCount: countWhere(endpoints, record => hasCluster(record, 0x0006, 'input')),
      outputOnOffEndpointCount: countWhere(endpoints, record => hasCluster(record, 0x0006, 'output')),
      inputPowerCfgEndpointCount: countWhere(endpoints, record => hasCluster(record, 0x0001, 'input')),
      privateE000EndpointCount: countWhere(endpoints, record => hasCluster(record, PRIVATE_E000, 'input')),
      privateE001EndpointCount: countWhere(endpoints, record => hasCluster(record, PRIVATE_E001, 'input')),
      outputLevelEndpointCount: countWhere(endpoints, record => hasCluster(record, 0x0008, 'output')),
      outputColorEndpointCount: countWhere(endpoints, record => hasCluster(record, 0x0300, 'output')),
      tuyaEndpointCount: countWhere(endpoints, record => hasCluster(record, TUYA_EF00)),
      powerSourceHints,
      hasFalseBatteryHint: powerSourceHints.includes('battery') && countWhere(endpoints, record => hasCluster(record, 0x0006, 'input')) >= 2,
      dpCount: dpIds.length,
    };

    const quirks = [];
    for (const quirk of KNOWN_QUIRKS) {
      if (matchesFingerprint(quirk, manufacturerName, modelId)) {
        addQuirk(quirks, quirk);
      }
    }

    if (/^ts00[01][1-4]$/.test(model) && stats.inputOnOffEndpointCount >= 2) {
      const gangCount = Math.min(4, Math.max(1, stats.inputOnOffEndpointCount));
      const hasPrivateSwitchClusters = Boolean(stats.privateE000EndpointCount || stats.privateE001EndpointCount);
      const preferredDrivers = gangCount === 4
        ? [hasPrivateSwitchClusters ? 'wall_switch_4gang_1way' : 'switch_4gang']
        : [`switch_${gangCount}gang`, `wall_switch_${gangCount}gang_1way`];
      addQuirk(quirks, {
        id: `ts00xx_${gangCount}gang_actuator_signature`,
        preferredDrivers,
        penalizedDrivers: ['button_wireless_4', 'button_wireless_3', 'button_wireless_2', 'button_wireless_1', 'smart_knob', 'smart_knob_rotary', 'climate_sensor', 'device_generic_tuya_universal'],
        boost: 58 + gangCount * 4,
        candidateBoost: 20 + gangCount * 2,
        penalty: 36,
        capabilities: ['onoff', ...Array.from({ length: gangCount }, (_, index) => `button.${index + 1}`)],
        deviceTypes: ['switch', 'actuator', 'wall_switch'],
        powerSourceOverride: 'mains',
        evidence: unique([
          `model_family:${modelId}`,
          `onoff_endpoints:${stats.inputOnOffEndpointCount}`,
          stats.privateE000EndpointCount ? 'private_e000_present' : null,
          stats.privateE001EndpointCount ? 'private_e001_present' : null,
          stats.hasFalseBatteryHint ? 'ignore_basic_power_source_battery' : null,
        ]),
        sourceRefs: ['z2m_ts0014', 'z2m_15339', 'homey_forum_2099'],
      });
    }

    if (model === 'ts004f' && stats.functionalEndpointCount >= 4 && stats.inputOnOffEndpointCount >= 3) {
      addQuirk(quirks, {
        id: 'ts004f_four_endpoint_scene_remote_signature',
        preferredDrivers: ['button_wireless_4'],
        penalizedDrivers: ['smart_knob_rotary', 'switch_4gang', 'wall_switch_4gang_1way', 'climate_sensor', 'device_generic_tuya_universal'],
        boost: 66,
        candidateBoost: 24,
        penalty: 40,
        capabilities: ['measure_battery', 'button.1', 'button.2', 'button.3', 'button.4'],
        deviceTypes: ['button', 'scene_remote'],
        evidence: unique([
          'model_family:TS004F',
          `functional_endpoints:${stats.functionalEndpointCount}`,
          `onoff_endpoints:${stats.inputOnOffEndpointCount}`,
          stats.inputPowerCfgEndpointCount ? 'battery_power_cfg_present' : null,
          stats.privateE000EndpointCount ? 'private_e000_present' : null,
          stats.outputLevelEndpointCount ? 'levelcontrol_actions_present' : null,
        ]),
        sourceRefs: ['z2m_ts004f', 'johan_270', 'z2m_27119'],
      });
    }

    if (model === 'ts004f' && stats.functionalEndpointCount <= 1 &&
        (stats.outputLevelEndpointCount || stats.outputColorEndpointCount || stats.outputOnOffEndpointCount)) {
      addQuirk(quirks, {
        id: 'ts004f_single_endpoint_rotary_or_smart_button_signature',
        preferredDrivers: stats.outputLevelEndpointCount || stats.outputColorEndpointCount
          ? ['smart_knob_rotary']
          : ['smart_knob', 'button_wireless_1'],
        penalizedDrivers: ['button_wireless_4', 'switch_4gang', 'wall_switch_4gang_1way', 'climate_sensor', 'device_generic_tuya_universal'],
        boost: stats.outputLevelEndpointCount || stats.outputColorEndpointCount ? 70 : 56,
        candidateBoost: 26,
        penalty: 42,
        capabilities: unique(['measure_battery', 'button.1', stats.outputLevelEndpointCount ? 'dim' : null]),
        deviceTypes: ['rotary', 'button', 'scene_remote'],
        evidence: unique([
          'model_family:TS004F',
          `functional_endpoints:${stats.functionalEndpointCount}`,
          stats.outputLevelEndpointCount ? 'levelcontrol_output_rotation' : null,
          stats.outputColorEndpointCount ? 'colorcontrol_output_rotation' : null,
          stats.outputOnOffEndpointCount ? 'onoff_output_actions' : null,
        ]),
        sourceRefs: ['zha_3604', 'zha_4301', 'z2m_27239'],
      });
    }

    if (stats.tuyaEndpointCount && (dpIds.length >= 4 || context.dpReportSummary?.dpIds?.length >= 4)) {
      addQuirk(quirks, {
        id: 'ef00_full_state_map_or_flood_signature',
        preferredDrivers: [],
        penalizedDrivers: [],
        boost: 0,
        candidateBoost: 0,
        penalty: 0,
        capabilities: ['tuya_dp'],
        deviceTypes: ['tuya_dp'],
        evidence: [`tuya_dp_count:${Math.max(dpIds.length, context.dpReportSummary?.dpIds?.length || 0)}`, 'dedupe_exact_payload_only'],
        sourceRefs: ['raw_advertisement_state_tests'],
      });
    }

    const deduped = [];
    const seen = new Set();
    for (const quirk of quirks) {
      if (seen.has(quirk.id)) continue;
      seen.add(quirk.id);
      deduped.push(quirk);
    }

    return {
      fingerprintKey: `${manufacturerName || '*'}|${modelId || '*'}`,
      quirks: deduped,
      stats,
      endpointSummary: endpoints,
      preferredDrivers: unique(deduped.flatMap(quirk => quirk.preferredDrivers || [])),
      penalizedDrivers: unique(deduped.flatMap(quirk => quirk.penalizedDrivers || [])),
      evidenceBadges: unique(deduped.flatMap(quirk => quirk.evidence || [])),
      powerSourceOverride: deduped.find(quirk => quirk.powerSourceOverride)?.powerSourceOverride || null,
    };
  }

  static driverEffect(analysis, driverId) {
    let boost = 0;
    let penalty = 0;
    const evidence = [];
    const contradictions = [];

    for (const quirk of analysis?.quirks || []) {
      if (hasDriverMatch(driverId, quirk.preferredDrivers)) {
        const amount = Number.isFinite(quirk.candidateBoost) ? quirk.candidateBoost : Math.round((quirk.boost || 0) * 0.35);
        boost += amount;
        evidence.push(`manufacturer_quirk_preferred:${quirk.id}`);
      }
      if (hasDriverMatch(driverId, quirk.penalizedDrivers)) {
        const amount = Number.isFinite(quirk.penalty) ? quirk.penalty : 30;
        penalty += amount;
        contradictions.push(`manufacturer_quirk_penalty:${quirk.id}`);
      }
    }

    return { boost, penalty, evidence: unique(evidence), contradictions: unique(contradictions) };
  }
}

module.exports = ManufacturerDeviceQuirkRegistry;
