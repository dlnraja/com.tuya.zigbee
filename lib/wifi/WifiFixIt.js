'use strict';

/**
 * P2621 — WiFi Fix-It helpers (inspired by com.tuyalocal Fix It tab).
 *
 * WHY: Users hit stale local_key / wrong protocol / silent scaling after
 *   Smart Life re-pair — dedicated drivers alone do not heal credentials.
 * HOW: Read-only inventory + optional cloud key compare preview (no auto-write
 *   until caller applies). Support bundle redacts keys / shortens device IDs.
 * WHO: MASTER_ONLY Homey App Settings (WiFi section).
 * WHEN: User opens Fix It / Create support bundle.
 * AGAINST: Pasting full local_key into forum/GitHub reports.
 */

function shortId(id) {
  const s = String(id || '');
  if (s.length <= 8) return s || '—';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function redactKey(key) {
  const s = String(key || '');
  if (!s) return '';
  if (s.length <= 4) return '****';
  return `${s.slice(0, 2)}…${s.slice(-2)} (${s.length} chars)`;
}

/**
 * @param {import('homey').Homey} homey
 * @returns {object[]}
 */
function listWifiLanDevices(homey) {
  const out = [];
  let drivers;
  try {
    drivers = homey.drivers.getDrivers();
  } catch (_e) {
    return out;
  }
  for (const driverId of Object.keys(drivers)) {
    if (!String(driverId).startsWith('wifi_')) continue;
    // Skip ewelink/sonoff — different LAN stack
    if (/ewelink|sonoff|camera/i.test(driverId)) continue;
    let devices;
    try {
      devices = drivers[driverId].getDevices();
    } catch (_e2) {
      continue;
    }
    for (const device of Object.values(devices)) {
      const settings = device.getSettings?.() || {};
      const available = typeof device.getAvailable === 'function' ? device.getAvailable() : true;
      out.push({
        id: device.getId?.() || '',
        name: device.getName?.() || driverId,
        driverId,
        available: !!available,
        device_id: settings.device_id || settings.id || '',
        ip: settings.ip || settings.ip_address || '',
        protocol_version: settings.protocol_version || 'auto',
        category: settings.category || settings.tuya_category || '',
        product_id: settings.product_id || settings.product_key || '',
        has_local_key: !!(settings.local_key || settings.localKey),
        local_key_preview: redactKey(settings.local_key || settings.localKey || ''),
        offline_grace_seconds: settings.offline_grace_seconds,
        command_gap_ms: settings.command_gap_ms,
      });
    }
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

/**
 * Protocol hygiene: flag locked versions that often fail vs auto.
 * Preview only — does not mutate settings.
 */
function checkProtocolVersions(devices) {
  const findings = [];
  for (const d of devices) {
    const ver = String(d.protocol_version || 'auto').toLowerCase();
    if (ver === 'auto' || ver === '') continue;
    // Soft hint: locked 3.2 is rare for modern Tuya WiFi; suggest auto if unavailable
    if (!d.available && (ver === '3.2' || ver === '3.1')) {
      findings.push({
        deviceId: d.id,
        name: d.name,
        check: 'protocol_version',
        severity: 'warn',
        current: ver,
        suggested: 'auto',
        message: `Device unavailable with locked protocol ${ver} — try Auto (3.3→3.4→3.1→3.5→3.2).`,
      });
    }
  }
  return findings;
}

/**
 * Local-key presence check (cloud compare is optional when cloudDevices given).
 * @param {object[]} devices
 * @param {object[]} [cloudDevices] - { id, local_key }
 */
function checkLocalKeys(devices, cloudDevices = []) {
  const findings = [];
  const cloudById = new Map();
  for (const c of cloudDevices || []) {
    const id = c.id || c.device_id;
    if (id) cloudById.set(String(id), c);
  }
  for (const d of devices) {
    if (!d.has_local_key) {
      findings.push({
        deviceId: d.id,
        name: d.name,
        check: 'local_key',
        severity: 'error',
        message: 'No local_key stored — Repair device or re-pair with SmartLink / IoT credentials.',
      });
      continue;
    }
    if (!d.available && cloudById.size) {
      const cloud = cloudById.get(String(d.device_id));
      if (cloud && cloud.local_key) {
        findings.push({
          deviceId: d.id,
          name: d.name,
          check: 'local_key',
          severity: 'warn',
          message: 'Device unavailable — cloud has a local_key; open Repair to refresh if Smart Life re-paired the device.',
          cloud_key_preview: redactKey(cloud.local_key),
          stored_key_preview: d.local_key_preview,
        });
      }
    }
  }
  return findings;
}

/**
 * Redacted support bundle for GitHub / diagnostics (never includes full keys).
 */
function buildSupportBundle(homey, devices) {
  const appVersion = (() => {
    try {
      return require('../../app.json').version;
    } catch (_e) {
      return 'unknown';
    }
  })();
  return {
    generatedAt: new Date().toISOString(),
    appId: 'com.dlnraja.tuya.zigbee',
    appVersion,
    note: 'Local keys redacted. Safe to attach to a GitHub issue (no networkKey / no full keys).',
    wifiDeviceCount: devices.length,
    devices: devices.map((d) => ({
      name: d.name,
      driverId: d.driverId,
      available: d.available,
      deviceIdShort: shortId(d.device_id),
      ip: d.ip || null,
      protocol_version: d.protocol_version,
      category: d.category || null,
      product_id: d.product_id || null,
      has_local_key: d.has_local_key,
      local_key_preview: d.local_key_preview,
      offline_grace_seconds: d.offline_grace_seconds,
      command_gap_ms: d.command_gap_ms,
    })),
    protocolFindings: checkProtocolVersions(devices),
    keyFindings: checkLocalKeys(devices),
  };
}

/**
 * Run all Fix-It checks (preview).
 */
function runFixItChecks(homey, opts = {}) {
  const devices = listWifiLanDevices(homey);
  return {
    devices,
    findings: [
      ...checkLocalKeys(devices, opts.cloudDevices || []),
      ...checkProtocolVersions(devices),
    ],
    bundle: buildSupportBundle(homey, devices),
  };
}

module.exports = {
  shortId,
  redactKey,
  listWifiLanDevices,
  checkProtocolVersions,
  checkLocalKeys,
  buildSupportBundle,
  runFixItChecks,
};
