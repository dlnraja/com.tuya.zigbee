'use strict';

const DEFAULT_WIFI_CONNECTION_POLICY = Object.freeze({
  schemaVersion: 1,
  strategy: 'local_first',
  pairingMode: 'ad_hoc',
  transport: 'lan',
  localDiscovery: true,
  cloudFallback: false,
  cloudMirroring: false,
});

function asBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeWiFiConnectionPolicy(policy = {}) {
  const source = policy && typeof policy === 'object' ? policy : {};

  return {
    schemaVersion: Number.isInteger(source.schemaVersion) ? source.schemaVersion : DEFAULT_WIFI_CONNECTION_POLICY.schemaVersion,
    strategy: source.strategy || DEFAULT_WIFI_CONNECTION_POLICY.strategy,
    pairingMode: source.pairingMode || DEFAULT_WIFI_CONNECTION_POLICY.pairingMode,
    transport: source.transport || DEFAULT_WIFI_CONNECTION_POLICY.transport,
    localDiscovery: asBoolean(source.localDiscovery, DEFAULT_WIFI_CONNECTION_POLICY.localDiscovery),
    cloudFallback: asBoolean(source.cloudFallback, DEFAULT_WIFI_CONNECTION_POLICY.cloudFallback),
    cloudMirroring: asBoolean(source.cloudMirroring, DEFAULT_WIFI_CONNECTION_POLICY.cloudMirroring),
  };
}

function createWiFiConnectionPolicy(overrides = {}) {
  return normalizeWiFiConnectionPolicy({
    ...DEFAULT_WIFI_CONNECTION_POLICY,
    ...overrides,
  });
}

function createWiFiConnectionStore(overrides = {}) {
  return {
    wifi_connection_policy: createWiFiConnectionPolicy(overrides),
  };
}

function allowsCloudFallback(policy) {
  return normalizeWiFiConnectionPolicy(policy).cloudFallback === true;
}

module.exports = {
  DEFAULT_WIFI_CONNECTION_POLICY,
  normalizeWiFiConnectionPolicy,
  createWiFiConnectionPolicy,
  createWiFiConnectionStore,
  allowsCloudFallback,
};
