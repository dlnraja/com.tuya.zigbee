'use strict';

/**
 * LocalCredentialPersist (P2525)
 *
 * WHY (T146735 Smart Life cloud thread): Homey reboot / update often forces QR
 * re-login and devices go offline (error 2001) because cloud session died.
 * Our WiFi path must keep device_id + local_key + IP in Homey device store so
 * LAN control survives reboot without cloud re-auth.
 *
 * Contre quoi: settings wiped / empty after Homey update while store still has keys.
 * Dual-app: BOTH (reliability / local-first).
 */

const STORE_CRED = 'local_lan_credentials';
const STORE_POLICY = 'wifi_connection_policy';

function pickIp(settings = {}) {
  return settings.ip || settings.device_ip || settings.ip_address || null;
}

function pickKey(settings = {}) {
  return settings.local_key || settings.device_key || null;
}

function snapshotFromSettings(settings = {}) {
  return {
    device_id: settings.device_id || null,
    local_key: pickKey(settings),
    ip: pickIp(settings),
    protocol_version: settings.protocol_version || null,
    savedAt: Date.now(),
  };
}

function hasLanCredentials(settings = {}) {
  return !!(settings.device_id && pickKey(settings));
}

/**
 * Mirror settings → store (idempotent).
 * @param {object} device Homey Device
 * @returns {Promise<{saved:boolean,reason?:string}>}
 */
async function persistLocalCredentials(device) {
  if (!device || typeof device.getSettings !== 'function') {
    return { saved: false, reason: 'no_device' };
  }
  const settings = device.getSettings() || {};
  const snap = snapshotFromSettings(settings);
  if (!snap.device_id || !snap.local_key) {
    return { saved: false, reason: 'incomplete' };
  }
  if (typeof device.setStoreValue === 'function') {
    await device.setStoreValue(STORE_CRED, snap).catch(() => {});
  }
  return { saved: true };
}

/**
 * If settings lost device_id/local_key after reboot, rehydrate from store.
 * Never invent keys — only restore previously persisted LAN credentials.
 * @param {object} device Homey Device
 * @returns {Promise<{restored:boolean,reason?:string,patch?:object}>}
 */
async function restoreLocalCredentialsIfMissing(device) {
  if (!device || typeof device.getSettings !== 'function') {
    return { restored: false, reason: 'no_device' };
  }
  const settings = device.getSettings() || {};
  if (hasLanCredentials(settings)) {
    await persistLocalCredentials(device);
    return { restored: false, reason: 'settings_ok' };
  }
  const snap = typeof device.getStoreValue === 'function'
    ? device.getStoreValue(STORE_CRED)
    : null;
  if (!snap || !snap.device_id || !snap.local_key) {
    return { restored: false, reason: 'no_store' };
  }
  const patch = {};
  if (!settings.device_id) patch.device_id = snap.device_id;
  if (!pickKey(settings)) patch.local_key = snap.local_key;
  if (!pickIp(settings) && snap.ip) patch.ip = snap.ip;
  if (snap.protocol_version && !settings.protocol_version) {
    patch.protocol_version = snap.protocol_version;
  }
  if (!Object.keys(patch).length) {
    return { restored: false, reason: 'nothing_to_patch' };
  }
  if (typeof device.setSettings === 'function') {
    await device.setSettings(patch).catch(() => {});
  }
  if (typeof device.log === 'function') {
    device.log('[P2525] Restored LAN credentials from store (T146735 reboot Contre quoi)');
  }
  return { restored: true, patch };
}

/**
 * Pin local_first policy in store when absent (cloudFallback stays false).
 */
async function ensureLocalFirstPolicyStore(device) {
  if (!device || typeof device.getStoreValue !== 'function') {
    return { pinned: false };
  }
  const existing = device.getStoreValue(STORE_POLICY);
  if (existing && typeof existing === 'object' && existing.strategy) {
    return { pinned: false, existing };
  }
  let policy;
  try {
    const { createWiFiConnectionPolicy } = require('./WiFiConnectionPolicy');
    policy = createWiFiConnectionPolicy();
  } catch (_e) {
    policy = {
      schemaVersion: 1,
      strategy: 'local_first',
      transport: 'lan',
      localDiscovery: true,
      cloudFallback: false,
      cloudMirroring: false,
    };
  }
  if (typeof device.setStoreValue === 'function') {
    await device.setStoreValue(STORE_POLICY, policy).catch(() => {});
  }
  return { pinned: true, policy };
}

/**
 * Boot hook: restore → persist → pin policy.
 */
async function hydrateLocalCredentialsOnBoot(device) {
  const restore = await restoreLocalCredentialsIfMissing(device);
  const persist = await persistLocalCredentials(device);
  const policy = await ensureLocalFirstPolicyStore(device);
  return { restore, persist, policy };
}

module.exports = {
  STORE_CRED,
  STORE_POLICY,
  snapshotFromSettings,
  hasLanCredentials,
  persistLocalCredentials,
  restoreLocalCredentialsIfMissing,
  ensureLocalFirstPolicyStore,
  hydrateLocalCredentialsOnBoot,
};
