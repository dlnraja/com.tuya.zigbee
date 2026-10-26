'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const { getRouter } = require('../../lib/ir/IntelligentIRRouter');
const { detectFormat } = require('../../lib/ir/IRFormatConverter');
const WifiIR = require('../../lib/ir/TuyaWifiIRProtocol');

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
    // WHY(P3063): control type 1 (DP201 JSON) vs 2 (DP1 mode + DP7) — learned from DPS, persisted
    this._irControlType = Number(this.getStoreValue?.('ir_control_type')) || 0;
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
    if (!dps || typeof dps !== 'object') {return;}
    if (!this._irControlType) {
      const t = WifiIR.detectControlType(dps);
      if (t) {
        this._irControlType = t;
        this.log(`[WIFI-IR] Control type ${t} detected`);
        Promise.resolve(this.setStoreValue?.('ir_control_type', t)).catch(() => {});
      }
    }
    if (!this._learningActive || !this._pendingCodeName) {return;}
    // Prefer DP202 (type 1) / DP2 (type 2); DP201 echo only if it is a code, never our JSON
    const code = WifiIR.parseLearnedCode(dps, { controlType: this._irControlType, allowEcho: true });
    if (code) {
      this._finishLearnCapture(code).catch((e) => this.error('[WIFI-IR] learn capture:', e.message));
    }
  }

  async _writeDps(dps) {
    if (typeof this._client.setDPs === 'function') {return this._client.setDPs(dps);}
    for (const [dp, v] of Object.entries(dps)) {await this._client.setDP(dp, v);}
    return undefined;
  }

  async _exitStudy() {
    if (!this._client || !this._client.connected) {return;}
    await this._writeDps(WifiIR.buildStudyDps(false, { controlType: this._irControlType })).catch(() => {});
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
        if (card) {await card.trigger(this, { name: result.name }, {}).catch(() => {});}
      } catch (_) { /* card optional */ }
      return;
    }
    this._learningActive = false;
    this._pendingCodeName = null;
    if (this._learnTimeout) {
      try { this.homey.clearTimeout(this._learnTimeout); } catch (_) { /* */ }
      this._learnTimeout = null;
    }
    await this._exitStudy();
    this.log(`[WIFI-IR] Learned stored: ${result.name}`);
    try {
      const card = this.homey.flow.getDeviceTriggerCard('wifi_ir_remote_code_learned');
      if (card) {await card.trigger(this, { name: result.name, format: detectFormat(rawCode) }, {}).catch(() => {});}
    } catch (_) { /* ignore */ }
  }

  async startLearning(name, duration = 30, opts = {}) {
    if (!this._client || !this._client.connected) {
      throw new Error('Not connected — check local IP / local key (WiFi login)');
    }
    this._pendingCodeName = name || `code_${Date.now()}`;
    this._learningActive = true;
    this._learnConfirm = opts.confirm !== false;
    // WHY(P3063): tinytuya/tuya-local arm learning with control "study" (after a
    // study_exit to reset a stuck session) — DP202 is report-only on type-1 firmware.
    const ct = this._irControlType;
    if (ct !== WifiIR.CONTROL_MULTI_DP) {await this._client.setDP('1', true).catch(() => {});}
    await this._exitStudy();
    try {
      await this._writeDps(WifiIR.buildStudyDps(true, { controlType: ct }));
    } catch (e) {
      this.log('[WIFI-IR] study arm failed, legacy DP202 arm:', e.message);
      await this._client.setDP('202', true).catch(() => {});
    }
    this.log(`[WIFI-IR] Learning: ${this._pendingCodeName} (${duration}s)`);
    try {
      const card = this.homey.flow.getDeviceTriggerCard('wifi_ir_remote_learning_started');
      if (card) {await card.trigger(this, { name: this._pendingCodeName, timeout_s: Number(duration) || 30 }, {}).catch(() => {});}
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
        this._exitStudy().catch(() => {});
      }
    }, ms);
  }

  async sendIRCode(code, options = {}) {
    const codeStr = String(code || '');
    if (!options.skipFloodGuard) {
      try {
        const { getGuard } = require('../../lib/ir/IRFloodGuard');
        const sid = (typeof this.getData === 'function' && (this.getData()?.id || this.getData()?.token))
          || (typeof this.getId === 'function' && this.getId())
          || 'wifi_ir_remote';
        const flood = getGuard(this.homey).checkSend({
          senderKey: String(sid),
          transport: 'wifi',
          payload: codeStr,
        });
        if (!flood.allow) {
          this.log(`[WIFI-IR] flood guard skip: ${flood.reason}`);
          if (flood.hard) {throw new Error(`IR flood guard: ${flood.reason}`);}
          return { ok: true, skipped: true, reason: flood.reason };
        }
      } catch (err) {
        if (String(err && err.message || '').includes('IR flood guard')) {throw err;}
      }
    }
    if (!this._client || !this._client.connected) {
      throw new Error('Not connected');
    }
    this.log(`[WIFI-IR] Sending IR (${codeStr.length} chars, type ${this._irControlType || '?'})`);
    let dps;
    try {
      dps = WifiIR.buildSendDps(codeStr, { controlType: this._irControlType, delay: options.delay });
    } catch (e) {
      throw new Error(`Invalid IR code: ${e.message}`);
    }
    try {
      await this._writeDps(dps);
    } catch (e) {
      // last resort: previous behaviour (bare code on DP201)
      this.log('[WIFI-IR] structured send failed, raw DP201 fallback:', e.message);
      await this._client.setDP('201', codeStr);
    }
  }

  async sendLearnedCode(name) {
    return this._router.send({ device: this, learnedName: name });
  }

  async deleteStoredCode(name) {
    const map = { ...await this._router.getLearnedMap(this) };
    delete map[name];
    await this._router.saveLearnedMap(this, map);
    this._learnedCodes = map;
    this.log(`[WIFI-IR] Deleted: ${name}`);
  }

  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    if (this._learnTimeout) {
      try { this.homey.clearTimeout(this._learnTimeout); } catch (_) { /* */ }
    }
    this._learningActive = false;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiIRRemoteDevice;
