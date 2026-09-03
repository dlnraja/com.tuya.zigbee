'use strict';

/**
 * TuyaPairingOrchestrator.js (P2409 + P2411)
 * Max discovery: UDP burst + mDNS + TinyTuya TCP/6668 force scan + cloud↔LAN match.
 * Local-first: cloud only for local_key retrieval / match.
 */

const TuyaDeviceDiscovery = require('./TuyaDeviceDiscovery');
const {
  normalizeLocalKey,
  buildProtocolFallbackChain,
  PROTOCOL_VERSIONS,
} = require('./UdpDiscoveryKeys');

function sleep(ms) {
  // module-level native setTimeout — no Homey instance (WiFi pairing script utility)
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Kick max LAN discovery (pairing).
 * Layers: persistent UDP cache → burst solicitation → on-demand UDP scan → TCP/6668 force → mDNS.
 * @returns {Promise<object[]>}
 */
async function collectLanDevices(driver, opts = {}) {
  const timeout = opts.timeoutMs || 10000;
  const maxMode = opts.max !== false; // default ON for pairing
  const forceTcp = opts.forceTcpScan !== false && maxMode;
  const app = driver.safeApp;
  const byId = new Map();

  const merge = (list, sourceHint) => {
    for (const d of list || []) {
      const n = normalizeLanEntry(d, sourceHint);
      if (!n.id && !n.ip) continue;
      // TCP-only hits keyed by IP so they don't clobber real gwIds
      const key = n.id && !String(n.id).startsWith('tcp:')
        ? n.id
        : (n.ip ? `ip:${n.ip}` : null);
      if (!key) continue;
      const prev = byId.get(key) || {};
      byId.set(key, {
        ...prev,
        ...n,
        id: n.id && !String(n.id).startsWith('tcp:') ? n.id : (prev.id || n.id),
        deviceId: n.deviceId && !String(n.deviceId).startsWith('tcp:')
          ? n.deviceId
          : (prev.deviceId || n.deviceId),
        sources: Array.from(new Set([...(prev.sources || []), n.source].filter(Boolean))),
        source: [prev.source, n.source].filter(Boolean).join('+') || n.source,
      });
    }
  };

  // 1) Burst UDP solicitation (wake silent 3.5)
  try {
    const { burstWifiProbe } = require('../discovery/AutonomousAdvertisingDiscovery');
    await burstWifiProbe(app?._tuyaUDPDiscovery, { durationMs: Math.min(timeout, 9000) });
  } catch (_e) {
    try { await app?._tuyaUDPDiscovery?.probeNow?.(); } catch (_e2) { /* non-fatal */ }
  }

  // Brief settle for unicast 7000 replies
  if (maxMode) await sleep(Math.min(1500, Math.floor(timeout / 5)));

  merge(app?._tuyaUDPDiscovery?.listAdvertising?.() || app?._tuyaUDPDiscovery?.devices || [], 'udp');

  // 2) On-demand UDP scan (or if cache empty / force)
  if (opts.forceScan || byId.size === 0 || maxMode) {
    try {
      const discovery = new TuyaDeviceDiscovery({ log: driver, timeout: Math.min(timeout, 12000) });
      driver._discovery = discovery;
      const scanned = await discovery.scan(Math.min(timeout, 12000));
      merge(scanned, 'udp-scan');
    } catch (err) {
      driver.log?.('[PAIR] UDP scan failed:', err.message);
    }
  }

  // 3) Homey mDNS (_tuya._tcp)
  try {
    const { buildWifiLanSnapshot } = require('../discovery/AutonomousAdvertisingDiscovery');
    const snap = buildWifiLanSnapshot(driver.homey || {}, {
      udpDiscovery: app?._tuyaUDPDiscovery,
    });
    merge((snap.devices || []).filter((d) => String(d.source || '').includes('mdns')), 'mdns');
  } catch (_e) { /* optional */ }

  // 4) TinyTuya force scan TCP/6668 (find silent advertisers by open port)
  if (forceTcp) {
    try {
      const { forceScanTcp6668 } = require('./TuyaTcpForceScan');
      const tcpHits = await forceScanTcp6668({
        log: (...a) => driver.log?.(...a),
        concurrency: opts.tcpConcurrency || 28,
        timeoutMs: opts.tcpTimeoutMs || 280,
      });
      // Prefer merging TCP open onto existing UDP rows by IP; else keep as orphan IP
      for (const hit of tcpHits) {
        let merged = false;
        for (const [key, row] of byId) {
          if (row.ip && hit.ip && row.ip === hit.ip) {
            byId.set(key, {
              ...row,
              source: `${row.source}+tcp6668`,
              sources: Array.from(new Set([...(row.sources || []), 'tcp6668'])),
              advertising: true,
            });
            merged = true;
            break;
          }
        }
        if (!merged) merge([hit], 'tcp6668');
      }
    } catch (err) {
      driver.log?.('[PAIR] TCP force scan failed:', err.message);
    }
  }

  return [...byId.values()].map((d) => ({
    ...d,
    id: d.id && !String(d.id).startsWith('tcp:') ? d.id : (d.deviceId || d.id || ''),
  }));
}

function normalizeLanEntry(d, sourceHint) {
  const id = d.deviceId || d.id || d.gwId || '';
  return {
    id,
    deviceId: id,
    ip: d.ip || d.ip_address || '',
    version: d.version || '3.3',
    productKey: d.productKey || d.product_key || '',
    uuid: d.uuid || d.uid || '',
    frame: d.frame || '',
    encrypted: !!d.encrypted,
    advertising: d.advertising !== false,
    source: d.source || sourceHint || 'udp',
    sources: d.sources || [d.source || sourceHint || 'udp'].filter(Boolean),
  };
}

function idsEqual(a, b) {
  if (!a || !b) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

/**
 * Match cloud devices (with local_key) to LAN by id / uuid / gwId / productKey soft.
 */
function matchCloudToLan(cloudDevices, lanDevices) {
  const lan = (lanDevices || []).map((d) => ({
    id: d.id || d.deviceId || d.gwId || '',
    uuid: d.uuid || '',
    ip: d.ip,
    version: d.version,
    productKey: d.productKey || '',
    source: d.source,
  }));

  const usedLanIps = new Set();

  const matched = TuyaDeviceDiscovery.matchDevices(
    (cloudDevices || []).map((d) => ({
      ...d,
      id: d.id || d.device_id,
      uuid: d.uuid || d.uid || '',
    })),
    lan.map((d) => ({ id: d.id, ip: d.ip, version: d.version }))
  ).map((d) => {
    let out = { ...d };

    // Case-insensitive id
    if (!out.discovered) {
      const byId = lan.find((l) => idsEqual(l.id, out.id));
      if (byId) {
        out = {
          ...out,
          ip: byId.ip || out.ip,
          version: byId.version || out.version,
          discovered: true,
          lan_source: byId.source,
        };
      }
    }

    // uuid match
    if (!out.discovered && out.uuid) {
      const byUuid = lan.find((l) => idsEqual(l.id, out.uuid) || idsEqual(l.uuid, out.uuid));
      if (byUuid) {
        out = {
          ...out,
          ip: byUuid.ip || out.ip,
          version: byUuid.version || out.version,
          discovered: true,
          lan_source: byUuid.source,
        };
      }
    }

    // Soft: unique productKey on LAN when cloud product_id matches and only one TCP/UDP orphan
    if (!out.discovered && (out.product_id || out.productKey)) {
      const pk = String(out.product_id || out.productKey || '').toLowerCase();
      const candidates = lan.filter(
        (l) => l.productKey && String(l.productKey).toLowerCase() === pk && l.ip
      );
      if (candidates.length === 1) {
        out = {
          ...out,
          ip: candidates[0].ip,
          version: candidates[0].version || out.version,
          discovered: true,
          lan_source: `${candidates[0].source || 'lan'}+productKey`,
        };
      }
    }

    if (out.ip) usedLanIps.add(out.ip);
    return out;
  });

  // Attach orphan advertising LAN rows (UDP with id, no cloud key yet)
  const orphans = lan
    .filter((l) => l.id && !String(l.id).startsWith('tcp:') && l.ip)
    .filter((l) => !(cloudDevices || []).some((c) => idsEqual(c.id || c.device_id, l.id)))
    .map((l) => ({
      id: l.id,
      name: `LAN ${String(l.id).slice(-6)}`,
      local_key: '',
      ip: l.ip,
      version: l.version,
      discovered: true,
      orphan_lan: true,
      lan_source: l.source,
      productKey: l.productKey,
    }));

  return [...matched, ...orphans];
}

/**
 * TCP probe across protocol cascade (3.5→…→3.1). Uses TuyAPI briefly.
 * @returns {Promise<{ok:boolean, reason?:string, ip?:string, version?:string}>}
 */
async function probeLocalCredentials(cfg, log = () => {}) {
  const key = normalizeLocalKey(cfg.key) || cfg.key;
  if (!cfg.id || !key) {
    return { ok: false, reason: 'missing device_id or local_key' };
  }

  const preferred = cfg.version && cfg.version !== 'auto' ? cfg.version : null;
  const chain = cfg.autoDetect === false && preferred
    ? [preferred]
    : buildProtocolFallbackChain(preferred || '3.3');

  // Candidate IPs: explicit → find() via tuyapi → optional hints
  const ipHints = [];
  if (cfg.ip) ipHints.push(cfg.ip);
  for (const h of cfg.ipHints || []) {
    if (h && !ipHints.includes(h)) ipHints.push(h);
  }
  // Always also try discovery-without-ip once at end of each version
  const attempts = ipHints.length ? [...ipHints.map((ip) => ({ ip })), { ip: undefined }] : [{ ip: undefined }];

  let lastReason = 'no protocol succeeded';
  for (const version of chain) {
    for (const attempt of attempts) {
      let probe = null;
      try {
        const TuyAPI = require('tuyapi');
        probe = new TuyAPI({
          id: cfg.id,
          key,
          version,
          ip: attempt.ip || undefined,
        });
        const result = await Promise.race([
          (async () => {
            if (!attempt.ip) {
              await probe.find({ timeout: 5500 });
            } else {
              await probe.find({ timeout: 2000 }).catch(() => {});
            }
            await probe.connect();
            const ip = probe.device?.ip || attempt.ip || null;
            return { ok: true, ip, version };
          })(),
          new Promise((resolve) => {
            // native setTimeout — no device Homey context during LAN probe race
            setTimeout(() => resolve({ ok: false, reason: `timeout v${version}` }), 7500);
          }),
        ]);
        if (result.ok) {
          log(`[PAIR] Probe OK id=${cfg.id} v${version} ip=${result.ip || '—'}`);
          return result;
        }
        lastReason = result.reason || lastReason;
      } catch (err) {
        lastReason = err.message || `v${version} failed`;
        log(`[PAIR] Probe fail v${version} ip=${attempt.ip || 'auto'}:`, lastReason);
      } finally {
        try { if (probe) await probe.disconnect(); } catch (_e) { /* ignore */ }
      }
    }
  }
  return { ok: false, reason: lastReason };
}

/**
 * Full max discover snapshot for pair UI / settings.
 */
async function maxDiscover(driver, opts = {}) {
  const lan = await collectLanDevices(driver, {
    timeoutMs: opts.timeoutMs || 12000,
    forceScan: true,
    forceTcpScan: true,
    max: true,
    ...opts,
  });
  const withId = lan.filter((d) => d.id && !String(d.id).startsWith('tcp:'));
  const tcpOnly = lan.filter((d) => !d.id || String(d.id).startsWith('tcp:') || d.source?.includes('tcp6668'));
  return {
    success: true,
    devices: lan,
    stats: {
      total: lan.length,
      withId: withId.length,
      tcpOpen: tcpOnly.length,
      udp: lan.filter((d) => String(d.source || '').includes('udp')).length,
      mdns: lan.filter((d) => String(d.source || '').includes('mdns')).length,
    },
  };
}

module.exports = {
  collectLanDevices,
  matchCloudToLan,
  probeLocalCredentials,
  maxDiscover,
  PROTOCOL_VERSIONS,
};
