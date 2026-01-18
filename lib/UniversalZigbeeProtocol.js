'use strict';

/**
 * UniversalZigbeeProtocol v2.0 - All Zigbee protocols support
 */

const PROFILES = { ZHA: 0x0104, ZLL: 0xC05E, SE: 0x0109 };

const MFR_CLUSTERS = {
  TUYA: 0xEF00, XIAOMI: 0xFCC0, PHILIPS: 0xFC00, IKEA: 0xFC7C,
  OSRAM: 0xFC0F, LEGRAND: 0xFC01, DANFOSS: 0xFC03, HEIMAN: 0xE001,
  SCHNEIDER: 0xFC40, BOSCH: 0xFCAC, DEVELCO: 0xFC82, CENTRALITE: 0xFC45,
  SINOPE: 0xFF01, UBISYS: 0xFD00, SALUS: 0xFC10, EUROTRONIC: 0xFF00
};

const ZCL_CLUSTERS = {
  BASIC: 0x0000, POWER_CFG: 0x0001, ON_OFF: 0x0006, LEVEL: 0x0008,
  TIME: 0x000A, OTA: 0x0019, DOOR_LOCK: 0x0101, WINDOW: 0x0102,
  THERMOSTAT: 0x0201, COLOR: 0x0300, ILLUMINANCE: 0x0400,
  TEMPERATURE: 0x0402, HUMIDITY: 0x0405, OCCUPANCY: 0x0406,
  IAS_ZONE: 0x0500, IAS_ACE: 0x0501, IAS_WD: 0x0502,
  METERING: 0x0702, ELECTRICAL: 0x0B04
};

class UniversalZigbeeProtocol {
  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
  }

  detectProfile(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const pid = ep1?.profileId || 0x0104;
    return pid === 0xC05E ? 'ZLL' : pid === 0x0109 ? 'SE' : 'ZHA';
  }

  isManufacturerCluster(clusterId) {
    return clusterId >= 0xFC00 && clusterId <= 0xFFFF;
  }

  getManufacturerName(clusterId) {
    for (const [name, id] of Object.entries(MFR_CLUSTERS)) {
      if (id === clusterId) return name;
    }
    return clusterId >= 0xFC00 ? `PRIVATE_${clusterId.toString(16)}` : 'STANDARD';
  }

  async analyzeDevice() {
    const zclNode = this.device.zclNode;
    if (!zclNode) return { error: 'No ZCL node' };
    
    const result = {
      profile: this.detectProfile(zclNode),
      manufacturer: this.device.getSetting?.('zb_manufacturer_name') || 'Unknown',
      model: this.device.getSetting?.('zb_product_id') || 'Unknown',
      endpoints: {},
      capabilities: []
    };

    for (const [epId, ep] of Object.entries(zclNode.endpoints || {})) {
      result.endpoints[epId] = this._analyzeEndpoint(ep);
    }
    
    this.log('[ZIGBEE] Analysis:', JSON.stringify(result));
    return result;
  }

  _analyzeEndpoint(ep) {
    const clusters = { input: [], output: [], manufacturer: [] };
    for (const [name, cluster] of Object.entries(ep.clusters || {})) {
      const id = cluster.ID || cluster.clusterId;
      if (this.isManufacturerCluster(id)) {
        clusters.manufacturer.push({ name, id, mfr: this.getManufacturerName(id) });
      } else {
        clusters.input.push({ name, id });
      }
    }
    return clusters;
  }

  async registerUnknownClusterHandler(clusterId, handler) {
    const zclNode = this.device.zclNode;
    if (!zclNode) return false;
    
    for (const ep of Object.values(zclNode.endpoints || {})) {
      for (const [name, cluster] of Object.entries(ep.clusters || {})) {
        if ((cluster.ID || cluster.clusterId) === clusterId) {
          cluster.on('attr', (attr, value) => handler(attr, value, cluster));
          this.log(`[ZIGBEE] Registered handler for cluster 0x${clusterId.toString(16)}`);
          return true;
        }
      }
    }
    return false;
  }

  // v5.5.651: Profile learning
  async learnProfile() {
    const a = await this.analyzeDevice();
    if (a.error) return null;
    const learned = { ts: Date.now(), mfr: a.manufacturer, model: a.model, profile: a.profile, caps: [] };
    for (const ep of Object.values(a.endpoints)) {
      for (const c of [...ep.input, ...ep.manufacturer]) {
        const id = c.id;
        if (id === 0x0006) learned.caps.push('onoff');
        if (id === 0x0008) learned.caps.push('dim');
        if (id === 0x0402) learned.caps.push('measure_temperature');
        if (id === 0x0405) learned.caps.push('measure_humidity');
        if (id === 0x0500) learned.caps.push('alarm_contact');
        if (id === 0x0001) learned.caps.push('measure_battery');
      }
    }
    learned.caps = [...new Set(learned.caps)];
    this.log('[LEARN]', JSON.stringify(learned));
    return learned;
  }
}

module.exports = { UniversalZigbeeProtocol, PROFILES, MFR_CLUSTERS, ZCL_CLUSTERS };
