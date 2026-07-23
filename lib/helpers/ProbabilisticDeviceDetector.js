'use strict';

const fs = require('fs');
const path = require('path');
const ManufacturerDeviceQuirkRegistry = require('./ManufacturerDeviceQuirkRegistry');
const TU = require('../utils/TuyaNormalizer'); // v10.0.0 ULTIMATE case-insensitive

const ROOT = path.join(__dirname, '..', '..');
const DP_DATABASE_PATH = path.join(ROOT, 'data', 'dp_database.json');
const DRIVER_MAPPING_PATH = path.join(ROOT, 'driver-mapping-database.json');
const MFS_DATABASE_PATH = path.join(ROOT, 'data', 'mfs_db.json');
const COMMUNITY_ENRICHED_PATH = path.join(ROOT, 'data', 'community-sync', 'all-enriched.json');

const CLUSTER_IDS = {
  basic: 0x0000,
  powerConfiguration: 0x0001,
  genPowerCfg: 0x0001,
  onOff: 0x0006,
  genOnOff: 0x0006,
  levelControl: 0x0008,
  genLevelCtrl: 0x0008,
  doorLock: 0x0101,
  windowCovering: 0x0102,
  thermostat: 0x0201,
  fanControl: 0x0202,
  colorControl: 0x0300,
  msIlluminanceMeasurement: 0x0400,
  illuminanceMeasurement: 0x0400,
  msTemperatureMeasurement: 0x0402,
  temperatureMeasurement: 0x0402,
  msRelativeHumidity: 0x0405,
  relativeHumidity: 0x0405,
  msOccupancySensing: 0x0406,
  occupancySensing: 0x0406,
  ssIasZone: 0x0500,
  iasZone: 0x0500,
  ssIasWd: 0x0502,
  iasWd: 0x0502,
  seMetering: 0x0702,
  metering: 0x0702,
  haElectricalMeasurement: 0x0B04,
  electricalMeasurement: 0x0B04,
  tuya: 0xEF00,
  tuyaSpecific: 0xEF00,
  manuSpecificTuya: 0xEF00,
};

const CLUSTER_CAPABILITY_RULES = [
  { ids: [0x0001], capability: 'measure_battery', deviceTypes: ['button', 'sensor'] },
  { ids: [0x0006], capability: 'onoff', deviceTypes: ['switch', 'plug', 'light'] },
  { ids: [0x0008], capability: 'dim', deviceTypes: ['dimmer', 'light'] },
  { ids: [0x0101], capability: 'locked', deviceTypes: ['lock'] },
  { ids: [0x0102], capability: 'windowcoverings_set', deviceTypes: ['cover', 'curtain'] },
  { ids: [0x0201], capability: 'target_temperature', deviceTypes: ['thermostat', 'radiator_valve'] },
  { ids: [0x0202], capability: 'fan_speed', deviceTypes: ['fan'] },
  { ids: [0x0300], capability: 'light_hue', extraCapabilities: ['light_saturation'], deviceTypes: ['light'] },
  { ids: [0x0400], capability: 'measure_luminance', deviceTypes: ['illuminance', 'presence', 'motion'] },
  { ids: [0x0402], capability: 'measure_temperature', deviceTypes: ['climate', 'thermostat', 'soil'] },
  { ids: [0x0405], capability: 'measure_humidity', deviceTypes: ['climate', 'soil'] },
  { ids: [0x0406], capability: 'alarm_motion', deviceTypes: ['motion', 'presence'] },
  { ids: [0x0500], capability: 'alarm_contact', deviceTypes: ['contact', 'water', 'motion'] },
  { ids: [0x0502], capability: 'alarm_generic', deviceTypes: ['siren'] },
  { ids: [0x0702], capability: 'meter_power', extraCapabilities: ['measure_power'], deviceTypes: ['plug', 'meter'] },
  { ids: [0x0B04], capability: 'measure_power', extraCapabilities: ['measure_voltage', 'measure_current'], deviceTypes: ['plug', 'meter'] },
  { ids: [0xEF00], capability: 'tuya_dp', deviceTypes: ['tuya_dp'] },
];

const DEVICE_TYPE_TO_DRIVER = {
  air_quality: 'air_quality_comprehensive',
  button: 'button_wireless_1',
  climate: 'climate_sensor',
  contact: 'contact_sensor',
  cover: 'curtain_motor',
  curtain: 'curtain_motor',
  dimmer: 'dimmer_wall_1gang',
  fan: 'fan_controller',
  gas: 'gas_detector',
  illuminance: 'light_sensor_outdoor',
  light: 'bulb_rgbw',
  lock: 'lock_smart',
  meter: 'power_meter',
  motion: 'motion_sensor',
  plug: 'plug_energy_monitor',
  presence: 'presence_sensor_radar',
  radiator_valve: 'radiator_valve',
  sensor: 'climate_sensor',
  siren: 'siren',
  smoke: 'smoke_detector_advanced',
  soil: 'soil_sensor',
  switch: 'switch_1gang',
  thermostat: 'radiator_valve',
  tuya_dp: 'device_generic_tuya_universal',
  valve: 'valve_irrigation',
  water: 'water_leak_sensor',
};

const PROFILE_TO_DRIVER = {
  button_wireless: 'button_wireless_1',
  button_wireless_1: 'button_wireless_1',
  button_wireless_2: 'button_wireless_2',
  button_wireless_3: 'button_wireless_3',
  button_wireless_4: 'button_wireless_4',
  button_wireless_5: 'switch_wall_5gang',
  button_wireless_6: 'button_wireless_6',
  climate_sensor: 'climate_sensor',
  contact_sensor: 'contact_sensor',
  generic_tuya: 'device_generic_tuya_universal',
  power_plug: 'plug_energy_monitor',
  presence_sensor_radar: 'presence_sensor_radar',
  sensor_climate_presence: 'sensor_climate_presence',
  sensor_illuminance_presence: 'sensor_illuminance_presence',
  switch: 'switch_1gang',
};

const GENERIC_DRIVER_PENALTY = new Set([
  'device_generic_tuya_universal',
  'generic_tuya',
  'universal_fallback',
  'universal_zigbee',
  'zigbee_universal',
]);

let _jsonCache = new Map();
let _compoundDb = undefined;
let _runtimeFingerprintDb = undefined;
let _tuyaProfiles = undefined;
let _enrichedDpMappings = undefined;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function normalizeText(value) {
  // v10.0.0: Use TuyaNormalizer (NFKD + accents) for case-insensitive text comparison
  return TU.normalize(value);
}

function normalizeDriverId(value) {
  return String(value || '').trim();
}

function safeRequire(request) {
  try {
    return require(request);
  } catch (_err) {
    return null;
  }
}

function readJson(filePath, fallback) {
  if (_jsonCache.has(filePath)) return _jsonCache.get(filePath);
  try {
    if (!fs.existsSync(filePath)) {
      _jsonCache.set(filePath, fallback);
      return fallback;
    }
    const data = JSON.parse(fs.readFileSync(filePath));
    _jsonCache.set(filePath, data);
    return data;
  } catch (_err) {
    _jsonCache.set(filePath, fallback);
    return fallback;
  }
}

function getCompoundDb() {
  if (_compoundDb !== undefined) return _compoundDb;
  _compoundDb = safeRequire('../DeviceFingerprintDB') || null;
  return _compoundDb;
}

function getRuntimeFingerprintDb() {
  if (_runtimeFingerprintDb !== undefined) return _runtimeFingerprintDb;
  _runtimeFingerprintDb = safeRequire('../tuya/DeviceFingerprintDB') || null;
  return _runtimeFingerprintDb;
}

function getTuyaProfiles() {
  if (_tuyaProfiles !== undefined) return _tuyaProfiles;
  _tuyaProfiles = safeRequire('../tuya/TuyaProfiles') || null;
  return _tuyaProfiles;
}

function getEnrichedDpMappings() {
  if (_enrichedDpMappings !== undefined) return _enrichedDpMappings;
  _enrichedDpMappings = safeRequire('../tuya/EnrichedDPMappings') || null;
  return _enrichedDpMappings;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function unique(values) {
  return [...new Set(values.filter(value => value !== undefined && value !== null && value !== ''))];
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

function clusterIdFromKey(key, cluster) {
  const direct = parseNumber(key);
  if (direct !== null) return direct;
  if (CLUSTER_IDS[key] !== undefined) return CLUSTER_IDS[key];
  if (CLUSTER_IDS[String(key).replace(/^gen/, '')] !== undefined) return CLUSTER_IDS[String(key).replace(/^gen/, '')];
  const fromCluster = cluster?.ID ?? cluster?.id ?? cluster?.clusterId;
  const parsed = parseNumber(fromCluster);
  return parsed !== null ? parsed : null;
}

function normalizeDiscoveryData(data = {}) {
  const settings = data.settings || data.getSettings?.() || {};
  const store = data.store || data.getStore?.() || {};
  const modelId = data.modelId || data.productId || data.model || data.product ||
    settings.zb_model_id || settings.zb_modelId || store.modelId || data.node?.modelId || '';
  const manufacturerName = data.manufacturerName || data.manufacturer || data.mfr ||
    settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || '';

  return {
    ...data,
    modelId,
    productId: data.productId || modelId,
    manufacturerName,
    endpoints: data.endpoints || data.zclNode?.endpoints || {},
    capabilities: unique([
      ...asArray(data.capabilities),
      ...asArray(data.detectedCapabilities),
      ...asArray(data.clusterAnalysis?.features),
    ]),
    dpAutoDiscoveryReport: data.dpAutoDiscoveryReport || data.autoDiscoveryReport || data.dpReport ||
      data.getStoreValue?.('dp_auto_discovery_report') || null,
    observedDps: data.observedDps || data.dps || data.dpMappings || data.dpMap || {},
  };
}

function extractClusterSummary(endpoints = {}) {
  const clusters = new Set();
  const names = new Set();
  const endpointIds = [];

  const entries = (() => {
    if (Array.isArray(endpoints)) {
      return endpoints.map((endpoint, index) => [String(endpoint.endpointId || endpoint.epId || endpoint.id || index + 1), endpoint]);
    }
    if (Array.isArray(endpoints?.endpointDescriptors)) {
      return endpoints.endpointDescriptors.map((endpoint, index) => [String(endpoint.endpointId || endpoint.epId || endpoint.id || index + 1), endpoint]);
    }
    if (endpoints?.endpoints && endpoints.endpoints !== endpoints) {
      return Object.entries(endpoints.endpoints || {});
    }
    if (endpoints?.extendedEndpointDescriptors && typeof endpoints.extendedEndpointDescriptors === 'object') {
      return Object.entries(endpoints.extendedEndpointDescriptors);
    }
    return Object.entries(endpoints || {});
  })();

  for (const [endpointId, endpoint] of entries) {
    const normalizedEndpointId = Number(endpoint?.endpointId || endpoint?.epId || endpoint?.id || endpointId) || endpointId;
    const profileId = parseNumber(endpoint?.applicationProfileId ?? endpoint?.profileId ?? endpoint?.profId);
    if (Number(normalizedEndpointId) === 242 || profileId === 0xA1E0) continue;
    endpointIds.push(normalizedEndpointId);

    const rawClusterSets = [
      endpoint?.clusters,
      endpoint?.inputClusters,
      endpoint?.serverClusters,
      endpoint?.inClusterList,
      endpoint?.inputClusterList,
    ];
    for (const rawClusters of rawClusterSets) {
      if (!rawClusters) continue;
      if (Array.isArray(rawClusters)) {
        for (const cluster of rawClusters) {
          const id = clusterIdFromKey(cluster, null);
          if (id !== null) clusters.add(id);
          if (typeof cluster === 'string') names.add(cluster);
        }
      } else if (rawClusters && typeof rawClusters === 'object') {
        for (const [key, cluster] of Object.entries(rawClusters)) {
          const id = clusterIdFromKey(key, cluster);
          if (id !== null) clusters.add(id);
          names.add(String(key));
        }
      }
    }
  }

  const capabilities = new Set();
  const deviceTypes = new Set();
  for (const rule of CLUSTER_CAPABILITY_RULES) {
    if (!rule.ids.some(id => clusters.has(id))) continue;
    capabilities.add(rule.capability);
    for (const extra of rule.extraCapabilities || []) capabilities.add(extra);
    for (const type of rule.deviceTypes || []) deviceTypes.add(type);
  }

  return {
    clusters: [...clusters].sort((a, b) => a - b),
    clusterNames: [...names].sort(),
    endpointIds: unique(endpointIds),
    endpointCount: unique(endpointIds).length,
    capabilities: [...capabilities].sort(),
    deviceTypes: [...deviceTypes].sort(),
    hasTuya: clusters.has(0xEF00),
    hasEnergy: clusters.has(0x0702) || clusters.has(0x0B04),
    hasBattery: clusters.has(0x0001),
  };
}

function extractDpIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return unique(value.map(entry => Number(entry?.dpId ?? entry?.dp ?? entry)).filter(Number.isFinite));
  }
  if (value instanceof Map) {
    return unique([...value.keys()].map(Number).filter(Number.isFinite));
  }
  if (typeof value === 'object') {
    return unique(Object.keys(value).map(Number).filter(Number.isFinite));
  }
  return [];
}

function extractCapabilitiesFromDpReport(report) {
  const capabilities = [];
  const types = [];
  const dpIds = [];
  const recommendation = report?.profileRecommendation || null;

  for (const cap of asArray(recommendation?.observedCapabilities)) capabilities.push(cap);
  for (const type of asArray(recommendation?.observedTypes)) types.push(type);

  const dynamicMap = report?.dynamicDPMap || {};
  for (const [dp, mapping] of Object.entries(dynamicMap)) {
    dpIds.push(Number(dp));
    if (mapping?.capability) capabilities.push(mapping.capability);
    if (mapping?.type) types.push(mapping.type);
  }

  const dps = report?.dps || {};
  for (const [dp, info] of Object.entries(dps)) {
    dpIds.push(Number(dp));
    if (info?.capability) capabilities.push(info.capability);
    if (info?.type) types.push(info.type);
  }

  return {
    capabilities: unique(capabilities),
    types: unique(types),
    dpIds: unique(dpIds.filter(Number.isFinite)),
    recommendation,
  };
}

function driverFromProfile(profileId) {
  if (!profileId) return null;
  if (PROFILE_TO_DRIVER[profileId]) return PROFILE_TO_DRIVER[profileId];
  const match = /^button_wireless_(\d+)$/.exec(profileId);
  if (match) return Number(match[1]) <= 4 ? `button_wireless_${match[1]}` : `switch_wall_${match[1]}gang`;
  return DEVICE_TYPE_TO_DRIVER[profileId] || null;
}

function driverFromDeviceType(type, context = {}) {
  if (!type) return null;
  const normalized = normalizeText(type).replace(/-/g, '_');
  if (normalized === 'switch' && context.gangCount > 1) {
    return context.gangCount <= 4 ? `switch_${context.gangCount}gang` : `switch_wall_${context.gangCount}gang`;
  }
  if (normalized === 'button' && context.gangCount > 1) {
    return context.gangCount <= 4 ? `button_wireless_${context.gangCount}` : `switch_wall_${context.gangCount}gang`;
  }
  return DEVICE_TYPE_TO_DRIVER[normalized] || null;
}

class ProbabilisticDeviceDetector {
  constructor(data = {}, options = {}) {
    this.data = normalizeDiscoveryData(data);
    this.options = options;
    this.clusterSummary = extractClusterSummary(this.data.endpoints);
    this.dpReportSummary = extractCapabilitiesFromDpReport(this.data.dpAutoDiscoveryReport);
    this.dpIds = unique([
      ...extractDpIds(this.data.observedDps),
      ...this.dpReportSummary.dpIds,
    ]);
    this.observedCapabilities = unique([
      ...this.data.capabilities,
      ...this.clusterSummary.capabilities,
      ...this.dpReportSummary.capabilities,
    ]);
    this.observedDeviceTypes = unique([
      ...this.clusterSummary.deviceTypes,
      ...this.dpReportSummary.types.map(type => this._deviceTypeFromInferredType(type)).filter(Boolean),
    ]);
    this.candidates = new Map();
    this.sourceSummary = [];
    this.quirkAnalysis = ManufacturerDeviceQuirkRegistry.analyze({
      data: this.data,
      clusterSummary: this.clusterSummary,
      dpIds: this.dpIds,
      dpReportSummary: this.dpReportSummary,
      observedCapabilities: this.observedCapabilities,
      observedDeviceTypes: this.observedDeviceTypes,
    });
  }

  static detect(data = {}, options = {}) {
    return new ProbabilisticDeviceDetector(data, options).detect();
  }

  static resetCaches() {
    _jsonCache = new Map();
    _compoundDb = undefined;
    _runtimeFingerprintDb = undefined;
    _tuyaProfiles = undefined;
    _enrichedDpMappings = undefined;
  }

  detect() {
    this._addCompoundFingerprintEvidence();
    this._addRuntimeFingerprintEvidence();
    this._addTuyaProfileEvidence();
    this._addEnrichedMappingEvidence();
    this._addDriverMappingEvidence();
    this._addMfsEvidence();
    this._addCommunityEvidence();
    this._addManufacturerQuirkEvidence();
    this._addClusterBehaviorEvidence();
    this._addDpBehaviorEvidence();
    this._addLearningRecommendationEvidence();
    this._addCapabilityOverlapEvidence();
    return this._buildResult();
  }

  _candidate(driverId) {
    const normalized = normalizeDriverId(driverId);
    if (!normalized) return null;
    if (!this.candidates.has(normalized)) {
      this.candidates.set(normalized, {
        driver: normalized,
        rawScore: 0,
        evidence: [],
        contradictions: [],
        sources: new Set(),
        capabilities: new Set(),
        deviceTypes: new Set(),
        sourceWeights: {},
      });
    }
    return this.candidates.get(normalized);
  }

  _vote(driverId, score, source, reason, meta = {}) {
    const candidate = this._candidate(driverId);
    if (!candidate || !Number.isFinite(score) || score <= 0) return;

    const boundedScore = clamp(score, 0, 95);
    candidate.rawScore += boundedScore;
    candidate.sources.add(source);
    candidate.sourceWeights[source] = (candidate.sourceWeights[source] || 0) + boundedScore;
    if (reason) candidate.evidence.push(`${source}:${reason}`);
    for (const cap of asArray(meta.capabilities)) candidate.capabilities.add(cap);
    for (const type of asArray(meta.deviceTypes)) candidate.deviceTypes.add(type);
    for (const contradiction of asArray(meta.contradictions)) candidate.contradictions.push(contradiction);
  }

  _addSourceSummary(source, status, details = {}) {
    this.sourceSummary.push({ source, status, ...details });
  }

  _addCompoundFingerprintEvidence() {
    const db = getCompoundDb();
    if (!db?.lookup) {
      this._addSourceSummary('compound_fingerprint_db', 'unavailable');
      return;
    }

    const profile = db.lookup(this.data.manufacturerName, this.data.modelId);
    if (!profile) {
      this._addSourceSummary('compound_fingerprint_db', 'miss');
      return;
    }

    const score = profile.matchType === 'exact' || profile.matchType === 'exact_ci' ? 92 : 36;
    const driver = profile.driver || driverFromDeviceType(profile.type, { gangCount: profile.gangCount || this.clusterSummary.endpointCount });
    this._vote(driver, score, 'compound_fingerprint_db', profile.matchType || 'match', {
      capabilities: Object.values(profile.dp || {}).map(value => String(value).split(/[/*]/)[0]),
      deviceTypes: [profile.type, profile.driver],
    });
    this._addSourceSummary('compound_fingerprint_db', 'hit', {
      driver,
      matchType: profile.matchType,
      key: profile.key,
    });
  }

  _addRuntimeFingerprintEvidence() {
    const db = getRuntimeFingerprintDb();
    if (!db?.getFingerprint) {
      this._addSourceSummary('runtime_fingerprint_db', 'unavailable');
      return;
    }

    const fp = db.getFingerprint(this.data.manufacturerName, this.data.modelId);
    if (!fp?.driverId) {
      this._addSourceSummary('runtime_fingerprint_db', 'miss');
      return;
    }

    const modelLower = normalizeText(this.data.modelId);
    const modelMatches = !modelLower || !Array.isArray(fp.modelIds) ||
      fp.modelIds.some(model => normalizeText(model) === modelLower);
    const score = fp.matchType === 'exact' || fp.matchType === 'exact_ci' ? 88 : modelMatches ? 64 : 46;
    this._vote(fp.driverId, score, 'runtime_fingerprint_db', modelMatches ? 'manufacturer_model' : 'manufacturer_only', {
      capabilities: fp.capabilities,
      deviceTypes: [fp.type, fp.driverId],
    });
    this._addSourceSummary('runtime_fingerprint_db', 'hit', {
      driver: fp.driverId,
      matchType: fp.matchType || (modelMatches ? 'model_supported' : 'manufacturer_only'),
    });
  }

  _addTuyaProfileEvidence() {
    const profiles = getTuyaProfiles();
    const profile = profiles?.getTuyaProfile?.(this.data.modelId, this.data.manufacturerName);
    if (!profile) {
      this._addSourceSummary('tuya_profiles', 'miss');
      return;
    }

    const driver = profile.driver || driverFromProfile(profile.profileId) || driverFromDeviceType(profile.type);
    this._vote(driver, profile.driver ? 72 : 50, 'tuya_profiles', profile.name || profile.key || 'profile_match', {
      capabilities: profiles.getProfileCapabilities?.(profile),
      deviceTypes: [profile.type, driver],
    });
    this._addSourceSummary('tuya_profiles', 'hit', { driver, key: profile.key });
  }

  _addEnrichedMappingEvidence() {
    const mappings = getEnrichedDpMappings();
    const profile = mappings?.getProfile?.(this.data.manufacturerName);
    if (!profile) {
      this._addSourceSummary('enriched_dp_mappings', 'miss');
      return;
    }

    const type = profile.type || mappings.getDeviceType?.(this.data.manufacturerName);
    const driver = profile.driver || driverFromDeviceType(type);
    this._vote(driver, 42, 'enriched_dp_mappings', type || 'manufacturer_profile', {
      capabilities: Object.values(profile.profile || {}).map(value => value?.capability).filter(Boolean),
      deviceTypes: [type],
    });
    this._addSourceSummary('enriched_dp_mappings', 'hit', { driver, type });
  }

  _addDriverMappingEvidence() {
    const db = readJson(DRIVER_MAPPING_PATH, {});
    const mfrDrivers = this._lookupCaseInsensitive(db.mfr_index, this.data.manufacturerName);
    const pidDrivers = this._lookupCaseInsensitive(db.pid_index, this.data.modelId);
    const driverSpecs = db.drivers || {};

    if (Array.isArray(mfrDrivers)) {
      const spread = Math.max(1, Math.min(mfrDrivers.length, 12));
      for (const driver of mfrDrivers.slice(0, 40)) {
        this._vote(driver, 34 / Math.sqrt(spread), 'driver_mapping_mfr_index', 'manufacturer_index', {
          capabilities: driverSpecs[driver]?.capabilities,
          deviceTypes: [driverSpecs[driver]?.class],
        });
      }
    }

    if (Array.isArray(pidDrivers)) {
      const isBroadTuya = normalizeText(this.data.modelId) === 'ts0601';
      const spread = Math.max(1, Math.min(pidDrivers.length, isBroadTuya ? 80 : 20));
      const base = isBroadTuya ? 10 : 24;
      for (const driver of pidDrivers.slice(0, isBroadTuya ? 120 : 50)) {
        this._vote(driver, base / Math.sqrt(spread), 'driver_mapping_pid_index', isBroadTuya ? 'broad_ts0601_index' : 'product_index', {
          capabilities: driverSpecs[driver]?.capabilities,
          deviceTypes: [driverSpecs[driver]?.class],
        });
      }
    }

    this._addSourceSummary('driver_mapping_database', (mfrDrivers || pidDrivers) ? 'hit' : 'miss', {
      manufacturerCandidates: Array.isArray(mfrDrivers) ? mfrDrivers.length : 0,
      productCandidates: Array.isArray(pidDrivers) ? pidDrivers.length : 0,
    });
  }

  _addMfsEvidence() {
    const db = readJson(MFS_DATABASE_PATH, {});
    const key = normalizeText(this.data.manufacturerName);
    const entry = this._lookupCaseInsensitive(db.devices, key) || this._lookupCaseInsensitive(db, this.data.manufacturerName);
    if (!entry?.driverId && !entry?.driver) {
      this._addSourceSummary('mfs_db', 'miss');
      return;
    }

    const sourceCount = asArray(entry.source || entry.sources).length || 1;
    const driver = entry.driverId || entry.driver;
    this._vote(driver, 28 + Math.min(12, sourceCount * 3), 'mfs_db', `sources:${sourceCount}`, {
      capabilities: entry.capabilities,
      deviceTypes: [entry.deviceType, entry.type],
    });
    this._addSourceSummary('mfs_db', 'hit', { driver, sourceCount });
  }

  _addCommunityEvidence() {
    const rows = readJson(COMMUNITY_ENRICHED_PATH, []);
    const mfrLower = normalizeText(this.data.manufacturerName);
    const modelLower = normalizeText(this.data.modelId);
    let hits = 0;

    for (const row of Array.isArray(rows) ? rows : []) {
      if (normalizeText(row.mfr || row.manufacturerName) !== mfrLower) continue;
      const productIds = asArray(row.productId || row.productIds || row.modelId);
      const modelMatches = !modelLower || !productIds.length || productIds.some(productId => normalizeText(productId) === modelLower);
      if (!modelMatches) continue;
      hits += 1;
      this._vote(row.driver, row.source ? 42 : 34, 'community_enriched', row.source || 'community_match', {
        capabilities: row.capabilities,
        deviceTypes: [row.deviceType],
        contradictions: row.hasBattery === false && this.observedCapabilities.includes('measure_battery')
          ? ['community:no_battery_but_battery_observed']
          : [],
      });
      if (hits >= 8) break;
    }

    this._addSourceSummary('community_enriched', hits ? 'hit' : 'miss', { hits });
  }

  _addManufacturerQuirkEvidence() {
    const quirks = this.quirkAnalysis?.quirks || [];
    if (!quirks.length) {
      this._addSourceSummary('manufacturer_quirks', 'miss');
      return;
    }

    for (const quirk of quirks) {
      const preferredDrivers = asArray(quirk.preferredDrivers);
      if (!preferredDrivers.length || !quirk.boost) continue;
      const score = Math.max(16, Number(quirk.boost) / Math.sqrt(preferredDrivers.length));
      for (const driver of preferredDrivers) {
        this._vote(driver, score, 'manufacturer_quirks', quirk.id, {
          capabilities: quirk.capabilities,
          deviceTypes: quirk.deviceTypes,
        });
      }
    }

    this._addSourceSummary('manufacturer_quirks', 'hit', {
      fingerprintKey: this.quirkAnalysis.fingerprintKey,
      quirks: quirks.map(quirk => quirk.id),
      powerSourceOverride: this.quirkAnalysis.powerSourceOverride,
    });
  }

  _addClusterBehaviorEvidence() {
    const context = { gangCount: this.clusterSummary.endpointCount };
    for (const type of this.clusterSummary.deviceTypes) {
      const driver = driverFromDeviceType(type, context);
      const score = type === 'tuya_dp' ? 18 : 30;
      this._vote(driver, score, 'cluster_behavior', `type:${type}`, {
        capabilities: this.clusterSummary.capabilities,
        deviceTypes: [type],
      });
    }

    if (this.clusterSummary.hasEnergy) {
      this._vote('plug_energy_monitor', 24, 'cluster_behavior', 'energy_clusters_present', {
        capabilities: ['measure_power', 'meter_power'],
        deviceTypes: ['plug', 'meter'],
      });
    }

    if (this.clusterSummary.hasBattery && this.clusterSummary.endpointCount >= 2 && !this.clusterSummary.hasEnergy) {
      const buttonDriver = this.clusterSummary.endpointCount <= 4
        ? `button_wireless_${this.clusterSummary.endpointCount}`
        : 'button_wireless';
      this._vote(buttonDriver, 20, 'cluster_behavior', `battery_multi_endpoint:${this.clusterSummary.endpointCount}`, {
        capabilities: ['measure_battery'],
        deviceTypes: ['button'],
      });
    }

    this._addSourceSummary('cluster_behavior', this.clusterSummary.clusters.length ? 'hit' : 'miss', {
      clusters: this.clusterSummary.clusters,
      endpointCount: this.clusterSummary.endpointCount,
    });
  }

  _addDpBehaviorEvidence() {
    const dpDb = readJson(DP_DATABASE_PATH, {});
    const dpCapabilities = new Set();
    const dpDeviceTypes = new Set();

    for (const dpId of this.dpIds) {
      const info = dpDb[String(dpId)];
      if (!info) continue;
      for (const cap of asArray(info.capabilities)) dpCapabilities.add(cap);
      for (const type of asArray(info.deviceTypes)) dpDeviceTypes.add(type);
    }

    for (const type of dpDeviceTypes) {
      const driver = driverFromDeviceType(type, { gangCount: this.clusterSummary.endpointCount });
      this._vote(driver, 14 + Math.min(20, this.dpIds.length * 2), 'dp_database_behavior', `dp_type:${type}`, {
        capabilities: [...dpCapabilities],
        deviceTypes: [type],
      });
    }

    this._addSourceSummary('dp_database_behavior', dpCapabilities.size || dpDeviceTypes.size ? 'hit' : 'miss', {
      dpCount: this.dpIds.length,
      capabilities: [...dpCapabilities].sort(),
      deviceTypes: [...dpDeviceTypes].sort(),
    });
  }

  _addLearningRecommendationEvidence() {
    const recommendation = this.dpReportSummary.recommendation;
    if (!recommendation?.profileId) {
      this._addSourceSummary('dp_learning_report', 'miss');
      return;
    }

    const driver = driverFromProfile(recommendation.profileId);
    const confidence = clamp(Number(recommendation.confidence) || 0, 0, 99);
    this._vote(driver, Math.max(18, confidence * 0.62), 'dp_learning_report', recommendation.profileId, {
      capabilities: recommendation.observedCapabilities,
      deviceTypes: [recommendation.profileId],
    });
    this._addSourceSummary('dp_learning_report', 'hit', {
      profileId: recommendation.profileId,
      confidence,
      driver,
    });
  }

  _addCapabilityOverlapEvidence() {
    if (!this.observedCapabilities.length) {
      this._addSourceSummary('capability_overlap', 'miss');
      return;
    }

    const mapping = readJson(DRIVER_MAPPING_PATH, {});
    const drivers = mapping.drivers || {};
    const observed = new Set(this.observedCapabilities.map(String));
    let matched = 0;

    for (const [driverId, spec] of Object.entries(drivers)) {
      const caps = asArray(spec.capabilities).map(String);
      if (!caps.length) continue;
      const overlap = caps.filter(cap => observed.has(cap)).length;
      if (!overlap) continue;
      const ratio = overlap / Math.max(observed.size, caps.length, 1);
      if (ratio < 0.18 && overlap < 2) continue;
      matched += 1;
      this._vote(driverId, Math.min(28, overlap * 6 + ratio * 18), 'capability_overlap', `overlap:${overlap}`, {
        capabilities: caps,
        deviceTypes: [spec.class],
      });
    }

    this._addSourceSummary('capability_overlap', matched ? 'hit' : 'miss', { matched });
  }

  _lookupCaseInsensitive(object, key) {
    if (!object || !key) return null;
    if (object[key] !== undefined) return object[key];
    const lowered = normalizeText(key);
    for (const [candidateKey, value] of Object.entries(object)) {
      if (normalizeText(candidateKey) === lowered) return value;
    }
    return null;
  }

  _deviceTypeFromInferredType(type) {
    const normalized = normalizeText(type);
    if (!normalized) return null;
    if (normalized.includes('button')) return 'button';
    if (normalized.includes('presence')) return 'presence';
    if (normalized.includes('contact')) return 'contact';
    if (normalized.includes('battery')) return 'sensor';
    if (normalized.includes('temperature') || normalized.includes('humidity')) return 'climate';
    if (normalized.includes('power') || normalized.includes('energy') || normalized.includes('voltage') || normalized.includes('current')) return 'plug';
    if (normalized.includes('lux')) return 'illuminance';
    if (normalized.includes('onoff')) return 'switch';
    return null;
  }

  _applyCandidateBonuses(candidate) {
    let score = candidate.rawScore;
    const sources = [...candidate.sources];
    const capabilities = [...candidate.capabilities];
    const deviceTypes = [...candidate.deviceTypes].map(normalizeText);
    const driverLower = normalizeText(candidate.driver);
    const evidence = [...candidate.evidence];
    const contradictions = [...candidate.contradictions];

    const diversityBonus = Math.min(18, Math.max(0, sources.length - 1) * 5);
    if (diversityBonus) {
      score += diversityBonus;
      evidence.push(`bonus:source_diversity:${sources.length}`);
    }

    const observedCaps = new Set(this.observedCapabilities.map(String));
    const overlap = capabilities.filter(cap => observedCaps.has(cap)).length;
    if (overlap) {
      const bonus = Math.min(20, overlap * 4);
      score += bonus;
      evidence.push(`bonus:capability_agreement:${overlap}`);
    }

    const observedTypes = new Set(this.observedDeviceTypes.map(normalizeText));
    const typeOverlap = deviceTypes.filter(type => observedTypes.has(type) || driverLower.includes(type)).length;
    if (typeOverlap) {
      score += Math.min(14, typeOverlap * 5);
      evidence.push(`bonus:type_agreement:${typeOverlap}`);
    }

    if (GENERIC_DRIVER_PENALTY.has(candidate.driver)) {
      score -= 18;
      contradictions.push('generic_driver_penalty');
    }

    const quirkEffect = ManufacturerDeviceQuirkRegistry.driverEffect(this.quirkAnalysis, candidate.driver);
    if (quirkEffect.boost) {
      score += quirkEffect.boost;
      evidence.push(...quirkEffect.evidence);
    }
    if (quirkEffect.penalty) {
      score -= quirkEffect.penalty;
      contradictions.push(...quirkEffect.contradictions);
    }

    if (this.clusterSummary.hasEnergy && /battery|button|contact|motion|climate/.test(driverLower) && !/plug|meter|energy|air_quality/.test(driverLower)) {
      score -= 12;
      contradictions.push('energy_cluster_vs_battery_driver');
    }

    if (this.clusterSummary.hasBattery && /plug|meter|mains|air_quality/.test(driverLower) && !this.clusterSummary.hasEnergy) {
      score -= 8;
      contradictions.push('battery_cluster_vs_mains_driver');
    }

    if (normalizeText(this.data.modelId) === 'ts004f' && !/button|knob|scene/.test(driverLower)) {
      score -= 24;
      contradictions.push('ts004f_not_button_or_knob');
    }

    if (this.observedCapabilities.includes('windowcoverings_set') && !/curtain|cover|blind|shutter/.test(driverLower)) {
      score -= 14;
      contradictions.push('cover_capability_driver_mismatch');
    }

    if ((this.observedCapabilities.includes('alarm_motion') || this.observedCapabilities.includes('alarm_presence')) &&
        (this.observedCapabilities.includes('measure_luminance') || this.observedCapabilities.includes('target_distance')) &&
        !/presence|motion|radar/.test(driverLower)) {
      score -= 10;
      contradictions.push('presence_behavior_driver_mismatch');
    }

    return {
      ...candidate,
      rankScore: round(score, 2),
      score: clamp(round(score, 2), 0, 99),
      sources,
      capabilities: unique(capabilities),
      deviceTypes: unique(deviceTypes.filter(Boolean)),
      evidence: unique(evidence).slice(0, 20),
      contradictions: unique(contradictions).slice(0, 12),
    };
  }

  _buildResult() {
    const candidates = [...this.candidates.values()]
      .map(candidate => this._applyCandidateBonuses(candidate))
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.rankScore - a.rankScore || b.score - a.score || a.driver.localeCompare(b.driver))
      .slice(0, 12);

    const weights = candidates.map(candidate => Math.pow(Math.max(candidate.rankScore, candidate.score), 1.18));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    candidates.forEach((candidate, index) => {
      candidate.probability = round((weights[index] / totalWeight) * 100, 2);
      candidate.confidence = clamp(Math.round(candidate.score * 0.78 + candidate.probability * 0.22), 0, 99);
      candidate.sources = candidate.sources.sort();
    });

    const best = candidates[0] || null;
    const second = candidates[1] || null;
    const margin = best && second ? best.rankScore - second.rankScore : best ? best.rankScore : 0;
    const confidence = best
      ? clamp(Math.round(best.score * 0.72 + best.probability * 0.18 + Math.min(10, margin * 0.4)), 0, 99)
      : 0;

    const badges = [];
    if (best?.sources?.length >= 3) badges.push('multi_source_agreement');
    if (this.clusterSummary.clusters.length) badges.push('cluster_behavior_seen');
    if (this.dpIds.length) badges.push('dp_behavior_seen');
    if (this.dpReportSummary.recommendation) badges.push('learning_report_seen');
    if (this.quirkAnalysis?.quirks?.length) badges.push('manufacturer_quirk_seen');
    if (this.quirkAnalysis?.powerSourceOverride) badges.push('power_source_quirk_seen');
    if (margin < 8 && candidates.length > 1) badges.push('close_race_manual_review');
    if (confidence >= 85) badges.push('high_confidence_route');

    return {
      suggestedDriver: best?.driver || null,
      deviceType: best?.deviceTypes?.[0] || this.observedDeviceTypes[0] || 'unknown',
      confidence,
      probability: best?.probability || 0,
      confidenceClass: confidence >= 85 ? 'high' : confidence >= 65 ? 'medium' : confidence >= 45 ? 'low' : 'unknown',
      candidates,
      evidenceBadges: badges,
      observed: {
        manufacturerName: this.data.manufacturerName || null,
        modelId: this.data.modelId || null,
        endpointCount: this.clusterSummary.endpointCount,
        clusters: this.clusterSummary.clusters,
        hasTuya: this.clusterSummary.hasTuya,
        dpIds: this.dpIds,
        capabilities: unique(this.observedCapabilities).sort(),
        deviceTypes: unique(this.observedDeviceTypes).sort(),
        manufacturerQuirks: (this.quirkAnalysis?.quirks || []).map(quirk => ({
          id: quirk.id,
          preferredDrivers: quirk.preferredDrivers || [],
          penalizedDrivers: quirk.penalizedDrivers || [],
          powerSourceOverride: quirk.powerSourceOverride || null,
          evidence: quirk.evidence || [],
          sourceRefs: quirk.sourceRefs || [],
        })),
      },
      sources: this.sourceSummary,
      manufacturerQuirks: {
        fingerprintKey: this.quirkAnalysis?.fingerprintKey,
        stats: this.quirkAnalysis?.stats,
        preferredDrivers: this.quirkAnalysis?.preferredDrivers || [],
        penalizedDrivers: this.quirkAnalysis?.penalizedDrivers || [],
        powerSourceOverride: this.quirkAnalysis?.powerSourceOverride || null,
      },
      generatedAt: new Date().toISOString(),
      action: confidence >= 90 ? 'safe_recommendation' : confidence >= 70 ? 'recommendation_with_review' : 'learn_more',
    };
  }
}

module.exports = ProbabilisticDeviceDetector;
