'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiIRRemoteDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1':   { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':   { capability: 'unknown' },
      '201': { capability: 'unknown' },
      '202': { capability: 'unknown' },
    };
  }

  async onInit() {
    await super.onInit();
    this._learnedCodes = {};
    this._learningActive = false;
    this._pendingCodeName = null;
    try {
      const stored = await this.getStoreValue('learned_codes');
      if (stored) this._learnedCodes = stored;
    } catch (e) { /* first run */ }
    this.log(`[WIFI-IR] Ready, ${Object.keys(this._learnedCodes).length} codes`);
  }
  _processDPUpdate(dps) {
    super._processDPUpdate(dps);
    // DP201: received IR code during learning
    if (dps['201'] && this._learningActive && this._pendingCodeName) {
      this._learnedCodes[this._pendingCodeName] = dps['201'];
      this.setStoreValue('learned_codes', this._learnedCodes).catch(() => {});
      this.log(`[WIFI-IR] Learned: ${this._pendingCodeName}`);
      this._learningActive = false;
      this._pendingCodeName = null;
    }
  }
  async startLearning(name, duration) {
    if (!this._client || !this._client.connected) throw new Error('Not connected');
    this._pendingCodeName = name || `code_${Date.now()}`;
    this._learningActive = true;
    await this._client.setDP('1', true);
    this.log(`[WIFI-IR] Learning: ${this._pendingCodeName}`);
  }

  async sendIRCode(code) {
    if (!this._client || !this._client.connected) throw new Error('Not connected');
    this.log(`[WIFI-IR] Sending IR (${code.length} chars)`);
    await this._client.setDP('201', code);
  }

  async sendLearnedCode(name) {
    const code = this._learnedCodes[name];
    if (!code) throw new Error(`Code not found: ${name}`);
    await this.sendIRCode(code);
  }

  async deleteStoredCode(name) {
    delete this._learnedCodes[name];
    await this.setStoreValue('learned_codes', this._learnedCodes).catch(() => {});
    this.log(`[WIFI-IR] Deleted: ${name}`);
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WiFiIRRemoteDevice;
