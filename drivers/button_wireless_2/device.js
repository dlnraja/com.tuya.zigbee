'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button2GangDevice - v5.8.16 Enhanced
 *
 * FIX v5.2.92: Was incorrectly extending HybridDevice
 * FIX v5.8.16: Added cluster 0xE000 + tuyaE000 support
 *
 * Handles single/double/long press for 2 buttons
 */
class Button2GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           BUTTON 2-GANG v5.8.16 - E000 ENHANCED                   ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    this.buttonCount = 2;
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    await this._setupE000Detection(zclNode);
    await this._setupExtraDetection(zclNode);
    await this._setupRawFrameInterceptor(zclNode);
    this.log('[INIT] ✅ Button2GangDevice initialized - 2 buttons ready');
  }

  async _setupExtraDetection(zclNode) {
    const pressMap = { 0: 'single', 1: 'double', 2: 'long' };
    for (let ep = 1; ep <= 2; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;
      const sc = endpoint.clusters?.scenes || endpoint.clusters?.[5];
      if (sc?.on) {
        sc.on('recall', async (p) => {
          const t = pressMap[p?.sceneId ?? 0] || 'single';
          await this.triggerButtonPress(ep, t);
        });
        sc.on('recallScene', async (p) => {
          const t = pressMap[p?.sceneId ?? 0] || 'single';
          await this.triggerButtonPress(ep, t);
        });
      }
      const ms = endpoint.clusters?.multistateInput || endpoint.clusters?.[18];
      if (ms?.on) {
        ms.on('attr.presentValue', async (v) => {
          await this.triggerButtonPress(ep, pressMap[v] || 'single');
        });
      }
    }
    try {
      const tc = zclNode?.endpoints?.[1]?.clusters?.tuya || zclNode?.endpoints?.[1]?.clusters?.[61184];
      if (tc?.on) {
        tc.on('response', async (d) => {
          const dp = d?.dp ?? d?.dpId;
          const v = d?.data ?? d?.value ?? 0;
          if (dp >= 1 && dp <= 2) await this.triggerButtonPress(dp, pressMap[v] || 'single');
        });
      }
    } catch (e) { /* ok */ }
  }

  async _setupE000Detection(zclNode) {
    const mfr = this.getData()?.manufacturerName || this.getSetting?.('zb_manufacturer_name') || '';
    this.log(`[BUTTON2-E000] 🔧 Setting up E000 detection (mfr: ${mfr || 'unknown'})`);
    this._e000Dedup = {};

    for (let ep = 1; ep <= 2; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;

      // v5.8.16: Try registered tuyaE000 cluster
      const e000Cluster = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
      if (e000Cluster && typeof e000Cluster.on === 'function') {
        this.log(`[BUTTON2-E000] 📡 EP${ep} tuyaE000 cluster available`);
        // v5.8.54: Listen for ALL cmd events (cmd0-cmd6, cmdFD/FE/FF)
        // Previous buttonPress(0x00) with uint8 args silently dropped other cmd IDs
        const cmdNames = ['cmd0','cmd1','cmd2','cmd3','cmd4','cmd5','cmd6','cmdFD','cmdFE','cmdFF'];
        for (const cmdName of cmdNames) {
          e000Cluster.on(cmdName, async ({ data }) => {
            this.log(`[BUTTON2-E000] 📥 EP${ep} ${cmdName}: data=${data?.toString?.('hex')}`);
            const types = { 0: 'single', 1: 'double', 2: 'long' };
            let btn = ep, press = 'single';
            if (data && data.length >= 2 && data[0] >= 1 && data[0] <= 2) {
              btn = data[0]; press = types[data[1]] || 'single';
            } else if (data && data.length >= 1) {
              press = types[data[0]] || 'single';
            }
            this.log(`[BUTTON2-E000] 🔘 Button ${btn} ${press.toUpperCase()}`);
            await this.triggerButtonPress(btn, press);
          });
        }
      }

      // Setup onOff listeners as fallback
      const onOff = endpoint.clusters?.onOff || endpoint.clusters?.[6];
      if (onOff && typeof onOff.on === 'function') {
        const handle = async (cmd, type) => {
          const now = Date.now();
          if (now - (this._e000Dedup[`${ep}_${cmd}`] || 0) < 500) return;
          this._e000Dedup[`${ep}_${cmd}`] = now;
          this.log(`[BUTTON2-E000] 🔘 EP${ep} ${cmd} → Button ${ep} ${type}`);
          await this.triggerButtonPress(ep, type);
        };
        onOff.on('commandOn', () => handle('on', 'single'));
        onOff.on('commandOff', () => handle('off', 'double'));
        onOff.on('commandToggle', () => handle('toggle', 'long'));
        this.log(`[BUTTON2-E000] ✅ EP${ep} onOff listeners ready`);
      }
    }

    // Setup BoundCluster for cluster 0xE000
    await this._setupE000BoundCluster(zclNode);
  }

  async _setupE000BoundCluster(zclNode) {
    try {
      const TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      for (let ep = 1; ep <= 2; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) continue;
        const bc = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (button, pressType) => {
            const btn = (button >= 1 && button <= 2) ? button : ep;
            this.log(`[BUTTON2-E000] 🔘 BoundCluster EP${ep} → Button ${btn} ${pressType}`);
            await this.triggerButtonPress(btn, pressType);
          }
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings['tuyaE000'] = bc;
        this.log(`[BUTTON2-E000] ✅ BoundCluster EP${ep} ready`);
      }
    } catch (e) {
      this.log('[BUTTON2-E000] ℹ️ BoundCluster not available');
    }
  }

  async _setupRawFrameInterceptor(zclNode) {
    try {
      if (!zclNode || typeof zclNode.handleFrame !== 'function') return;
      const orig = zclNode.handleFrame.bind(zclNode);
      zclNode.handleFrame = async (epId, cId, f, m) => {
        if (cId === 57344 || cId === 0xE000) {
          const d = f?.data, pm = { 0:'single',1:'double',2:'long' };
          this.log(`[BUTTON2-RAW] EP${epId} E000`);
          let btn = epId, pt = 'single';
          if (d?.length >= 2 && d[0] >= 1 && d[0] <= 2) { btn = d[0]; pt = pm[d[1]] || 'single'; }
          else if (d?.length >= 1) { pt = pm[d[0]] || 'single'; }
          this.triggerButtonPress(btn, pt);
        }
        return orig(epId, cId, f, m);
      };
      this.log('[BUTTON2-RAW] ✅ Ready');
    } catch (e) { this.log(`[BUTTON2-RAW] ⚠️ ${e.message}`); }
  }

  async onDeleted() {
    this.log('Button2GangDevice deleted');
    if (this._clickState) {
      if (this._clickState.clickTimer) clearTimeout(this._clickState.clickTimer);
      if (this._clickState.longPressTimer) clearTimeout(this._clickState.longPressTimer);
    }
    if (super.onDeleted) await super.onDeleted();
  }
}

module.exports = Button2GangDevice;
