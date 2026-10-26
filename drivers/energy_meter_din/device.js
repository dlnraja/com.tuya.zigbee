'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const { decodePhase } = require('../../lib/tuya/SpmPhaseDecoder');

// P3071: exact layouts from zigbee-herdsman-converters tuya.ts (credited in CREDITS.md on master):
// TS0601_din_1 (bkkmqmyo, eaac7dkw): DP1 energy /100 (not the relay), DP6 V (bytes 13-14, /10) + A (bytes 11-12, /1000),
// DP16 relay, DP103 W, DP105 Hz /100. SPM01V1-GT (d2zfgtij): DP1 energy /100, DP6 = V/A/W packed like SPM.
// Receive-side decode + DP16 relay write only; nothing is written at pairing.
const DIN1_RE = /_(bkkmqmyo|eaac7dkw)$/i;
const SPM01GT_RE = /_d2zfgtij$/i;
const DIN1_SCALARS = {
  din1: { 1: { cap: 'meter_power', div: 100 }, 16: { cap: 'onoff', bool: true }, 103: { cap: 'measure_power', div: 1 }, 105: { cap: 'measure_frequency', div: 100 } },
  spm01gt: { 1: { cap: 'meter_power', div: 100 }, 32: { cap: 'measure_frequency', div: 100 } },
};

function decodeDin1Phase(raw) {
  let buf = null;
  if (Buffer.isBuffer(raw)) {buf = raw;} else if (typeof raw === 'string') {buf = Buffer.from(raw, 'base64');} else if (Array.isArray(raw)) {buf = Buffer.from(raw);}
  if (!buf || buf.length < 15) {return null;}
  return { voltage: ((buf[13] << 8) | buf[14]) / 10, current: ((buf[11] << 8) | buf[12]) / 1000 };
}

/**
 * EnergyMeterDinDevice - DIN Rail Energy Meter
 * DPs: 1=onoff(BOOL), 6=current(smartDivisor), 7=power(smartDivisor),
 *      8=voltage(smartDivisor), 9=metering(smartDivisor), 11=frequency(smartDivisor)
 */
class EnergyMeterDinDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      6: { capability: 'measure_current', smartDivisor: true },
      7: { capability: 'measure_power', smartDivisor: true },
      8: { capability: 'measure_voltage', smartDivisor: true },
      9: { capability: 'meter_power', smartDivisor: true },
      11: { capability: 'measure_frequency', smartDivisor: true },
    };
  }

  _dinVariant() {
    if (this._dinVar !== undefined) {return this._dinVar;}
    const mfr = String(this.getSetting?.('zb_manufacturer_name') || this.getStore?.()?.manufacturerName || this.getData?.()?.manufacturerName || '').trim();
    this._dinVar = DIN1_RE.test(mfr) ? 'din1' : SPM01GT_RE.test(mfr) ? 'spm01gt' : null;
    return this._dinVar;
  }

  _dinSet(cap, value) {
    if (!this.hasCapability(cap)) {return;}
    Promise.resolve(this.safeSetCapabilityValue(cap, value)).catch(() => {});
  }

  _handleDP(dpId, rawValue) {
    const v = this._dinVariant();
    if (v) {return this._handleDin1DP(v, Number(dpId), rawValue);}
    return super._handleDP(dpId, rawValue);
  }

  _handleDin1DP(v, dp, raw) {
    const num = typeof raw === 'number' ? raw : Buffer.isBuffer(raw) && raw.length <= 4 ? raw.readUIntBE(0, raw.length) : Number(raw);
    if (dp === 6) {return this._din1Phase(v, raw);}
    const rule = (DIN1_SCALARS[v] || {})[dp];
    if (!rule) {
      this.log(`[EnergyMeterDin] ${v} DP${dp} ignored`);
      return undefined;
    }
    if (rule.bool) {return this._dinSet(rule.cap, raw === true || num === 1);}
    if (Number.isFinite(num) && num >= 0) {this._dinSet(rule.cap, num / rule.div);}
    return undefined;
  }

  _din1Phase(v, raw) {
    if (v === 'din1') {
      const p = decodeDin1Phase(raw);
      if (p) {
        this._dinSet('measure_voltage', p.voltage);
        this._dinSet('measure_current', p.current);
      }
      return undefined;
    }
    const p = decodePhase(raw);
    if (!p.ok) {return undefined;}
    this._dinSet('measure_voltage', p.voltage);
    this._dinSet('measure_current', p.current);
    this._dinSet('measure_power', p.power);
    return undefined;
  }

  async _setOnOff(value) {
    if (this._dinVariant() === 'din1' && this.tuyaEF00Manager) {
      return this.tuyaEF00Manager.sendDP(16, value ? 1 : 0, 'bool');
    }
    return super._setOnOff(value);
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) {return;}
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[EnergyMeterDin] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = EnergyMeterDinDevice;
module.exports.decodeDin1Phase = decodeDin1Phase;
