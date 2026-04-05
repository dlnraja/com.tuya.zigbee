'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

/**
 * Button8GangDevice - v5.8.16 Enhanced
 *
 * FIX v5.2.92: Was incorrectly extending HybridDevice
 * FIX v5.8.16: Added cluster 0xE000 + tuyaE000 support
 *
 * Handles single/double/long press for 8 buttons
 */
class Button8GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           BUTTON 8-GANG v5.8.16 - E000 ENHANCED                   ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    this.buttonCount = 8;
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    await this._setupE000Detection(zclNode);
    await this._setupExtraDetection(zclNode);
    this.log('[INIT] ✅ Button8GangDevice initialized - 8 buttons ready');
  }

  async _setupExtraDetection(zclNode) {
    // v5.9.22: Use centralized resolvePressType (prevents 0-index regression)
    for (let ep = 1; ep <= 8; ep++) {
      const e = zclNode?.endpoints?.[ep]; if (!e) continue;
      const sc = e.clusters?.scenes || e.clusters?.[5];
      if (sc?.on) { sc.on('recall', async (p) => { await this.triggerButtonPress(ep, resolvePressType(p?.sceneId ?? 0, 'BTN8-scene')); }); }
      const ms = e.clusters?.multistateInput || e.clusters?.[18];
      if (ms?.on) { ms.on('attr.presentValue', async (v) => { await this.triggerButtonPress(ep, resolvePressType(v, 'BTN8-multi')); }); }
    }
    try {
      const tc = zclNode?.endpoints?.[1]?.clusters?.tuya || zclNode?.endpoints?.[1]?.clusters?.[61184];
      if (tc?.on) { tc.on('response', async (d) => { const dp = d?.dp ?? d?.dpId; const v = d?.data ?? d?.value ?? 0; if (dp >= 1 && dp <= 8) await this.triggerButtonPress(dp, resolvePressType(v, 'BTN8-DP')); }); }
    } catch (e) { /* ok */ }
  }

  async _setupE000Detection(zclNode) {
    this._e000Dedup = {};
    for (let ep = 1; ep <= 8; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;
      const e000 = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
      if (e000?.on) {
        // v5.8.54: Listen for ALL cmd events (cmd0-cmd6, cmdFD/FE/FF)
        const cmdNames = ['cmd0','cmd1','cmd2','cmd3','cmd4','cmd5','cmd6','cmdFD','cmdFE','cmdFF'];
        for (const cmdName of cmdNames) {
          e000.on(cmdName, async ({ data }) => {
            let btn = ep, press = 'single';
            if (data && data.length >= 2 && data[0] >= 1 && data[0] <= 8) {
              btn = data[0]; press = resolvePressType(data[1], 'BTN8-E000');
            } else if (data && data.length >= 1) {
              press = resolvePressType(data[0], 'BTN8-E000');
            }
            await this.triggerButtonPress(btn, press);
          });
        }
      }
      const onOff = endpoint.clusters?.onOff || endpoint.clusters?.[6];
      if (onOff?.on) {
        const handle = async (cmd, type) => {
          const now = Date.now();
          if (now - (this._e000Dedup[`${ep}_${cmd}`] || 0) < 500) return;
          this._e000Dedup[`${ep}_${cmd}`] = now;
          await this.triggerButtonPress(ep, type);
        };
        onOff.on('commandOn', () => handle('on', 'single'));
        onOff.on('commandOff', () => handle('off', 'double'));
        onOff.on('commandToggle', () => handle('toggle', 'long'));
      }
    }
    try {
      const TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      for (let ep = 1; ep <= 8; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) continue;
        const bc = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (b, t) => this.triggerButtonPress((b >= 1 && b <= 8) ? b : ep, t)
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings['tuyaE000'] = bc;
      }
    } catch (e) { /* ok */ }
  }

  async onDeleted() {
    this.log('Button8GangDevice deleted');
    if (this._clickState) {
      if (this._clickState.clickTimer) clearTimeout(this._clickState.clickTimer);
      if (this._clickState.longPressTimer) clearTimeout(this._clickState.longPressTimer);
    }
    if (super.onDeleted) await super.onDeleted();
  }
}

module.exports = Button8GangDevice;
