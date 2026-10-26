'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

// P3066: _TZE200/_TZE204_lsanae15 is Z2M TS0601_din_2 (tuya.ts, credited in CREDITS.md), a different DP layout:
// DP1 energy /100 kWh, DP6 packed voltage/current/power (phaseVariant2), DP16 relay, DP10 fault.
// Receive-side decode + DP16 relay write only; nothing is written at pairing.
const DIN2_RE = /lsanae15/i;

function decodeDin2Phase(raw) {
  let buf = null;
  if (Buffer.isBuffer(raw)) {buf = raw;} else if (typeof raw === 'string') {buf = Buffer.from(raw, 'base64');} else if (Array.isArray(raw)) {buf = Buffer.from(raw);}
  if (!buf || buf.length < 8) {return null;}
  return {
    voltage: ((buf[0] << 8) | buf[1]) / 10,
    current: ((buf[3] << 8) | buf[4]) / 1000,
    power: (buf[6] << 8) | buf[7],
  };
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

  _isDin2() {
    if (this._din2 !== undefined) {return this._din2;}
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getStore?.()?.manufacturerName || this.getData?.()?.manufacturerName || '';
    this._din2 = DIN2_RE.test(String(mfr));
    return this._din2;
  }

  _handleDP(dpId, rawValue) {
    if (!this._isDin2()) {return super._handleDP(dpId, rawValue);}
    return this._handleDin2DP(Number(dpId), rawValue);
  }

  _handleDin2DP(dp, raw) {
    const num = typeof raw === 'number' ? raw : Buffer.isBuffer(raw) && raw.length <= 4 ? raw.readUIntBE(0, raw.length) : Number(raw);
    if (dp === 1 && Number.isFinite(num) && num >= 0) {
      this._din2Set('meter_power', num / 100);
    } else if (dp === 6) {
      const p = decodeDin2Phase(raw);
      if (!p) {return;}
      this._din2Set('measure_voltage', p.voltage);
      this._din2Set('measure_current', p.current);
      this._din2Set('measure_power', p.power);
    } else if (dp === 16) {
      this._din2Set('onoff', raw === true || num === 1);
    } else {
      this.log(`[EnergyMeterDin] DIN_2 DP${dp} ignored`);
    }
  }

  _din2Set(cap, value) {
    if (!this.hasCapability(cap)) {return;}
    Promise.resolve(this.safeSetCapabilityValue(cap, value)).catch(() => {});
  }

  async _setOnOff(value) {
    if (this._isDin2() && this.tuyaEF00Manager) {
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
module.exports.decodeDin2Phase = decodeDin2Phase;
