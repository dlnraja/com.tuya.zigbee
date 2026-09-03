'use strict';

/**
 * ZigbeeMeshMap — settings spider-web snapshot (MASTER_ONLY)
 *
 * WHY: Homey users want a Z2M-style mesh view without leaving App Settings.
 * HOW: Passive scan of this app's paired devices + zclNode LQI/RSSI already
 *      known to Homey. Never sends ZDO Mgmt_LQI (would flood sleepy mesh).
 * WHO: Homey Pro user on master/preview. Not a Homey system-wide map.
 * WHEN: GET /zigbee-map from settings HTML.
 * AGAINST: Active neighbor-table reads; inventing parent links as "real hops".
 *
 * Homey does not expose the coordinator neighbor table to apps the way
 * zigbee2mqtt does. Edges are last-hop quality to Homey, plus inferred
 * zone-router parents for a retractable spider layout — marked inferred.
 */

const COORDINATOR_ID = 'homey';

function safe(fn, fallback) {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch (_e) {
    return fallback;
  }
}

function firstNumber(...values) {
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function lqiBand(lqi) {
  if (lqi == null) return 'unknown';
  if (lqi >= 200) return 'excellent';
  if (lqi >= 150) return 'good';
  if (lqi >= 100) return 'fair';
  if (lqi >= 50) return 'poor';
  return 'bad';
}

function extractIeee(device) {
  return safe(() => device.zclNode && (device.zclNode.ieeeAddr || device.zclNode.ieeeAddress), null)
    || safe(() => device.getData && (device.getData().ieeeAddress || device.getData().ieeeAddr), null)
    || null;
}

function extractLqi(device) {
  const node = device && device.zclNode;
  const ep1 = node && node.endpoints && (node.endpoints[1] || node.endpoints['1']);
  const firstEp = ep1 || (node && node.endpoints && Object.values(node.endpoints)[0]);
  return firstNumber(
    device && device._lastLQI,
    node && node.lastHopLqi,
    node && node.lqi,
    firstEp && firstEp.LQI,
    firstEp && firstEp.lqi
  );
}

function extractRssi(device) {
  const node = device && device.zclNode;
  const ep1 = node && node.endpoints && (node.endpoints[1] || node.endpoints['1']);
  const firstEp = ep1 || (node && node.endpoints && Object.values(node.endpoints)[0]);
  return firstNumber(
    node && node.lastHopRssi,
    node && node.rssi,
    firstEp && firstEp.RSSI,
    firstEp && firstEp.rssi
  );
}

function extractParentIeee(device) {
  const node = device && device.zclNode;
  return safe(() => node && (node.parentIeeeAddr || node.parentAddress || node.parentIeee), null)
    || safe(() => device.getStoreValue && device.getStoreValue('zb_parent_ieee'), null)
    || null;
}

function isBatteryDevice(device) {
  if (safe(() => device.mainsPowered === true, false)) return false;
  const caps = safe(() => device.getCapabilities && device.getCapabilities(), []) || [];
  return caps.includes('measure_battery') || caps.includes('alarm_battery');
}

function isOnline(device) {
  const available = safe(() => (typeof device.getAvailable === 'function' ? device.getAvailable() : true), true);
  return available !== false;
}

function collectDevices(homey) {
  const out = [];
  const drivers = safe(() => homey.drivers.getDrivers(), {}) || {};
  for (const driverId of Object.keys(drivers)) {
    const driver = drivers[driverId];
    const devices = safe(() => driver.getDevices(), []) || [];
    const list = Array.isArray(devices) ? devices : Object.values(devices);
    for (const device of list) {
      out.push({ device, driverId: safe(() => device.getDriver && device.getDriver().getId(), driverId) || driverId });
    }
  }
  return out;
}

function inferParents(nodes) {
  const byIeee = new Map();
  for (const n of nodes) {
    if (n.ieee) byIeee.set(String(n.ieee).toLowerCase(), n.id);
  }
  const routers = nodes.filter((n) => n.role === 'router' && n.online);

  for (const n of nodes) {
    if (n.role === 'coordinator') continue;

    if (n.parentIeee) {
      const hit = byIeee.get(String(n.parentIeee).toLowerCase());
      if (hit && hit !== n.id) {
        n.parentId = hit;
        n.parentKind = 'reported';
        continue;
      }
    }

    if (n.role === 'router') {
      n.parentId = COORDINATOR_ID;
      n.parentKind = 'star';
      continue;
    }

    const zoneRouters = routers.filter((r) => r.zone && r.zone === n.zone && r.id !== n.id);
    if (zoneRouters.length > 0) {
      zoneRouters.sort((a, b) => (b.lqi || 0) - (a.lqi || 0));
      n.parentId = zoneRouters[0].id;
      n.parentKind = 'inferred';
      continue;
    }

    n.parentId = COORDINATOR_ID;
    n.parentKind = 'star';
  }
}

function buildSnapshot(homey, options = {}) {
  const now = Date.now();
  const availabilityManager = options.availabilityManager || safe(() => homey.__tuyaApp && homey.__tuyaApp.availabilityManager, null);

  const coordinatorIeee = safe(() => homey.zigbee && (homey.zigbee.ieeeAddress || homey.zigbee.address), null);
  const nodes = [{
    id: COORDINATOR_ID,
    name: 'Homey',
    zone: '',
    driverId: '',
    role: 'coordinator',
    online: true,
    lqi: 255,
    rssi: null,
    ieee: coordinatorIeee,
    parentId: null,
    parentIeee: null,
    parentKind: null,
    battery: null,
    lastSeen: now,
    band: 'excellent',
  }];

  for (const { device, driverId } of collectDevices(homey)) {
    const id = safe(() => device.getId && device.getId(), null)
      || safe(() => device.getData && device.getData().id, null)
      || safe(() => device.id, null);
    if (!id) continue;

    const battery = isBatteryDevice(device);
    const availEntry = availabilityManager && availabilityManager._devices && availabilityManager._devices.get(id);
    const lastSeen = (availEntry && availEntry.lastSeen) || now;
    const online = isOnline(device) && !(availEntry && availEntry.unavailableSince);
    const lqi = extractLqi(device);
    const rssi = extractRssi(device);

    nodes.push({
      id,
      name: safe(() => device.getName && device.getName(), id) || id,
      zone: safe(() => device.getZone && device.getZone() && device.getZone().getName && device.getZone().getName(), '') || '',
      driverId,
      role: battery ? 'end_device' : 'router',
      online,
      lqi,
      rssi,
      ieee: extractIeee(device),
      parentId: null,
      parentIeee: extractParentIeee(device),
      parentKind: null,
      battery: battery
        ? firstNumber(safe(() => device.getCapabilityValue && device.getCapabilityValue('measure_battery'), null))
        : null,
      lastSeen,
      rxLastHour: (availEntry && typeof availabilityManager._rxLastHour === 'function')
        ? availabilityManager._rxLastHour(availEntry) : 0,
      rxLast24h: (availEntry && typeof availabilityManager._rxLast24h === 'function')
        ? availabilityManager._rxLast24h(availEntry) : 0,
      band: lqiBand(lqi),
    });
  }

  inferParents(nodes);

  const edges = [];
  for (const n of nodes) {
    if (!n.parentId) continue;
    edges.push({
      source: n.parentId,
      target: n.id,
      lqi: n.lqi,
      kind: n.parentKind || 'star',
    });
  }

  const routers = nodes.filter((n) => n.role === 'router').length;
  const endDevices = nodes.filter((n) => n.role === 'end_device').length;
  const online = nodes.filter((n) => n.role !== 'coordinator' && n.online).length;
  const weak = nodes.filter((n) => n.role !== 'coordinator' && (n.band === 'poor' || n.band === 'bad' || !n.online)).length;
  const deviceLqi = nodes.filter((n) => n.role !== 'coordinator' && typeof n.lqi === 'number').map((n) => n.lqi);
  const averageLqi = deviceLqi.length
    ? Math.round(deviceLqi.reduce((a, b) => a + b, 0) / deviceLqi.length)
    : null;

  let availability = null;
  if (availabilityManager && typeof availabilityManager.getSettingsSnapshot === 'function') {
    try {
      availability = availabilityManager.getSettingsSnapshot();
    } catch (_e) {
      availability = null;
    }
  }

  const snapshot = {
    coordinatorId: COORDINATOR_ID,
    inferred: true,
    note: 'Homey apps cannot read the full Zigbee neighbor table. This spider uses last-hop LQI plus zone-router grouping — collapse a node to hide its children.',
    timestamp: now,
    stats: {
      total: nodes.length - 1,
      routers,
      endDevices,
      online,
      offline: Math.max(0, nodes.length - 1 - online),
      weak,
      averageLqi,
      busiestName: availability && availability.traffic && availability.traffic.busiest
        ? availability.traffic.busiest.name : null,
      busiestRx24h: availability && availability.traffic && availability.traffic.busiest
        ? availability.traffic.busiest.last24h : 0,
    },
    availability,
    nodes,
    edges,
  };

  // P2410: mark paired nodes that are currently advertising (recent RX / online)
  try {
    const { annotateZigbeeAdvertising } = require('../discovery/AutonomousAdvertisingDiscovery');
    annotateZigbeeAdvertising(snapshot, { now });
  } catch (_e) { /* optional on tracks without module */ }

  return snapshot;
}

function ingestCollector(collector, snapshot) {
  if (!collector || !snapshot) return;
  try {
    collector.registerDevice({
      ieeeAddr: snapshot.coordinatorId,
      type: 'coordinator',
      modelId: 'Homey',
      lqi: 255,
      depth: 0,
    });
    for (const n of snapshot.nodes) {
      if (n.role === 'coordinator') continue;
      collector.registerDevice({
        ieeeAddr: n.ieee || n.id,
        type: n.role,
        modelId: n.driverId,
        lqi: n.lqi,
        rssi: n.rssi,
        depth: n.role === 'router' ? 1 : 2,
        parentAddr: n.parentId,
      });
    }
  } catch (_e) { /* non-critical */ }
}

module.exports = {
  COORDINATOR_ID,
  lqiBand,
  inferParents,
  buildSnapshot,
  ingestCollector,
};
