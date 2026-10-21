'use strict';
/**
 * P2950 — Support-bundle style diagnostic export for a Tuya LAN device.
 * Credit: Homey forum topic 154077 post #528 (id 790614) by Andi,
 * https://community.homey.app/t/154077/528 — asks users for a support bundle.
 * Our own format: JSON with secrets removed so users can share it publicly.
 */
const SECRET_KEYS = /^(local_?key|localkey|key|secret|access_?token|refresh_?token|password|token|client_?secret|uid)$/i;

function redact(value, depth = 0) {
  if (depth > 6) {return '[depth]';}
  if (Array.isArray(value)) {return value.map((v) => redact(v, depth + 1));}
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.test(k) ? v ? '[redacted]' : v : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function maskIp(ip) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(String(ip || ''));
  return m ? `${m[1]}.${m[2]}.x.${m[4]}` : ip ? '[masked]' : null;
}

/**
 * @param {object} p
 * @returns {object} shareable bundle
 */
function buildSupportBundle({ appVersion, device = {}, settings = {}, dps = {}, schema = null, probe = null, inference = null, log = [], now = new Date() } = {}) {
  return {
    format: 'tuya-local-support-bundle/1',
    generatedAt: now.toISOString(),
    appVersion: appVersion || null,
    device: redact({ ...device, ip: maskIp(device.ip) }),
    protocol: settings.protocol_version || device.version || null,
    settings: redact(settings),
    dps: redact(dps),
    schema: schema ? redact(schema) : null,
    probe: probe ? redact(probe) : null,
    inference: inference ? redact(inference) : null,
    log: (Array.isArray(log) ? log : []).slice(-200).map((l) => String(l).replace(/("?(?:local_?key|localKey)"?\s*[:=]\s*"?)[^",\s}]+/gi, '$1[redacted]')),
  };
}

module.exports = { buildSupportBundle, redact, maskIp };
