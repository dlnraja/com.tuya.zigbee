'use strict';

/**
 * P2621 / P2647 — WiFi Fix-It helpers (inspired by com.tuyalocal Fix It + Cloud Lookup).
 *
 * WHY: Users hit stale local_key / wrong protocol / silent scaling after
 *   Smart Life re-pair — dedicated drivers alone do not heal credentials.
 * HOW: Read-only inventory + optional cloud key compare preview (no auto-write
 *   until caller applies). Support bundle redacts keys / shortens device IDs.
 *   P2647: TCP 6668/6667 probe — Open vs Both closed (Matter/cloud-only / deep-sleep).
 * WHO: MASTER_ONLY Homey App Settings (WiFi section).
 * WHEN: User opens Fix It / Create support bundle.
 * AGAINST: Pasting full local_key into forum/GitHub reports.
 */

const net = require('net');

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
 * P2647 — TCP probe Tuya local ports (com.tuyalocal Fix It "Open vs Both closed").
 * @param {string} host
 * @param {number} port
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
function probeTcpPort(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    if (!host || !port) {
      resolve(false);
      return;
    }
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch (_e) { /* soft */ }
      resolve(!!ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try {
      socket.connect(port, host);
    } catch (_e) {
      finish(false);
    }
  });
}

/**
 * @param {string} ip
 * @returns {Promise<{ip:string,port6668:boolean,port6667:boolean,verdict:string}>}
 */
async function probeLanPorts(ip) {
  const host = String(ip || '').trim();
  if (!host) {
    return { ip: '', port6668: false, port6667: false, verdict: 'no_ip' };
  }
  const [p6668, p6667] = await Promise.all([
    probeTcpPort(host, 6668),
    probeTcpPort(host, 6667),
  ]);
  let verdict = 'both_closed';
  if (p6668 || p6667) verdict = 'open';
  return { ip: host, port6668: p6668, port6667: p6667, verdict };
}

/**
 * Soft LAN reachability findings for unavailable devices with an IP.
 * Caps probes to avoid flooding Homey on large fleets.
 * @param {object[]} devices
 * @param {{ maxProbes?: number }} [opts]
 */
async function checkLanPorts(devices, opts = {}) {
  const findings = [];
  const maxProbes = Math.max(0, Number(opts.maxProbes != null ? opts.maxProbes : 8));
  let n = 0;
  for (const d of devices) {
    if (!d.ip || d.available) continue;
    if (n >= maxProbes) {
      findings.push({
        check: 'lan_ports',
        severity: 'info',
        message: `LAN probe capped at ${maxProbes} unavailable devices — re-run after fixing others.`,
      });
      break;
    }
    n += 1;
    const probe = await probeLanPorts(d.ip);
    if (probe.verdict === 'both_closed') {
      findings.push({
        deviceId: d.id,
        name: d.name,
        check: 'lan_ports',
        severity: 'warn',
        ip: d.ip,
        port6668: false,
        port6667: false,
        message:
          'Both Tuya LAN ports closed (6668/6667). Often Matter/cloud-only, deep-sleep battery sensor, or Bluetooth-behind-gateway — local protocol cannot talk. Not a key typo.',
      });
    } else {
      findings.push({
        deviceId: d.id,
        name: d.name,
        check: 'lan_ports',
        severity: 'info',
        ip: d.ip,
        port6668: probe.port6668,
        port6667: probe.port6667,
        message:
          'LAN port open — device speaks local protocol; focus on local_key / protocol version / DP map.',
      });
    }
  }
  return findings;
}

/** Static notes from com.tuyalocal Fix It (complementary — never wipe). */
const LAN_LIMITATION_NOTES = [
  'Battery sensors in deep sleep (door/motion/smoke/TH) — no TCP window between reports; cloud works because device pushes outbound.',
  'Bluetooth devices behind a Tuya gateway — gateway proxies cloud only; local protocol usually unavailable.',
  'Some retail “Tuya” SKUs are Matter or cloud-only under the hood — both ports closed is expected.',
];

/**
 * Redacted support bundle for GitHub / diagnostics (never includes full keys).
 */
function buildSupportBundle(homey, devices, extra = {}) {
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
    lanPortFindings: extra.lanPortFindings || [],
    lanLimitationNotes: LAN_LIMITATION_NOTES,
    inspiredBy: {
      app: 'com.tuyalocal',
      storeTest: 'https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/',
      tip: '1.0.237',
      patch: 'P2647',
    },
  };
}

/**
 * Run all Fix-It checks (preview).
 */
async function runFixItChecks(homey, opts = {}) {
  const devices = listWifiLanDevices(homey);
  const lanPortFindings = opts.skipLanProbe
    ? []
    : await checkLanPorts(devices, { maxProbes: opts.maxProbes });
  return {
    devices,
    findings: [
      ...checkLocalKeys(devices, opts.cloudDevices || []),
      ...checkProtocolVersions(devices),
      ...lanPortFindings,
    ],
    bundle: buildSupportBundle(homey, devices, { lanPortFindings }),
  };
}

module.exports = {
  shortId,
  redactKey,
  listWifiLanDevices,
  checkProtocolVersions,
  checkLocalKeys,
  probeTcpPort,
  probeLanPorts,
  checkLanPorts,
  LAN_LIMITATION_NOTES,
  buildSupportBundle,
  runFixItChecks,
};
