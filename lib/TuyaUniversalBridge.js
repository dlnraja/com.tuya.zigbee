'use strict';

const { CLUSTERS } = require('./constants/ZigbeeConstants.js');

const { EventEmitter } = require('events');

/**
 * TuyaUniversalBridge - v5.12.2
 * Connects ANY Tuya DP change or cluster event to Homey flow cards.
 * Handles all 6 DP types (raw/bool/value/string/enum/bitmap) and
 * all manufacturer clusters (0xE000-E006, 0xED00, 0xFCC0, 0x1888, etc.)
 */

const DP_TYPE_NAMES = { 0:'raw', 1:'bool', 2:'value', 3:'string', 4:'enum', 5:'bitmap' };

class TuyaUniversalBridge extends EventEmitter {
  constructor(device) {
    super();
    this.device = device;
    this._dpHistory = new Map();
    this._clusterHistory = [];
    this._flowCards = {};
    this._initialized = false;
  }

  log(...args) {
    if (this.device?.log) this.device.log('[BRIDGE]', ...args);
  }

  /**
   * Initialize bridge  register flow card listeners
   * Call from device.onNodeInit() AFTER super.onNodeInit()
   */
  async init() {
    if (this._initialized) return;
    this._initialized = true;

    // Ensure universal capabilities exist
    const caps = ['tuya_dp_raw', 'tuya_dp_value', 'tuya_dp_string', 'tuya_dp_bitmap', 'tuya_cluster_event'];
    for (const cap of caps) {
      if (!this.device.hasCapability(cap)) {
        try { await this.device.addCapability(cap); } catch {}
      }
    }

    // Register setable capability listeners for sending DP commands
    try {
      if (this.device.hasCapability('tuya_dp_value')) {
        this.device.registerCapabilityListener('tuya_dp_value', async (value) => {
          this.log('tuya_dp_value set:', value);
          return value;
        });
      }
      if (this.device.hasCapability('tuya_dp_string')) {
        this.device.registerCapabilityListener('tuya_dp_string', async (value) => {
          this.log('tuya_dp_string set:', value);
          return value;
        });
      }
    } catch (e) {
      this.log('Capability listener err:', e.message);
    }

    this.log('Universal bridge initialized');
  }

  /**
   * Handle ANY DP report  called from TuyaEF00Manager or BoundCluster callbacks
   * @param {number} dp - DP number
   * @param {any} value - Parsed value
   * @param {number} dpType - DP type (0-5)
   * @param {object} opts - { raw, cmdId }
   */
  onDP(dp, value, dpType, opts = {}) {
    const typeName = DP_TYPE_NAMES[dpType] || 'unknown';
    const prev = this._dpHistory.get(dp);
    const changed = prev === undefined || prev !== value;

    // Store history
    this._dpHistory.set(dp, value);

    // Update capabilities based on type
    this._updateCapability(dp, value, dpType, typeName);

    // Emit events for driver-specific handling
    this.emit('dp', { dp, value, dpType, typeName, changed, raw: opts.raw });
    this.emit(`dp-${dp}`, { value, dpType, typeName, changed });

    // Trigger flow cards
    if (changed) {
      this._triggerDPFlow(dp, value, dpType, typeName);
    }

    // Log for diagnostics
    if (changed) {
      this.log(`DP${dp} [${typeName}] = ${this._formatValue(value, dpType)}`);
    }
  }

  /**
   * Handle cluster event from any manufacturer cluster
   */
  onClusterEvent(clusterId, cmdId, data) {
    const event = {
      cluster: clusterId,
      clusterHex: '0x' + clusterId.toString(16).toUpperCase(),
      cmd: cmdId,
      data: data,
      ts: Date.now()
    };

    this._clusterHistory.push(event);
    if (this._clusterHistory.length > 50) this._clusterHistory.shift();

    // Update cluster event capability
    const summary = `${event.clusterHex}:cmd${cmdId}`;
    this.device.setCapabilityValue('tuya_cluster_event', summary).catch(() => {});

    // Emit for driver handling
    this.emit('cluster', event);
    this.emit(`cluster-${clusterId}`, event);

    // Trigger flow
    this._triggerClusterFlow(event);

    this.log(`Cluster ${event.clusterHex} cmd:${cmdId}`);
  }

  /**
   * Update the right capability based on DP type
   */
  _updateCapability(dp, value, dpType, typeName) {
    try {
      switch (dpType) {
      case 0: // raw
        if (Buffer.isBuffer(value)) {
          this.device.setCapabilityValue('tuya_dp_raw', `DP${dp}:${value.toString('hex')}`).catch(() => {});
        } else {
          this.device.setCapabilityValue('tuya_dp_raw', `DP${dp}:${JSON.stringify(value)}`).catch(() => {});
        }
        break;
      case 1: // bool
      case 2: // value
      case 4: // enum
        if (typeof value === 'number' || typeof value === 'boolean') {
          this.device.setCapabilityValue('tuya_dp_value', Number(value).catch(() => {}));
        }
        break;
      case 3: // string
        this.device.setCapabilityValue('tuya_dp_string', String(value).catch(() => {}));
        break;
      case 5: // bitmap
        this.device.setCapabilityValue('tuya_dp_bitmap', Number(value).catch(() => {}));
        break;
      }
    } catch {}
  }

  /**
   * Trigger DP change flow card
   */
  _triggerDPFlow(dp, value, dpType, typeName) {
    try {
      const card = this.device._getFlowCard('tuya_dp_changed', 'trigger');
      if (card) {
        const tokens = {
          dp_number: dp,
          dp_value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          dp_type: typeName,
          dp_numeric: typeof value === 'number' ? value : (typeof value === 'boolean' ? (value ? 1 : 0) : 0)
        };
        card.trigger(this.device, tokens, {}).catch(() => {});
      }
    } catch {}

    // Also trigger type-specific cards
    try {
      if (dpType === 5) {
        const card = this.device._getFlowCard('tuya_bitmap_changed', 'trigger');
        if (card) {
          card.trigger(this.device, { dp_number: dp, bitmap: Number(value) }, {}).catch(() => {});
        }
      }
      if (dpType === 0) {
        const card = this.device._getFlowCard('tuya_raw_received', 'trigger');
        if (card) {
          const hex = Buffer.isBuffer(value) ? value.toString('hex') : String(value);
          card.trigger(this.device, { dp_number: dp, raw_hex: hex }, {}).catch(() => {});
        }
      }
    } catch {}
  }

  /**
   * Trigger cluster event flow card
   */
  _triggerClusterFlow(event) {
    try {
      const card = this.device._getFlowCard('tuya_cluster_received', 'trigger');
      if (card) {
        const tokens = {
          cluster_id: event.clusterHex,
          command_id: event.cmd,
          data_hex: Buffer.isBuffer(event.data) ? event.data.toString('hex') : String(event.data || '')
        };
        card.trigger(this.device, tokens, {}).catch(() => {});
      }
    } catch {}
  }

  /**
   * Send a DP command to the device
   * @param {number} dp - DP number
   * @param {any} value - Value to send
   * @param {string} type - 'bool'|'value'|'enum'|'string'|'raw'|'bitmap'
   */
  async sendDP(dp, value, type) {
    const typeMap = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };
    const dpType = typeMap[type] || 2;

    // Try via TuyaEF00Manager first
    const mgr = this.device._tuyaEF00Manager || this.device.tuyaEF00Manager;
    if (mgr && typeof mgr.sendTuyaDP === 'function') {
      return mgr.sendTuyaDP(dp, dpType, value);
    }

    // Try via sendTuyaCommand (TuyaSpecificClusterDevice)
    if (typeof this.device.sendTuyaCommand === 'function') {
      return this.device.sendTuyaCommand(dp, value, type);
    }

    // Fallback: raw frame via cluster
    const ep = this.device.zclNode?.endpoints?.[1];
    const cluster = ep?.clusters?.tuya || ep?.clusters?.[CLUSTERS.TUYA_EF00] || ep?.clusters?.[CLUSTERS.TUYA_EF00];
    if (cluster && typeof cluster.dataRequest === 'function') {
      const { TuyaDPParser } = require('./tuya/TuyaDPParser');
      const buf = TuyaDPParser.encode(dp, dpType, value);
      return cluster.dataRequest({ data: buf });
    }

    this.log('No send method available for DP', dp);
    return false;
  }

  _formatValue(v, dpType) {
    if (Buffer.isBuffer(v)) return 'hex:' + v.toString('hex');
    if (typeof v === 'boolean') return v ? 'ON' : 'OFF';
    if (typeof v === 'number' && dpType === 5) return '0b' + v.toString(2).padStart(8, '0');
    return String(v);
  }

  getDPHistory() { return Object.fromEntries(this._dpHistory); }
  getClusterHistory() { return [...this._clusterHistory]; }
}

module.exports = TuyaUniversalBridge;




