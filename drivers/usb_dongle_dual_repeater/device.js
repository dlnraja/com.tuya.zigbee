'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * USB Dongle Dual Repeater - v5.5.66 SIMPLIFIED
 * Device: _TZ3000_h1ipgkwn / TS0002
 *
 * - Gang 1 = USB Port 1 (endpoint 1) → onoff
 * - Gang 2 = USB Port 2 (endpoint 2) → onoff.usb2
 * - Energy monitoring on endpoint 1
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
    this._bindOnOffChannel(zclNode, 1, 'onoff');

    // Gang 2 = USB Port 2 (endpoint 2)
    this._bindOnOffChannel(zclNode, 2, 'onoff.usb2');

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

    const electrical = ep1.clusters.haElectricalMeasurement;
    const metering = ep1.clusters.seMetering;

    try {
      if (electrical) {
        this.log('[USB_DONGLE] Setting up haElectricalMeasurement listeners');

        electrical.on('attr.activePower', value => {
          const power = value / 10;
          this.log('[USB_DONGLE] Power:', power, 'W');
          this.setCapabilityValue('measure_power', power).catch(this.error);
        });

        electrical.on('attr.rmsVoltage', value => {
          const voltage = value / 10;
          this.log('[USB_DONGLE] Voltage:', voltage, 'V');
          this.setCapabilityValue('measure_voltage', voltage).catch(this.error);
        });

        electrical.on('attr.rmsCurrent', value => {
          const current = value / 1000;
          this.log('[USB_DONGLE] Current:', current, 'A');
          this.setCapabilityValue('measure_current', current).catch(this.error);
        });

        // Configure reporting
        await electrical.configureReporting({
          activePower: { minInterval: 10, maxInterval: 300, minChange: 1 },
          rmsVoltage: { minInterval: 60, maxInterval: 600, minChange: 10 },
          rmsCurrent: { minInterval: 10, maxInterval: 300, minChange: 10 },
        }).catch(err => this.log('[USB_DONGLE] electrical reporting config failed:', err.message));
      }

      if (metering) {
        this.log('[USB_DONGLE] Setting up seMetering listeners');

        metering.on('attr.currentSummationDelivered', value => {
          const kWh = value / 1000;
          this.log('[USB_DONGLE] Energy:', kWh, 'kWh');
          this.setCapabilityValue('meter_power', kWh).catch(this.error);
        });

        // Configure reporting
        await metering.configureReporting({
          currentSummationDelivered: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 1,
          },
        }).catch(err => this.log('[USB_DONGLE] metering reporting config failed:', err.message));
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
