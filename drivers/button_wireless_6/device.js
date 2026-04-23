'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

/**
 * Button6GangDevice - v5.8.16 Enhanced
 *
 * FIX v5.2.92: Was incorrectly extending HybridDevice
 * FIX v5.8.16: Added cluster 0xE000 + tuyaE000 support
 *
 * Handles single/double/long press for 6 buttons
 */
class Button6GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('           BUTTON 6-GANG v5.8.16 - E000 ENHANCED                   ');
    this.log('');

    this.buttonCount = 6;
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    await this._setupE000Detection(zclNode);
    await this._setupExtraDetection(zclNode);
    this.log('[INIT]  Button6GangDevice initialized - 6 buttons ready');
  }

  async _setupExtraDetection(zclNode) {
    // v5.9.22: Use centralized resolvePressType (prevents 0-index regression)
    for (let ep = 1; ep <= 6; ep++) {
      const e = zclNode?.endpoints?.[ep]; if (!e ) continue;
      const sc = e.clusters?.scenes || e.clusters?.[5];
      if (sc?.on) { sc.on('recall', async (p ) => { await this.triggerButtonPress(ep, resolvePressType(p?.sceneId ?? 0, 'BTN6-scene'));
      }); }
      const ms = e.clusters?.multistateInput || e.clusters?.[18];
      if (ms?.on) { ms.on('attr.presentValue', async (v ) => { await this.triggerButtonPress(ep, resolvePressType(v, 'BTN6-multi'));
      }); }
    }
    try {
      const tc = zclNode?.endpoints?.[1]?.clusters?.tuya || zclNode?.endpoints?.[1]?.clusters?.[61184];
      if (tc?.on) { tc.on('response', async (d) => { const dp = d?.dp ?? d?.dpId; const v = d?.data ?? d?.value ?? 0; if (dp >= 1 && dp <= 6) await this.triggerButtonPress(dp, resolvePressType(v, 'BTN6-DP'));
      }); }
    } catch (e) { /* ok */ }
  }

  async _setupE000Detection(zclNode) {
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    this.log(`[BUTTON6-E000]  Setting up E000 detection (mfr: ${mfr || 'unknown'})`);
    this._e000Dedup = {};

    for (let ep = 1; ep <= 6; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint ) continue;

      const e000Cluster = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
      if (e000Cluster && typeof e000Cluster.on === 'function') {
        this.log(`[BUTTON6-E000]  EP${ep} tuyaE000 cluster available` );
        // v5.8.54: Listen for ALL cmd events (cmd0-cmd6, cmdFD/FE/FF)
        const cmdNames = ['cmd0','cmd1','cmd2','cmd3','cmd4','cmd5','cmd6','cmdFD','cmdFE','cmdFF'];
        for (const cmdName of cmdNames) {
          e000Cluster.on(cmdName, async ({ data }) => {
            this.log(`[BUTTON6-E000]  EP${ep} ${cmdName}: data=${data?.toString?.('hex')}`);
            let btn = ep, press = 'single';
            if (data && data.length >= 2 && data[0] >= 1 && data[0] <= 6) {
              btn = data[0]; press = resolvePressType(data[1], 'BTN6-E000');
            } else if (data && data.length >= 1) {
              press = resolvePressType(data[0], 'BTN6-E000' );
            }
            await this.triggerButtonPress(btn, press);
      });
        }
      }

      const onOff = endpoint.clusters?.onOff || endpoint.clusters?.[6];
      if (onOff && typeof onOff.on === 'function') {
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

    await this._setupE000BoundCluster(zclNode);
  }

  async _setupE000BoundCluster(zclNode) {
    try {
      const TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      for (let ep = 1; ep <= 6; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint ) continue;
        const bc = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (button, pressType) => {
            const btn = (button >= 1 && button <= 6) ? button : ep;
            await this.triggerButtonPress(btn, pressType);
          }
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings['tuyaE000'] = bc;
      }
    } catch (e) { /* BoundCluster not available */ }
  }

  async onDeleted() {
    this.log('Button6GangDevice deleted');
    if (this._clickState) {
      if (this._clickState.clickTimer) clearTimeout(this._clickState.clickTimer);
      if (this._clickState.longPressTimer) clearTimeout(this._clickState.longPressTimer);
    }
    if (super.onDeleted) await super.onDeleted();
  }
}

module.exports = Button6GangDevice;

