'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
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
      if (stored) {this._learnedCodes = stored;}
    } catch (e) { /* first run */ }
    this.log(`[WIFI-IR] Ready, ${Object.keys(this._learnedCodes).length} codes`);
  }
  _processDPUpdate(dps) {
    super._processDPUpdate(dps);
    if (dps && typeof dps === 'object') {this._updateEnvSensorFromDps(dps);}
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
    if (!this._client || !this._client.connected) {throw new Error('Not connected');}
    this._pendingCodeName = name || `code_${Date.now()}`;
    this._learningActive = true;
    await this._client.setDP('1', true);
    this.log(`[WIFI-IR] Learning: ${this._pendingCodeName}`);
  }

  async sendIRCode(code) {
    if (!this._client || !this._client.connected) {throw new Error('Not connected');}
    this.log(`[WIFI-IR] Sending IR (${code.length} chars)`);
    await this._client.setDP('201', code);
  }

  async sendLearnedCode(name) {
    const code = this._learnedCodes[name];
    if (!code) {throw new Error(`Code not found: ${name}`);}
    await this.sendIRCode(code);
  }

  async deleteStoredCode(name) {
    delete this._learnedCodes[name];
    await this.setStoreValue('learned_codes', this._learnedCodes).catch(() => {});
    this.log(`[WIFI-IR] Deleted: ${name}`);
  }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
  _updateEnvSensorFromDps(dps) {
    const rawTemp = dps['101'] ?? dps[101];
    if (typeof rawTemp === 'number' && Number.isFinite(rawTemp)) {
      const tempC = Math.abs(rawTemp) > 80 ? Math.round(rawTemp) / 10 : rawTemp;
      if (tempC >= -40 && tempC <= 85) {
        this._setDynamicEnvCapability('measure_temperature', tempC);
      }
    }
    const rawHum = dps['102'] ?? dps[102];
    if (typeof rawHum === 'number' && Number.isFinite(rawHum) && rawHum >= 0 && rawHum <= 100) {
      this._setDynamicEnvCapability('measure_humidity', rawHum);
    }
  }

  _setDynamicEnvCapability(cap, value) {
    if (this._destroyed) {return;}
    const write = () => this.safeSetCapabilityValue(cap, value).catch(() => {});
    if (typeof this.hasCapability === 'function' && !this.hasCapability(cap)) {
      if (typeof this.addCapability !== 'function') {return;}
      Promise.resolve(this.addCapability(cap)).then(write).catch(() => {});
      return;
    }
    write();
  }

}

module.exports = WiFiIRRemoteDevice;
return module.exports;
});
