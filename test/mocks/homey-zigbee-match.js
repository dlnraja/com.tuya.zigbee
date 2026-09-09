'use strict';

/**
 * Homey Zigbee pairing match mock (P2436)
 * Homey requires driver endpoint clusters ⊆ device interview clusters.
 */

function normalizeClusters(list) {
  return [...new Set((list || []).map(Number))].sort((a, b) => a - b);
}

/**
 * @param {object} driverEndpoints - compose zigbee.endpoints
 * @param {object} deviceEndpoints - interview endpoints { "1": { inputClusters: [...] } }
 * @returns {{ ok: boolean, failures: string[] }}
 */
function simulateHomeyZigbeeMatch(driverEndpoints, deviceEndpoints) {
  const failures = [];
  for (const [epId, drv] of Object.entries(driverEndpoints || {})) {
    const deviceEp = deviceEndpoints[epId] || deviceEndpoints[Number(epId)];
    if (!deviceEp) {
      failures.push(`missing device endpoint ${epId}`);
      continue;
    }
    const deviceClusters = normalizeClusters(
      deviceEp.inputClusters || deviceEp.clusters || []
    );
    const driverClusters = normalizeClusters(drv.clusters || []);
    for (const c of driverClusters) {
      if (!deviceClusters.includes(c)) {
        failures.push(`ep${epId}: driver requires cluster ${c} absent on device [${deviceClusters}]`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

/** Build mock Homey device for cover/Moes unit tests */
function createMockCoverDevice(overrides = {}) {
  const settings = { ...(overrides.settings || {}) };
  const caps = new Set(overrides.capabilities || [
    'windowcoverings_state',
    'windowcoverings_set',
  ]);
  const device = {
    _destroyed: false,
    _isInternalSettingsSync: false,
    _coverMotionGuardUntil: 0,
    _coverMotionGuardState: null,
    logs: [],
    settings,
    getManufacturerName: () => overrides.mfr || '_TZE204_5slehgeo',
    getSetting: (k) => settings[k],
    getSettings: () => ({ ...settings }),
    getData: () => ({ manufacturerName: overrides.mfr || '_TZE204_5slehgeo', productId: 'TS0601' }),
    hasCapability: (c) => caps.has(c),
    removeCapability: async (c) => { caps.delete(c); },
    addCapability: async (c) => { caps.add(c); },
    setSettings: async (u) => { Object.assign(settings, u); },
    log: (...a) => { device.logs.push(a.join(' ')); },
    error: (...a) => { device.logs.push(`ERR ${a.join(' ')}`); },
    ...overrides.extra,
  };
  return device;
}

/** Mock DeviceIOFacade enum encoder (mirror of production 1-byte enum) */
function encodeTuyaEnumPayload(dp, value) {
  const dataBuf = Buffer.from([Number(value) & 0xff]);
  const payload = Buffer.alloc(6 + dataBuf.length);
  payload.writeUInt16BE(0, 0);
  payload.writeUInt8(Number(dp) & 0xff, 2);
  payload.writeUInt8(4, 3); // enum
  payload.writeUInt16BE(dataBuf.length, 4);
  dataBuf.copy(payload, 6);
  return payload;
}

module.exports = {
  simulateHomeyZigbeeMatch,
  createMockCoverDevice,
  encodeTuyaEnumPayload,
  normalizeClusters,
};
