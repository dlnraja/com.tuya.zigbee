'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HEIMAN HS2WD-E smart siren (modelId WarningDevice / WarningDevice-EF-3.0).
 * Native ZCL only: IAS WD 0x0502 startWarning (command 0x00) to sound or stop,
 * Power Configuration 0x0001 for battery (backup battery, mains powered).
 * Ids from the genBasic dump in Koenkk/zigbee-herdsman-converters #3429 and the
 * deCONZ DDF for HS2WD-E (dresden-elektronik/deconz-rest-plugin #6400, BabaIsYou).
 * Own implementation; frame layout follows the ZCL IAS WD specification.
 */
const IAS_WD_START_WARNING = 0x00;

function warningPayload(seconds) {
  const on = seconds > 0;
  // warningInfo: bits 0-3 mode (1 = burglar), bits 4-5 strobe, bits 6-7 siren level
  const info = on ? (0x01 | (0x01 << 4) | (0x02 << 6)) : 0x00;
  const buf = Buffer.alloc(5);
  buf.writeUInt8(info, 0);
  buf.writeUInt16LE(Math.max(0, Math.min(1800, seconds | 0)), 1);
  buf.writeUInt8(on ? 50 : 0, 3); // strobe duty cycle
  buf.writeUInt8(on ? 1 : 0, 4); // strobe level
  return buf;
}

class HeimanSirenDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this._stopTimer = null;
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'powerConfiguration', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: (v) => (v === 255 ? null : Math.round(v / 2)),
        reportOpts: { configureAttributeReporting: { minInterval: 60, maxInterval: 3600, minChange: 2 } },
        getOpts: { getOnStart: true },
      });
    }
    this.registerCapabilityListener('onoff', async (value) => this.sound(value ? 30 : 0));
  }

  async sound(seconds) {
    const cluster = this.zclNode?.endpoints?.[1]?.clusters?.iasWD;
    if (!cluster || typeof cluster.sendFrame !== 'function') {throw new Error('IAS WD cluster not available');}
    await cluster.sendFrame({
      frameControl: ['clusterSpecific', 'disableDefaultResponse'],
      cmdId: IAS_WD_START_WARNING,
      trxSequenceNumber: cluster.nextSeqNr(),
      data: warningPayload(seconds),
    });
    if (this._stopTimer) {this.homey.clearTimeout(this._stopTimer);}
    this._stopTimer = null;
    await this.safeSetCapabilityValue('onoff', seconds > 0);
    if (seconds > 0) {
      this._stopTimer = this.homey.setTimeout(() => {
        this._stopTimer = null;
        this.safeSetCapabilityValue('onoff', false);
      }, seconds * 1000);
    }
  }

  // WHY(P2924): never throw from a timer or a report; skip undeclared capabilities.
  async safeSetCapabilityValue(cap, value) {
    if (!this.hasCapability(cap)) {return;}
    await super.setCapabilityValue(cap, value).catch((e) => this.error(`set ${cap}: ${e.message}`));
  }

  onDeleted() {
    if (this._stopTimer) {this.homey.clearTimeout(this._stopTimer);}
  }
}

module.exports = HeimanSirenDevice;
module.exports.warningPayload = warningPayload;
