'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const { getRouter } = require('../../lib/ir/IntelligentIRRouter');
const { detectFormat } = require('../../lib/ir/IRFormatConverter');

/**
 * WiFi IR Remote (Tuya Local) — P2487 router-backed learn/send.
 * DPs (tuya-local): 201 send, 202 receive/learn payload.
 */
class WiFiIRRemoteDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2': { capability: 'unknown' },
      '201': { capability: 'unknown' },
      '202': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    this._learnedCodes = {};
    this._learningActive = false;
    this._pendingCodeName = null;
    this._learnConfirm = true;
    try {
      const stored = await this.getStoreValue('learned_codes');
      if (stored && typeof stored === 'object') {
        this._learnedCodes = stored;
      }
    } catch (e) { /* first run */ }
    this._router = getRouter(this.homey);
    this.log(`[WIFI-IR] Ready, ${Object.keys(this._learnedCodes).length} codes (P2487 router)`);

    if (this.hasCapability('button.1')) {
      this.registerCapabilityListener('button.1', async () => {
        const names = Object.keys(this._learnedCodes);
        if (!names.length) {
          this.log('[WIFI-IR] button.1 — no learned codes');
          return true;
        }
        await this.sendLearnedCode(names[0]);
        return true;
      });
    }
  }

  _processDPUpdate(dps) {
    super._processDPUpdate(dps);
    // Prefer DP202 for learn RX; some firmwares echo on 201
    const raw = dps['202'] != null ? dps['202'] : (this._learningActive ? dps['201'] : null);
    if (raw != null && this._learningActive && this._pendingCodeName) {
      this._finishLearnCapture(String(raw)).catch((e) => this.error('[WIFI-IR] learn capture:', e.message));
    }
  }

  async _finishLearnCapture(rawCode) {
    const result = await this._router.onLearnedCapture(this, rawCode, {
      name: this._pendingCodeName,
    });
    this._learnedCodes = await this._router.getLearnedMap(this);
    if (result.needConfirm) {
      this.log(`[WIFI-IR] Confirm: press same button again for "${result.name}"`);
      this._learningActive = true;
      try {
        const card = this.homey.flow.getDeviceTriggerCard('wifi_ir_remote_learn_confirm_needed');
        if (card) await card.trigger(this, { name: result.name }, {}).catch(() => {});
      } catch (_) { /* card optional */ }
      return;
    }
    this._learningActive = false;
    this._pendingCodeName = null;
    this.log(`[WIFI-IR] Learned stored: ${result.name}`);
    try {
      const card = this.homey.flow.getDeviceTriggerCard('wifi_ir_remote_code_learned');
      if (card) await card.trigger(this, { name: result.name, format: detectFormat(rawCode) }, {}).catch(() => {});
    } catch (_) { /* ignore */ }
  }

  async startLearning(name, duration = 30, opts = {}) {
    if (!this._client || !this._client.connected) {
      throw new Error('Not connected — check local IP / local key (WiFi login)');
    }
    this._pendingCodeName = name || `code_${Date.now()}`;
    this._learningActive = true;
    this._learnConfirm = opts.confirm !== false;
    // Wake + enter learn: DP1 on, some devices use DP202 write to arm
    await this._client.setDP('1', true).catch(() => {});
    try {
      await this._client.setDP('202', true);
    } catch (_) {
      // best-effort arm
    }
    this.log(`[WIFI-IR] Learning: ${this._pendingCodeName} (${duration}s)`);
    try {
      const card = this.homey.flow.getDeviceTriggerCard('wifi_ir_remote_learning_started');
      if (card) await card.trigger(this, { name: this._pendingCodeName, timeout_s: Number(duration) || 30 }, {}).catch(() => {});
    } catch (_) { /* ignore */ }

    if (this._learnTimeout) {
      try { this.homey.clearTimeout(this._learnTimeout); } catch (_) { /* */ }
    }
    const ms = Math.max(5, Number(duration) || 30) * 1000;
    this._learnTimeout = this.homey.setTimeout(() => {
      if (this._learningActive) {
        this._learningActive = false;
        this._pendingCodeName = null;
        this.log('[WIFI-IR] Learn timeout');
      }
    }, ms);
  }

  async sendIRCode(code) {
    if (!this._client || !this._client.connected) {
      throw new Error('Not connected');
    }
    this.log(`[WIFI-IR] Sending IR (${String(code).length} chars)`);
    await this._client.setDP('201', code);
  }

  async sendLearnedCode(name) {
    return this._router.send({ device: this, learnedName: name });
  }

  async deleteStoredCode(name) {
    const map = { ...(await this._router.getLearnedMap(this)) };
    delete map[name];
    await this._router.saveLearnedMap(this, map);
    this._learnedCodes = map;
    this.log(`[WIFI-IR] Deleted: ${name}`);
  }

  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._learnTimeout) {
      try { this.homey.clearTimeout(this._learnTimeout); } catch (_) { /* */ }
    }
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiIRRemoteDevice;
