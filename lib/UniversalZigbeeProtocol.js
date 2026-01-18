'use strict';

/**
 * UniversalZigbeeProtocol v4.0 - Complete Universal Zigbee Stack
 * v5.5.657: Full universal engine (ZCL + DP + private clusters)
 * 
 * Architecture: ONE universal engine interpreting ALL Zigbee variants
 * - ZCL standard clusters
 * - Tuya DP (0xEF00)
 * - Manufacturer private clusters (0xFC00-0xFFFE)
 * - ZHA/ZLL/SE/GP profiles
 * - Time sync with UTC + timezone + DST
 */

const PROFILES = { ZHA: 0x0104, ZLL: 0xC05E, SE: 0x0109, GP: 0xA1E0 };

const MFR_CLUSTERS = {
  TUYA: 0xEF00, TUYA_IR: 0xED00, XIAOMI: 0xFCC0, AQARA: 0xFCC0,
  PHILIPS: 0xFC00, IKEA: 0xFC7C, OSRAM: 0xFC0F, LEGRAND: 0xFC01,
  DANFOSS: 0xFC03, HEIMAN: 0xE001, SCHNEIDER: 0xFC40, BOSCH: 0xFCAC,
  DEVELCO: 0xFC82, CENTRALITE: 0xFC45, SINOPE: 0xFF01, UBISYS: 0xFD00,
  SALUS: 0xFC10, EUROTRONIC: 0xFF00, SAMSUNG: 0xFC02, SMARTTHINGS: 0xFC02,
  LIDL: 0xFC41, SILVERCREST: 0xFC41, MOES: 0xEF00, ZEMISMART: 0xEF00
};

const ZCL_CLUSTERS = {
  BASIC: 0x0000, POWER_CFG: 0x0001, ON_OFF: 0x0006, LEVEL: 0x0008,
  TIME: 0x000A, OTA: 0x0019, DOOR_LOCK: 0x0101, WINDOW: 0x0102,
  THERMOSTAT: 0x0201, COLOR: 0x0300, ILLUMINANCE: 0x0400,
  TEMPERATURE: 0x0402, HUMIDITY: 0x0405, OCCUPANCY: 0x0406,
  IAS_ZONE: 0x0500, IAS_ACE: 0x0501, IAS_WD: 0x0502,
  METERING: 0x0702, ELECTRICAL: 0x0B04, IDENTIFY: 0x0003,
  GROUPS: 0x0004, SCENES: 0x0005, FAN: 0x0202, PRESSURE: 0x0403
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

  // v5.5.657: Complete Time Sync Engine (UTC + timezone + DST)
  async syncMcuTime(opts = {}) {
    const now = new Date();
    const utc = Math.floor(now.getTime() / 1000);
    const tzOffset = now.getTimezoneOffset() * -60;
    const local = utc + tzOffset;
    const isDST = this._isDST(now);
    
    const timeData = {
      utc, local, tzOffset,
      isDST, tzName: 'Europe/Paris',
      year: now.getUTCFullYear(), month: now.getUTCMonth() + 1,
      day: now.getUTCDate(), hour: now.getUTCHours(),
      minute: now.getUTCMinutes(), second: now.getUTCSeconds()
    };
    
    this.log(`[TIME-SYNC] UTC=${utc} Local=${local} TZ=${tzOffset} DST=${isDST}`);
    return timeData;
  }

  _isDST(d) {
    const jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset();
    const jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset();
    return d.getTimezoneOffset() < Math.max(jan, jul);
  }

  // v5.5.657: Respond to time requests (ZCL Time read, DP, MCU sync)
  async handleTimeRequest(source = 'unknown') {
    this.log(`[TIME-REQ] Source: ${source}`);
    return await this.syncMcuTime();
  }

  // v5.5.652: Bind cluster
  async bindCluster(clusterId, epId = 1) {
    try {
      const ep = this.device.zclNode?.endpoints?.[epId];
      if (!ep?.bind) return false;
      await ep.bind(clusterId);
      this.log(`[BIND] Bound cluster 0x${clusterId.toString(16)}`);
      return true;
    } catch (e) { return false; }
  }

  // v5.5.653: ZCL command handlers
  async sendOnOff(on, epId = 1) {
    try {
      const ep = this.device.zclNode?.endpoints?.[epId];
      const cl = ep?.clusters?.onOff;
      if (!cl) return false;
      await (on ? cl.setOn() : cl.setOff());
      return true;
    } catch (e) { return false; }
  }

  async sendLevel(level, epId = 1) {
    try {
      const ep = this.device.zclNode?.endpoints?.[epId];
      const cl = ep?.clusters?.levelControl;
      if (!cl) return false;
      await cl.moveToLevel({ level: Math.round(level * 254), transitionTime: 0 });
      return true;
    } catch (e) { return false; }
  }

  async readAttribute(clusterId, attrId, epId = 1) {
    try {
      const ep = this.device.zclNode?.endpoints?.[epId];
      for (const [, cl] of Object.entries(ep?.clusters || {})) {
        if ((cl.ID || cl.clusterId) === clusterId && cl.readAttributes) {
          return await cl.readAttributes([attrId]);
        }
      }
    } catch (e) { this.log('[READ] Error:', e.message); }
    return null;
  }

  // v5.5.654: Generate driver config from learned profile
  generateDriverConfig(learned) {
    if (!learned) return null;
    const config = {
      id: `auto_${learned.mfr}_${learned.model}`.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      name: { en: `${learned.mfr} ${learned.model}` },
      class: this._inferDeviceClass(learned.caps),
      capabilities: learned.caps,
      zigbee: {
        manufacturerName: [learned.mfr],
        productId: [learned.model],
        endpoints: { 1: { clusters: this._inferClusters(learned.caps) } }
      }
    };
    this.log('[DRIVER-GEN]', JSON.stringify(config));
    return config;
  }

  _inferDeviceClass(caps) {
    if (caps.includes('onoff') && caps.includes('dim')) return 'light';
    if (caps.includes('onoff')) return 'socket';
    if (caps.includes('measure_temperature')) return 'sensor';
    if (caps.includes('alarm_contact')) return 'sensor';
    if (caps.includes('target_temperature')) return 'thermostat';
    return 'other';
  }

  _inferClusters(caps) {
    const clusters = [];
    if (caps.includes('onoff')) clusters.push('genOnOff');
    if (caps.includes('dim')) clusters.push('genLevelCtrl');
    if (caps.includes('measure_temperature')) clusters.push('msTemperatureMeasurement');
    if (caps.includes('measure_humidity')) clusters.push('msRelativeHumidity');
    if (caps.includes('alarm_contact')) clusters.push('ssIasZone');
    if (caps.includes('measure_battery')) clusters.push('genPowerCfg');
    return clusters;
  }

  // v5.5.655: Safe Flow trigger
  safeFlowTrigger(cardId, tokens = {}) {
    try {
      const card = this.device.homey?.flow?.getDeviceTriggerCard?.(cardId);
      if (card) { card.trigger(this.device, tokens).catch(() => {}); return true; }
    } catch (e) { }
    return false;
  }

  // v5.5.655: Safe capability set
  async safeCap(cap, val) {
    try { if (this.device.hasCapability?.(cap)) await this.device.setCapabilityValue(cap, val); }
    catch (e) { this.log(`[CAP] Error ${cap}:`, e.message); }
  }

  // v5.5.657: Universal DP parser
  parseDP(dpId, dpType, dpValue) {
    const types = { 0: 'raw', 1: 'bool', 2: 'value', 3: 'string', 4: 'enum', 5: 'bitmap' };
    this.log(`[DP] DP${dpId} type=${types[dpType]||dpType} val=${JSON.stringify(dpValue)}`);
    return { dpId, dpType, value: dpValue, typeName: types[dpType] || 'unknown' };
  }

  // v5.5.657: Log unknown DP for future enrichment
  logUnknownDP(dpId, data) {
    this.log(`[UNKNOWN-DP] DP${dpId} data=${JSON.stringify(data)} - ADD TO MAPPING`);
  }

  // v5.5.658: Flow debounce (1 action = 1 event)
  debouncedFlow(cardId, tokens = {}, delayMs = 300) {
    const key = `${cardId}_${JSON.stringify(tokens)}`;
    if (this._flowDebounce?.[key]) return false;
    this._flowDebounce = this._flowDebounce || {};
    this._flowDebounce[key] = true;
    setTimeout(() => delete this._flowDebounce[key], delayMs);
    return this.safeFlowTrigger(cardId, tokens);
  }

  // v5.5.658: Hybrid data handler (ZCL + DP + private)
  handleHybridData(source, clusterId, data) {
    this.log(`[HYBRID] src=${source} cluster=0x${clusterId?.toString(16)||'?'}`);
    if (clusterId === 0xEF00) return this._handleTuyaDP(data);
    if (this.isManufacturerCluster(clusterId)) return this._handlePrivate(clusterId, data);
    return this._handleZCL(clusterId, data);
  }

  _handleTuyaDP(data) {
    if (data?.dp !== undefined) return this.parseDP(data.dp, data.dataType, data.data);
    return { source: 'tuya', raw: data };
  }

  _handlePrivate(cid, data) {
    this.log(`[PRIVATE] cluster=0x${cid.toString(16)} mfr=${this.getManufacturerName(cid)}`);
    return { source: 'private', clusterId: cid, data };
  }

  _handleZCL(cid, data) {
    return { source: 'zcl', clusterId: cid, data };
  }

  // v5.5.659: Intelligent fallback (NEVER generic zigbee)
  async intelligentFallback() {
    const analysis = await this.analyzeDevice();
    if (analysis.error) return { fallback: 'none', reason: analysis.error };
    
    const caps = [];
    for (const ep of Object.values(analysis.endpoints || {})) {
      for (const c of [...(ep.input || []), ...(ep.manufacturer || [])]) {
        const id = c.id;
        if (id === 0x0006) caps.push('onoff');
        if (id === 0x0008) caps.push('dim');
        if (id === 0x0300) caps.push('light_hue', 'light_saturation');
        if (id === 0x0402) caps.push('measure_temperature');
        if (id === 0x0405) caps.push('measure_humidity');
        if (id === 0x0406) caps.push('alarm_motion');
        if (id === 0x0500) caps.push('alarm_contact', 'alarm_tamper');
        if (id === 0x0001) caps.push('measure_battery');
        if (id === 0x0102) caps.push('windowcoverings_set');
        if (id === 0x0201) caps.push('target_temperature');
        if (id === 0x0702) caps.push('measure_power', 'meter_power');
        if (id === 0xEF00) caps.push('tuya_dp');
      }
    }
    
    const uniqueCaps = [...new Set(caps)];
    this.log(`[FALLBACK] Inferred caps: ${uniqueCaps.join(', ')}`);
    return { fallback: 'enriched', capabilities: uniqueCaps, profile: analysis.profile };
  }

  // v5.5.659: Auto-register capabilities from analysis
  async autoRegisterCapabilities() {
    const fb = await this.intelligentFallback();
    if (fb.fallback !== 'enriched') return false;
    
    for (const cap of fb.capabilities) {
      if (!this.device.hasCapability?.(cap)) {
        try { await this.device.addCapability?.(cap); this.log(`[AUTO-CAP] Added ${cap}`); }
        catch (e) { }
      }
    }
    return true;
  }

  // v5.5.660: MCU Full Sync (time included)
  async handleMcuFullSync() {
    this.log('[MCU-SYNC] Full state request');
    return await this.syncMcuTime();
  }

  // v5.5.660: Button event (NOT toggle)
  triggerButtonEvent(btn, action = 'single') {
    this.log(`[BTN] Button ${btn} ${action}`);
    return this.debouncedFlow(`button_${btn}_${action}`, { button: btn });
  }

  // v5.5.661: Cluster-to-Brand mapping matrix
  static CLUSTER_BRAND_MAP = {
    0xEF00: ['Tuya', 'SmartLife', 'Moes', 'Zemismart', 'Lonsonho', 'BlitzWolf'],
    0xED00: ['Tuya IR', 'Universal IR'],
    0xFCC0: ['Xiaomi', 'Aqara', 'Lumi'],
    0xFC00: ['Philips', 'Hue', 'Signify'],
    0xFC7C: ['IKEA', 'Tradfri'],
    0xFC0F: ['OSRAM', 'Ledvance', 'Sylvania'],
    0xFC01: ['Legrand', 'Netatmo', 'BTicino'],
    0xFC03: ['Danfoss', 'Philips Hue'],
    0xE001: ['Heiman', 'SmartHome'],
    0xFC40: ['Schneider', 'Wiser'],
    0xFCAC: ['Bosch', 'Robert Bosch'],
    0xFC82: ['Develco', 'Frient'],
    0xFC45: ['Centralite', 'Iris', 'SmartThings'],
    0xFF01: ['Sinope', 'Xiaomi Alt'],
    0xFD00: ['Ubisys'],
    0xFC10: ['Salus', 'Computime'],
    0xFF00: ['Eurotronic'],
    0xFC02: ['Samsung', 'SmartThings'],
    0xFC41: ['Lidl', 'Silvercrest', 'Livarno'],
    0xFC11: ['Sonoff', 'eWeLink', 'SNZB'],
    0xFC31: ['Leedarson', 'Sengled'],
    0xFCA0: ['Innr', 'Feilo'],
    0xFCBB: ['Gledopto', 'ZigBee-CCT']
  };

  // v5.5.661: Get brands for cluster
  getBrandsForCluster(clusterId) {
    return UniversalZigbeeProtocol.CLUSTER_BRAND_MAP[clusterId] || [];
  }

  // v5.5.661: Detect brand from clusters
  detectBrandFromClusters(clusters) {
    for (const cid of clusters) {
      const brands = this.getBrandsForCluster(cid);
      if (brands.length) return brands[0];
    }
    return 'Unknown';
  }

  // v5.5.663: Anti-duplication correlation ID per endpoint
  _correlationIds = new Map();
  
  generateCorrelationId(endpoint, eventType) {
    return `${endpoint}_${eventType}_${Date.now()}`;
  }

  isDuplicateEvent(endpoint, eventType, value, windowMs = 300) {
    const key = `${endpoint}_${eventType}`;
    const last = this._correlationIds.get(key);
    const now = Date.now();
    if (last && last.value === value && (now - last.time) < windowMs) {
      this.log(`[DEDUP] Filtered duplicate: ${key}=${value}`);
      return true;
    }
    this._correlationIds.set(key, { value, time: now });
    return false;
  }

  clearCorrelationId(endpoint, eventType) {
    this._correlationIds.delete(`${endpoint}_${eventType}`);
  }
}

module.exports = { UniversalZigbeeProtocol, PROFILES, MFR_CLUSTERS, ZCL_CLUSTERS };
