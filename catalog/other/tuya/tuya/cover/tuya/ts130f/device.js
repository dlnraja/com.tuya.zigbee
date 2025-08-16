#!/usr/bin/env node
'use strict';

'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

const CLUSTER = { WINDOW_COVERING: 0x0102 };
const ATTR = { CURRENT_POSITION_LIFT_PERCENTAGE: 0x0008 }; // 0..100 (0=open in ZCL spec, certains firmwares inversent)
const CMD = { UP_OPEN: 0x00, DOWN_CLOSE: 0x01, STOP: 0x02, GO_TO_LIFT_PERCENTAGE: 0x05 };

class TS130F_Device extends ZigBeeDevice {
  async onNodeInit() {
    this.log('TS130F init');

    // Cap → cluster wiring
    this.registerCapabilityListener('windowcoverings_set', async (value) => {
      // Homey: 0=open, 1=closed (float). Convert to 0..100 %
      let pct = Math.round((1 - value) * 100);
      if (this.getSetting('invert_direction')) pct = 100 - pct;
      await this.zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING]
        .command(CMD.GO_TO_LIFT_PERCENTAGE, { percentopen: pct }, { disableDefaultResponse: true })
        .catch(e => this.error('GO_TO_LIFT_PERCENTAGE failed', e));
    });

    // Map STOP if state toggled quickly (optional)
    this.registerCapabilityListener('windowcoverings_state', async (state) => {
      // noop: state is derived from position. Could map quick taps to STOP if needed.
      return;
    });

    // Report actual position → windowcoverings_set/windowcoverings_state
    try {
      await this.zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING]
        .bind(this.zclNode.endpoints[1]); // bind reporting
      await this.zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING]
        .configureReporting(ATTR.CURRENT_POSITION_LIFT_PERCENTAGE, 1, 300, 1);
    } catch (e) {
      this.log('reporting config skipped', e && e.message);
    }

    // Read initial
    this._updateFromCluster().catch(() => {});
    this.zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING].on('attr.currentPositionLiftPercentage', (pct) => {
      this._applyPct(pct);
    });
  }

  async _updateFromCluster() {
    try {
      const pct = await this.zclNode.endpoints[1].clusters[CLUSTER.WINDOW_COVERING]
        .readAttributes([ATTR.CURRENT_POSITION_LIFT_PERCENTAGE])
        .then(r => r[ATTR.CURRENT_POSITION_LIFT_PERCENTAGE]);
      this._applyPct(pct);
    } catch (e) {
      this.log('read position failed', e && e.message);
    }
  }

  _applyPct(pctRaw) {
    // ZCL spec: 0 = fully open, 100 = fully closed. Certains firmwares inversent. On normalise.
    let pct = typeof pctRaw === 'number' ? pctRaw : Number(pctRaw);
    if (Number.isNaN(pct)) return;

    if (this.getSetting('invert_direction')) pct = 100 - pct;

    const homeyVal = 1 - (pct / 100); // Homey 0..1 (0=open, 1=closed)
    this.setCapabilityValue('windowcoverings_set', Math.max(0, Math.min(1, homeyVal))).catch(() => {});
    const state = homeyVal <= 0.02 ? 'up' : (homeyVal >= 0.98 ? 'down' : 'idle');
    this.setCapabilityValue('windowcoverings_state', state).catch(() => {});
  }
}

module.exports = TS130F_Device;
