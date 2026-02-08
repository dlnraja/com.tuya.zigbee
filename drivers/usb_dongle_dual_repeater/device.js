'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * USB Dongle Dual Repeater - v5.8.68
 * Device: _TZ3000_h1ipgkwn / TS0002 (XMSJ 2-port USB power switch)
 * Also: TS0207 USB repeaters (_TZ3000_m0vaazab, etc.)
 *
 * - Gang 1 = USB Port 1 (endpoint 1) → onoff
 * - Gang 2 = USB Port 2 (endpoint 2) → onoff.usb2
 * - Energy monitoring on endpoint 1 (metering 0x0702 + electricalMeasurement 0x0B04)
 * - Power-on behavior via moesStartUpOnOff attribute
 */
class UsbDongleDualRepeaterDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[USB_DONGLE] onNodeInit');

    if (!zclNode || !zclNode.endpoints) {
      this.error('[USB_DONGLE] zclNode or endpoints missing');
      return;
    }

    this.zclNode = zclNode;

    // Gang 1 = USB Port 1 (endpoint 1)
    if (this.hasCapability('onoff')) {
      this._bindOnOffChannel(zclNode, 1, 'onoff');
    }

    // Gang 2 = USB Port 2 (endpoint 2)
    if (this.hasCapability('onoff.usb2')) {
      this._bindOnOffChannel(zclNode, 2, 'onoff.usb2');
    }

    // Mesure d'énergie sur endpoint 1
    try {
      await this._configureEnergyReporting(zclNode);
    } catch (err) {
      this.error('[USB_DONGLE] _configureEnergyReporting failed:', err.message);
    }

    this.log('[USB_DONGLE] ✅ Device ready');
  }

  /**
   * Bind un endpoint genOnOff vers une capability Homey.
   */
  _bindOnOffChannel(zclNode, endpointId, capabilityId) {
    const ep = zclNode.endpoints[endpointId];
    if (!ep || !ep.clusters || !ep.clusters.onOff) {
      this.log('[USB_DONGLE] No onOff cluster on endpoint', endpointId);
      return;
    }

    const onOffCluster = ep.clusters.onOff;

    // Reporting ZCL → capability
    onOffCluster.on('attr.onOff', value => {
      this.log('[USB_DONGLE]', capabilityId, 'attr.onOff =', value);
      this.setCapabilityValue(capabilityId, !!value).catch(this.error);
    });

    // Capability → ZCL command
    this.registerCapabilityListener(capabilityId, async value => {
      this.log('[USB_DONGLE] Set', capabilityId, '→', value);
      if (value) {
        await onOffCluster.setOn();
      } else {
        await onOffCluster.setOff();
      }
    });

    // v5.8.68: Read initial state so device doesn't show "unknown"
    onOffCluster.readAttributes(['onOff']).then(data => {
      if (data?.onOff != null) {
        this.log('[USB_DONGLE]', capabilityId, 'initial state =', data.onOff);
        this.setCapabilityValue(capabilityId, !!data.onOff).catch(this.error);
      }
    }).catch(() => {});
  }

  /**
   * v5.8.68: Handle settings changes.
   * moesStartUpOnOff: 0=off, 1=on, 2=previous, 3=toggle
   * tuyaBacklightSwitch: 0=off, 1=on_off, 2=inverted
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const ep1 = this.zclNode?.endpoints?.[1];

    if (changedKeys.includes('power_on_behavior')) {
      const val = newSettings.power_on_behavior;
      const map = { off: 0, on: 1, toggle: 3, previous: 2 };
      const numVal = map[val] ?? 2;
      this.log('[USB_DONGLE] Setting power_on_behavior →', val, '(', numVal, ')');
      if (ep1?.clusters?.onOff) {
        await ep1.clusters.onOff.writeAttributes({ moesStartUpOnOff: numVal });
      }
    }

    if (changedKeys.includes('indicator_mode')) {
      const val = newSettings.indicator_mode;
      const map = { off: 0, on_off: 1, inverted: 2 };
      const numVal = map[val] ?? 1;
      this.log('[USB_DONGLE] Setting indicator_mode →', val, '(', numVal, ')');
      if (ep1?.clusters?.onOff) {
        await ep1.clusters.onOff.writeAttributes({ tuyaBacklightSwitch: numVal });
      }
    }
  }

  /**
   * Configure le reporting ZCL pour la mesure d'énergie.
   */
  async _configureEnergyReporting(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) {
      this.log('[USB_DONGLE] No endpoint 1 for energy reporting');
      return;
    }

    const electrical = ep1.clusters.electricalMeasurement || ep1.clusters.haElectricalMeasurement || ep1.clusters[0x0B04];
    const metering = ep1.clusters.metering || ep1.clusters.seMetering || ep1.clusters[0x0702];

    try {
      if (electrical) {
        this.log('[USB_DONGLE] Setting up haElectricalMeasurement listeners');

        electrical.on('attr.activePower', value => {
          const power = value / 10;
          this.log('[USB_DONGLE] Power:', power, 'W');
          if (this.hasCapability('measure_power')) this.setCapabilityValue('measure_power', parseFloat(power)).catch(this.error);
        });

        electrical.on('attr.rmsVoltage', value => {
          const voltage = value / 10;
          this.log('[USB_DONGLE] Voltage:', voltage, 'V');
          if (this.hasCapability('measure_voltage')) this.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(this.error);
        });

        electrical.on('attr.rmsCurrent', value => {
          const current = value / 1000;
          this.log('[USB_DONGLE] Current:', current, 'A');
          if (this.hasCapability('measure_current')) this.setCapabilityValue('measure_current', parseFloat(current)).catch(this.error);
        });

        // Configure reporting
        await electrical.configureReporting({
          activePower: { minInterval: 10, maxInterval: 300, minChange: 1 },
          rmsVoltage: { minInterval: 60, maxInterval: 600, minChange: 10 },
          rmsCurrent: { minInterval: 10, maxInterval: 300, minChange: 10 },
        }).catch(err => this.log('[USB_DONGLE] electrical reporting config failed:', err.message));

        electrical.readAttributes(['activePower', 'rmsVoltage', 'rmsCurrent']).then(data => {
          if (data?.activePower != null) {
            const power = data.activePower / 10;
            if (this.hasCapability('measure_power')) this.setCapabilityValue('measure_power', parseFloat(power)).catch(this.error);
          }
          if (data?.rmsVoltage != null) {
            const voltage = data.rmsVoltage / 10;
            if (this.hasCapability('measure_voltage')) this.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(this.error);
          }
          if (data?.rmsCurrent != null) {
            const current = data.rmsCurrent / 1000;
            if (this.hasCapability('measure_current')) this.setCapabilityValue('measure_current', parseFloat(current)).catch(this.error);
          }
        }).catch(() => { });
      }

      if (metering) {
        this.log('[USB_DONGLE] Setting up metering listeners');

        metering.on('attr.currentSummationDelivered', value => {
          const kWh = value / 1000;
          this.log('[USB_DONGLE] Energy:', kWh, 'kWh');
          if (this.hasCapability('meter_power')) this.setCapabilityValue('meter_power', parseFloat(kWh)).catch(this.error);
        });

        // Configure reporting
        await metering.configureReporting({
          currentSummationDelivered: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 1,
          },
        }).catch(err => this.log('[USB_DONGLE] metering reporting config failed:', err.message));

        metering.readAttributes(['currentSummationDelivered']).then(data => {
          if (data?.currentSummationDelivered != null) {
            const kWh = data.currentSummationDelivered / 1000;
            if (this.hasCapability('meter_power')) this.setCapabilityValue('meter_power', parseFloat(kWh)).catch(this.error);
          }
        }).catch(() => { });
      }

      this.log('[USB_DONGLE] Energy reporting configured');
    } catch (err) {
      this.error('[USB_DONGLE] Failed to configure energy reporting, will retry:', err.message);
      // Retry 1 min plus tard si le Zigbee stack n'était pas prêt
      this.homey.setTimeout(() => this._configureEnergyReporting(zclNode), 60 * 1000);
    }
  }
}

module.exports = UsbDongleDualRepeaterDevice;
