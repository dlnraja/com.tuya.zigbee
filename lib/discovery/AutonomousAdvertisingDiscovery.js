'use strict';

/**
 * AutonomousAdvertisingDiscovery (P2410)
 *
 * WHY: Users need LAN + mesh devices that are *currently advertising*
 *      (UDP beacons / mDNS / recent Zigbee RX) without waiting for cloud.
 * HOW: Merge TuyaUDPDiscovery cache + Homey discovery strategy results
 *      + ZigbeeMeshMap nodes with fresh lastSeen / RX.
 * WHO: Pairing (lan_discover), Settings APIs, local-first IP repair.
 * WHEN: Continuous UDP listen + on-demand burst; settings refresh.
 * AGAINST: Inventing unpaired Zigbee nodes (Homey stack owns join);
 *          ZDO Mgmt_LQI floods; cloud polling for day-to-day discover.
 */

const ADVERTISING_WIFI_MAX_AGE_MS = 120000;
const ADVERTISING_ZIGBEE_MAX_AGE_MS = 15 * 60 * 1000;
const BURST_PROBE_MS = 8000;
const BURST_INTERVAL_MS = 1500;

function safe(fn, fallback) {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch (_e) {
    return fallback;
  }
}

function collectPairedWifiIds(homey) {
  const ids = new Set();
  const drivers = safe(() => homey.drivers.getDrivers(), {}) || {};
  for (const driverId of Object.keys(drivers)) {
    if (!String(driverId).startsWith('wifi_')) continue;
    const devices = safe(() => drivers[driverId].getDevices(), []) || [];
    const list = Array.isArray(devices) ? devices : Object.values(devices);
    for (const device of list) {
      const settings = safe(() => device.getSettings && device.getSettings(), {}) || {};
      const data = safe(() => device.getData && device.getData(), {}) || {};
      const id = settings.device_id || data.id || data.deviceId;
      if (id) ids.add(String(id));
    }
  }
  return ids;
}

function listHomeyMdnsTuya(homey) {
  const out = [];
  const strategies = [
    safe(() => homey.discovery.getStrategy('tuya_wifi'), null),
    safe(() => homey.discovery.getStrategy('tuya'), null),
  ].filter(Boolean);

  for (const strategy of strategies) {
    const results = safe(() => strategy.getDiscoveryResults(), {}) || {};
    for (const [id, dr] of Object.entries(results)) {
      out.push({
        deviceId: id || safe(() => dr.id, null),
        ip: safe(() => dr.address, null) || safe(() => dr.host, null),
        source: 'mdns',
        name: safe(() => dr.name || dr.txt?.name, null),
        productKey: safe(() => dr.txt?.productKey || dr.txt?.pk, '') || '',
        lastSeen: safe(() => dr.lastSeen, Date.now()) || Date.now(),
        advertising: true,
      });
    }
  }
  return out;
}

/**
 * Build WiFi LAN advertising snapshot (UDP + optional Homey mDNS).
 * @param {object} homey
 * @param {object} [opts]
 * @param {object} [opts.udpDiscovery] app._tuyaUDPDiscovery
 * @param {number} [opts.maxAgeMs]
 */
function buildWifiLanSnapshot(homey, opts = {}) {
  const now = Date.now();
  const maxAge = opts.maxAgeMs || ADVERTISING_WIFI_MAX_AGE_MS;
  const udp = opts.udpDiscovery
    || safe(() => homey.__tuyaApp && homey.__tuyaApp._tuyaUDPDiscovery, null)
    || safe(() => homey.app && homey.app._tuyaUDPDiscovery, null);

  const paired = collectPairedWifiIds(homey);
  const byId = new Map();

  const udpList = typeof udp?.listAdvertising === 'function'
    ? udp.listAdvertising({ maxAgeMs: maxAge })
    : (udp?.devices || []).filter((d) => now - (d.lastSeen || 0) <= maxAge);

  for (const d of udpList) {
    const id = d.deviceId || d.id || d.gwId;
    if (!id) continue;
    byId.set(String(id), {
      deviceId: String(id),
      ip: d.ip || null,
      version: d.version || 'auto',
      productKey: d.productKey || '',
      frame: d.frame || null,
      encrypted: !!d.encrypted,
      active: d.active,
      source: 'udp',
      lastSeen: d.lastSeen || now,
      advertising: true,
      paired: paired.has(String(id)),
    });
  }

  for (const d of listHomeyMdnsTuya(homey)) {
    if (!d.deviceId) continue;
    const key = String(d.deviceId);
    const existing = byId.get(key);
    if (existing) {
      existing.source = existing.source === 'udp' ? 'udp+mdns' : 'mdns';
      if (d.ip) existing.ip = d.ip;
      existing.paired = paired.has(key);
    } else {
      byId.set(key, {
        ...d,
        version: 'auto',
        paired: paired.has(key),
      });
    }
  }

  const devices = Array.from(byId.values()).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  return {
    timestamp: now,
    note: 'Tuya WiFi advertising via UDP 6666/6667/6668/7000 (+ Homey mDNS _tuya._tcp when present). Unpaired rows need local_key from SmartLife/IoT pairing.',
    stats: {
      total: devices.length,
      paired: devices.filter((d) => d.paired).length,
      unpaired: devices.filter((d) => !d.paired).length,
      udp: devices.filter((d) => String(d.source).includes('udp')).length,
      mdns: devices.filter((d) => String(d.source).includes('mdns')).length,
    },
    devices,
  };
}

/**
 * Annotate Zigbee mesh snapshot with advertising=true when recently heard.
 * Homey apps cannot discover unpaired Zigbee advertisers — only paired RX.
 */
function annotateZigbeeAdvertising(snapshot, opts = {}) {
  if (!snapshot || !Array.isArray(snapshot.nodes)) return snapshot;
  const now = opts.now || Date.now();
  const maxAge = opts.maxAgeMs || ADVERTISING_ZIGBEE_MAX_AGE_MS;
  let advertisingCount = 0;

  for (const n of snapshot.nodes) {
    if (n.role === 'coordinator') {
      n.advertising = true;
      continue;
    }
    const ageOk = typeof n.lastSeen === 'number' && (now - n.lastSeen) <= maxAge;
    const rxOk = (n.rxLastHour || 0) > 0 || (n.rxLast24h || 0) > 0;
    const onlineOk = n.online === true;
    n.advertising = !!(onlineOk && (ageOk || rxOk));
    if (n.advertising) advertisingCount += 1;
  }

  snapshot.stats = snapshot.stats || {};
  snapshot.stats.advertising = advertisingCount;
  snapshot.advertisingNote = 'Zigbee advertising = paired devices with recent RX/online. Unpaired join beacons are owned by Homey Zigbee stack (Add device).';
  return snapshot;
}

/**
 * Kick a short UDP burst so silent 3.5 devices advertise during pairing.
 */
async function burstWifiProbe(udpDiscovery, opts = {}) {
  if (!udpDiscovery || typeof udpDiscovery.burstProbe !== 'function') {
    if (udpDiscovery?.probeNow) await udpDiscovery.probeNow();
    return { probes: 1 };
  }
  return udpDiscovery.burstProbe({
    durationMs: opts.durationMs || BURST_PROBE_MS,
    intervalMs: opts.intervalMs || BURST_INTERVAL_MS,
  });
}

module.exports = {
  ADVERTISING_WIFI_MAX_AGE_MS,
  ADVERTISING_ZIGBEE_MAX_AGE_MS,
  BURST_PROBE_MS,
  buildWifiLanSnapshot,
  annotateZigbeeAdvertising,
  burstWifiProbe,
  collectPairedWifiIds,
};
