'use strict';

/**
 * TuyaTcpForceScan.js (P2411)
 *
 * WHY: Silent 3.5 / filtered-UDP devices still listen on TCP/6668 (TinyTuya Force Scan).
 * HOW: Bounded concurrent connect to /24 hosts on port 6668; optional banner peek.
 * WHO: Pairing / settings max discover only — never continuous mesh flood.
 * WHEN: forceScan / max_discover / matchCloudAndLan during pair.
 * AGAINST: Full internet scans; unbounded concurrency; Homey 64MB OOM.
 */

const net = require('net');
const { listLanBroadcastTargets } = require('./UdpDiscoveryKeys');

const TCP_PORT = 6668;
const DEFAULT_TIMEOUT_MS = 280;
const DEFAULT_CONCURRENCY = 28;
const MAX_HOSTS_PER_NIC = 254;

function ipv4ToInt(ip) {
  const p = String(ip).split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

function intToIpv4(n) {
  return [
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ].join('.');
}

/**
 * Enumerate usable /24 hosts for each Homey LAN NIC (excludes .0/.255/self).
 * @returns {{ip:string, selfIp:string}[]}
 */
function listLanSubnetHosts({ maxPerNic = MAX_HOSTS_PER_NIC } = {}) {
  const hosts = [];
  const seen = new Set();
  const nics = listLanBroadcastTargets();
  for (const nic of nics) {
    const self = nic.ip;
    if (!self || self === '0.0.0.0') continue;
    const parts = self.split('.').map(Number);
    if (parts.length !== 4) continue;
    const base = (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8);
    let added = 0;
    for (let host = 1; host <= 254 && added < maxPerNic; host += 1) {
      const ip = intToIpv4((base + host) >>> 0);
      if (ip === self) continue;
      if (seen.has(ip)) continue;
      seen.add(ip);
      hosts.push({ ip, selfIp: self });
      added += 1;
    }
  }
  return hosts;
}

function probeOpenPort(ip, port = TCP_PORT, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok, extra = {}) => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch (_e) { /* ignore */ }
      resolve(ok ? { ip, port, open: true, ...extra } : null);
    };
    const sock = net.connect({ host: ip, port });
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

/**
 * Run TinyTuya-style force scan (TCP/6668) over local /24 subnet(s).
 * @returns {Promise<object[]>} devices with source:'tcp6668'
 */
async function forceScanTcp6668(opts = {}) {
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const concurrency = Math.max(4, Math.min(opts.concurrency || DEFAULT_CONCURRENCY, 48));
  const log = opts.log || (() => {});
  const maxPerNic = opts.maxPerNic != null ? opts.maxPerNic : MAX_HOSTS_PER_NIC;
  if (maxPerNic <= 0) {
    return [];
  }
  const hosts = listLanSubnetHosts({ maxPerNic });
  if (!hosts.length) {
    log('[TCP-FORCE] No LAN NIC for subnet scan');
    return [];
  }

  log(`[TCP-FORCE] Scanning ${hosts.length} hosts on TCP/${TCP_PORT} (c=${concurrency})`);
  const found = [];
  let idx = 0;

  async function worker() {
    while (idx < hosts.length) {
      const cur = hosts[idx];
      idx += 1;
      const hit = await probeOpenPort(cur.ip, TCP_PORT, timeoutMs);
      if (hit) {
        found.push({
          id: `tcp:${hit.ip}`,
          deviceId: '',
          ip: hit.ip,
          version: 'auto',
          productKey: '',
          encrypted: true,
          advertising: true,
          source: 'tcp6668',
          frame: 'tcp-open',
          discoveredAt: Date.now(),
        });
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i += 1) workers.push(worker());
  await Promise.all(workers);
  log(`[TCP-FORCE] Open listeners: ${found.length}`);
  return found;
}

module.exports = {
  TCP_PORT,
  ipv4ToInt,
  intToIpv4,
  listLanSubnetHosts,
  probeOpenPort,
  forceScanTcp6668,
};
