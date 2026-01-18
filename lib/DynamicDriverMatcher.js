'use strict';

/**
 * DYNAMIC DRIVER MATCHER - v5.5.670
 * Post-pairing re-matching to prevent zigbee generic fallback
 */

class DynamicDriverMatcher {
  constructor(device) {
    this.device = device;
  }

  async analyze() {
    const clusters = await this._getClusters();
    const mfr = this.device.getSetting?.('zb_manufacturer_name') || '';
    
    // Score drivers by cluster match
    const scores = {
      presence_sensor_radar: clusters.has(0xEF00) && mfr.match(/^_TZE/) ? 20 : 0,
      climate_sensor: clusters.has(0x0402) ? 15 : 0,
      contact_sensor: clusters.has(0x0500) ? 10 : 0,
    };
    
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    this.device.log(`[MATCHER] Best: ${best[0]} (${best[1]})`);
    return { recommended: best[0], score: best[1] };
  }

  async _getClusters() {
    const set = new Set();
    const eps = this.device.zclNode?.endpoints || {};
    for (const ep of Object.values(eps)) {
      Object.keys(ep.clusters || {}).forEach(c => set.add(parseInt(c) || c));
    }
    return set;
  }
}

module.exports = DynamicDriverMatcher;
