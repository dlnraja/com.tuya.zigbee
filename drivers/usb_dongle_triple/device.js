'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');


const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * USB Dongle Triple (3-Port) - v5.8.73
 * Device: _TZ3000_mw1pqqqt / TS0003 (3-channel USB switch module)
 * Based on usb_dongle_dual_repeater pattern, extended for 3 ports
 * EP1 = USB Port 1 (onoff + energy), EP2 = USB Port 2, EP3 = USB Port 3
 */
class UsbDongleTripleDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsVoltage',
          minInterval: 30,
          maxInterval: 600,
          minChange: 1,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsCurrent',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    this.log('[USB_TRIPLE] onNodeInit');
    if (!zclNode || !zclNode.endpoints) {
      this.error('[USB_TRIPLE] zclNode or endpoints missing');
      return;
    }
    this.zclNode = zclNode;

    // Bind 3 USB ports
    const portMap = { 1: 'onoff', 2: 'onoff.usb2', 3: 'onoff.usb3' };
    for (const [ep, cap] of Object.entries(portMap)) {
      if (this.hasCapability(cap)) this._bindOnOffChannel(zclNode, Number(ep), cap);
    }

    // Energy monitoring on EP1
    try { await this._configureEnergyReporting(zclNode); }
    catch (err) { this.error('[USB_TRIPLE] energy setup failed:', err.message); }

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
        this.log('[USB_TRIPLE] ' + capabilityId + ' initial=' + data.onOff );this.setCapabilityValue(capabilityId, !!data.onOff).catch(this.error);
      }
    }).catch(() => {});

    try {
      onOff.configureReporting({ onOff: { minInterval: 0, maxInterval: 300, minChange: 1 } })
        .catch(e => this.log('[USB_TRIPLE] EP' + endpointId + ' reporting failed:', e.message));
    } catch (e) {}
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const ep1 = this.zclNode?.endpoints?.[1];
    try {
      if (changedKeys.includes('power_on_behavior')) {
        const map = { off: 0, on: 1, toggle: 3, previous: 2 };
        const val = map[newSettings.power_on_behavior] ?? 2;
        if (ep1?.clusters?.onOff) await ep1.clusters.onOff.writeAttributes({ moesStartUpOnOff: val });
      }
      if (changedKeys.includes('indicator_mode')) {
        const map = { off: 0, on_off: 1, inverted: 2 };
        const val = map[newSettings.indicator_mode] ?? 1;
        if (ep1?.clusters?.onOff) await ep1.clusters.onOff.writeAttributes({ tuyaBacklightSwitch: val });
      }
      if (changedKeys.includes('switch_mode')) {
        const map = { toggle: 0, state: 1, momentary: 2 };
        const val = map[newSettings.switch_mode] ?? 0;
        const e001 = ep1?.clusters?.tuyaE001 || ep1?.clusters?.[0xE001] || ep1?.clusters?.[57345];
        if (e001) {
          await e001.writeAttributes({ switchMode: val });
          this.log('[USB_TRIPLE] Switch mode set to', newSettings.switch_mode, '(', val, ')');
        }
      }
    } catch (err) {
      this.error('[USB_TRIPLE] Failed to apply settings:', err.message);
    }
  }

  async _configureEnergyReporting(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const electrical = ep1.clusters.electricalMeasurement || ep1.clusters.haElectricalMeasurement || ep1.clusters[0x0B04];
    const metering = ep1.clusters.metering || ep1.clusters.seMetering || ep1.clusters[0x0702];

    if (electrical) {
      electrical.on('attr.activePower', v => {
        if (this.hasCapability('measure_power')) this.setCapabilityValue('measure_power', v * 10).catch(this.error);
      });
      electrical.on('attr.rmsVoltage', v => {
        if (this.hasCapability('measure_voltage')) this.setCapabilityValue('measure_voltage', v * 10).catch(this.error);
      });
      electrical.on('attr.rmsCurrent', v => {
        if (this.hasCapability('measure_current')) this.setCapabilityValue('measure_current', v * 1000).catch(this.error);
      });
      await electrical.configureReporting({
        activePower: { minInterval: 10, maxInterval: 300, minChange: 1 },
        rmsVoltage: { minInterval: 60, maxInterval: 600, minChange: 10 },
        rmsCurrent: { minInterval: 10, maxInterval: 300, minChange: 10 },
      }).catch(e => this.log('[USB_TRIPLE] electrical reporting failed:', e.message);
      electrical.readAttributes(['activePower', 'rmsVoltage', 'rmsCurrent']).then(d => {
        if (d?.activePower != null && this.hasCapability('measure_power')) this.setCapabilityValue('measure_power', d.activePower * 10).catch(this.error);if (d?.rmsVoltage != null && this.hasCapability('measure_voltage')) this.setCapabilityValue('measure_voltage', d.rmsVoltage * 10).catch(this.error);
        if (d?.rmsCurrent != null && this.hasCapability('measure_current')) this.setCapabilityValue('measure_current', d.rmsCurrent * 1000).catch(this.error);
      }).catch(() => {});
    }

    if (metering) {
      metering.on('attr.currentSummationDelivered', v => {
        if (this.hasCapability('meter_power')) this.setCapabilityValue('meter_power', v * 1000).catch(this.error);
      });
      await metering.configureReporting({
        currentSummationDelivered: { minInterval: 60, maxInterval: 3600, minChange: 1 }
      }).catch(e => this.log('[USB_TRIPLE] metering reporting failed:', e.message);
      metering.readAttributes(['currentSummationDelivered']).then(d => {
        if (d?.currentSummationDelivered != null && this.hasCapability('meter_power')) this.setCapabilityValue('meter_power', d.currentSummationDelivered * 1000).catch(this.error);}).catch(() => {});
    }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = UsbDongleTripleDevice;

