'use strict';

const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * USB Dongle Triple (3-Port) - v5.8.73
 */
class UsbDongleTripleDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[USB_TRIPLE] onNodeInit');
    if (!zclNode || !zclNode.endpoints) {
      this.error('[USB_TRIPLE] zclNode or endpoints missing');
      return;
    }
    this.zclNode = zclNode;

    const portMap = { 1: 'onoff', 2: 'onoff.usb2', 3: 'onoff.usb3' };
    for (const [ep, cap] of Object.entries(portMap)) {
      if (this.hasCapability(cap)) this._bindOnOffChannel(zclNode, Number(ep), cap);
    }

    try {
      await this._configureEnergyReporting(zclNode);
    } catch (err) {
      this.error('[USB_TRIPLE] energy setup failed:', err.message);
    }

    this.log('[USB_TRIPLE] Device ready');
  }

  _bindOnOffChannel(zclNode, endpointId, capabilityId) {
    const ep = zclNode.endpoints[endpointId];
    if (!ep || !ep.clusters || !ep.clusters.onOff) {
      this.log('[USB_TRIPLE] No onOff on EP' + endpointId);
      return;
    }
    const onOff = ep.clusters.onOff;

    onOff.on('attr.onOff', value => {
      this.log('[USB_TRIPLE] ' + capabilityId + ' attr=' + value);
      this.setCapabilityValue(capabilityId, !!value).catch(this.error);
    });

    this.registerCapabilityListener(capabilityId, async value => {
      this.log('[USB_TRIPLE] Set ' + capabilityId + ' -> ' + value);
      if (value) await onOff.setOn(); else await onOff.setOff();
    });

    onOff.readAttributes(['onOff']).then(data => {
      if (data?.onOff != null) {
        this.setCapabilityValue(capabilityId, !!data.onOff).catch(this.error);
      }
    }).catch(() => {});

    onOff.configureReporting({ onOff: { minInterval: 0, maxInterval: 300, minChange: 1 } })
      .catch(e => this.log('[USB_TRIPLE] EP' + endpointId + ' reporting failed:', e.message));
  }

  async _configureEnergyReporting(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const electrical = ep1.clusters.electricalMeasurement || ep1.clusters.haElectricalMeasurement;
    const metering = ep1.clusters.metering || ep1.clusters.seMetering;

    if (electrical) {
      electrical.on('attr.activePower', v => {
        if (this.hasCapability('measure_power')) this.setCapabilityValue('measure_power', safeMultiply(v, 10)).catch(this.error);
      });
      electrical.on('attr.rmsVoltage', v => {
        if (this.hasCapability('measure_voltage')) this.setCapabilityValue('measure_voltage', safeMultiply(v, 10)).catch(this.error);
      });
      electrical.on('attr.rmsCurrent', v => {
        if (this.hasCapability('measure_current')) this.setCapabilityValue('measure_current', v / 1000).catch(this.error);
      });
      await electrical.configureReporting({
        activePower: { minInterval: 10, maxInterval: 300, minChange: 1 },
        rmsVoltage: { minInterval: 60, maxInterval: 600, minChange: 10 },
        rmsCurrent: { minInterval: 10, maxInterval: 300, minChange: 10 },
      }).catch(e => this.log('[USB_TRIPLE] electrical reporting failed:', e.message));
    }

    if (metering) {
      metering.on('attr.currentSummationDelivered', v => {
        if (this.hasCapability('meter_power')) this.setCapabilityValue('meter_power', v / 1000).catch(this.error);
      });
      await metering.configureReporting({
        currentSummationDelivered: { minInterval: 60, maxInterval: 3600, minChange: 1 }
      }).catch(e => this.log('[USB_TRIPLE] metering reporting failed:', e.message));
    }
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = UsbDongleTripleDevice;
