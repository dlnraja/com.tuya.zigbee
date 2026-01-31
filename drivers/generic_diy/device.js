'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * GENERIC DIY ZIGBEE DEVICE - v5.7.0
 * Universal driver for ESP32-C6/H2, PTVO, CC253x, custom ZCL
 */

const CLUSTER_MAP = {
  0x0006: { cap: 'onoff', attr: 'onOff', multi: true },
  0x0008: { cap: 'dim', attr: 'currentLevel', div: 254 },
  0x0402: { cap: 'measure_temperature', attr: 'measuredValue', div: 100 },
  0x0405: { cap: 'measure_humidity', attr: 'measuredValue', div: 100 },
  0x0400: { cap: 'measure_luminance', attr: 'measuredValue' },
  0x0406: { cap: 'alarm_motion', attr: 'occupancy' },
  0x0001: { cap: 'measure_battery', attr: 'batteryPercentageRemaining', div: 2 },
  0x0500: { cap: 'alarm_contact', attr: 'zoneStatus' }
};

class GenericDIYDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[DIY] ═══════════════════════════════════════');
    this.log('[DIY] GENERIC DIY ZIGBEE v5.7.0');
    this.log('[DIY] ESP32 / PTVO / CC253x / Custom ZCL');
    this.log('[DIY] ═══════════════════════════════════════');

    this.zclNode = zclNode;
    this._caps = [];

    // Scan endpoints
    for (const [epId, ep] of Object.entries(zclNode.endpoints || {})) {
      if (epId === '242') continue;
      for (const cId of Object.keys(ep.clusters || {})) {
        const clusterId = parseInt(cId);
        const map = CLUSTER_MAP[clusterId];
        if (map) await this._addCap(parseInt(epId), clusterId, map, ep.clusters[cId]);
      }
    }

    // Setup listeners
    for (const c of this._caps) {
      await this._setupListener(c);
    }

    this.log(`[DIY] ✅ Done: ${this._caps.length} capabilities`);
  }

  async _addCap(epId, clusterId, map, cluster) {
    const capName = (map.multi && epId > 1) ? `${map.cap}.${epId}` : map.cap;
    if (this.hasCapability(capName)) return;

    try {
      await this.addCapability(capName);
      this._caps.push({ epId, clusterId, cap: capName, map, cluster });
      this.log(`[DIY] ✅ ${capName} (cluster 0x${clusterId.toString(16)})`);
    } catch (e) {
      this.error(`[DIY] ❌ ${capName}: ${e.message}`);
    }
  }

  async _setupListener({ epId, clusterId, cap, map, cluster }) {
    try {
      // OnOff cluster
      if (clusterId === 0x0006) {
        this.registerCapabilityListener(cap, async (v) => {
          v ? await cluster.setOn() : await cluster.setOff();
        });
        cluster.on('attr.onOff', (v) => this.setCapabilityValue(cap, v).catch(() => {}));
      }
      // Level cluster
      else if (clusterId === 0x0008) {
        this.registerCapabilityListener(cap, async (v) => {
          await cluster.moveToLevel({ level: Math.round(v * 254), transitionTime: 0 });
        });
        cluster.on('attr.currentLevel', (v) => this.setCapabilityValue(cap, v / 254).catch(() => {}));
      }
      // Measurement clusters
      else if (map.attr) {
        cluster.on(`attr.${map.attr}`, (v) => {
          const val = map.div ? v / map.div : v;
          this.setCapabilityValue(cap, val).catch(() => {});
        });
      }
    } catch (e) {
      this.error(`[DIY] Listener error: ${e.message}`);
    }
  }
}

module.exports = GenericDIYDevice;
