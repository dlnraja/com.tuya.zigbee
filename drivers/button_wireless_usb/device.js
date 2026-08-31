'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

// Energy scaling divisors — ZCL raw attributes; Tuya-DP drivers use smartDivisor: true via SmartDivisorManager.
// Multipliers are the exact inverses of the ZCL divisors, so results stay identical to the raw scaling.
const ENERGY_SCALING = {
  measure_power: { multiplier: 10 },      // activePower raw ×10 → W
  measure_voltage: { multiplier: 10 },    // rmsVoltage raw ×10 → V
  measure_current: { multiplier: 1000 },  // rmsCurrent raw ×1000 → A
  meter_power: { divisor: 1000 },         // currentSummationDelivered raw ÷1000 → kWh
};

/**
 * USB Dongle Dual Repeater - v5.8.68
 * Device: _TZ3000_h1ipgkwn / TS0002 (XMSJ 2-port USB power switch)
 * Also: TS0207 USB repeaters (_TZ3000_m0vaazab, etc.)
 *
 * - Gang 1 = USB Port 1 (endpoint 1)  onoff
 * - Gang 2 = USB Port 2 (endpoint 2)  onoff.usb2
 * - Energy monitoring on endpoint 1 (metering 0x0702 + electricalMeasurement 0x0B04)
 * - Power-on behavior via moesStartUpOnOff attribute
 */
class UsbDongleDualRepeaterDevice extends PhysicalButtonMixin(TuyaZigbeeDevice) {

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

    this.log('[USB_DONGLE]  Device ready');
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

    // Reporting ZCL  capability
    onOffCluster.on('attr.onOff', value => {
      this.log('[USB_DONGLE]', capabilityId, 'attr.onOff =', value);
      this.safeSetCapabilityValue(capabilityId, !!value).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      });

    // Capability  ZCL command
    this.registerCapabilityListener(capabilityId, async value => {
      this.log('[USB_DONGLE] Set', capabilityId, '', value);
      if (value) {
        await onOffCluster.setOn();
      } else {
        await onOffCluster.setOff();
      }
    });

    // v5.8.68: Read initial state so device doesn't show "unknown"
    onOffCluster.readAttributes(['onOff']).then(data => {
      if (data?.onOff != null) {
        this.log('[USB_DONGLE]', capabilityId, 'initial state =', data.onOff );this.safeSetCapabilityValue(capabilityId, !!data.onOff).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
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

    try {
      if (changedKeys.includes('power_on_behavior')) {
        const val = newSettings.power_on_behavior;
        const map = { off: 0, on: 1, toggle: 3, previous: 2 };
        const numVal = map[val] ?? 2;
        this.log('[USB_DONGLE] Setting power_on_behavior ', val, '(', numVal, ')');
        if (ep1?.clusters?.onOff) {
          await ep1.clusters.onOff.writeAttributes({ moesStartUpOnOff: numVal });
        }
      }

      if (changedKeys.includes('indicator_mode')) {
        const val = newSettings.indicator_mode;
        const map = { off: 0, on_off: 1, inverted: 2 };
        const numVal = map[val] ?? 1;
        this.log('[USB_DONGLE] Setting indicator_mode ', val, '(', numVal, ')');
        if (ep1?.clusters?.onOff) {
          await ep1.clusters.onOff.writeAttributes({ tuyaBacklightSwitch: numVal });
        }
      }
    } catch (err) {
      this.error('[USB_DONGLE] Failed to apply settings:', err.message);
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
          const power = safeMultiply(value, ENERGY_SCALING.measure_power.multiplier);
          this.log('[USB_DONGLE] Power:', power, 'W');
          if (this.hasCapability('measure_power')) {this.safeSetCapabilityValue('measure_power', parseFloat(power)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));}
      });

        electrical.on('attr.rmsVoltage', value => {
          const voltage = safeMultiply(value, ENERGY_SCALING.measure_voltage.multiplier);
          this.log('[USB_DONGLE] Voltage:', voltage, 'V');
          if (this.hasCapability('measure_voltage')) {this.safeSetCapabilityValue('measure_voltage', parseFloat(voltage)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));}
      });

        electrical.on('attr.rmsCurrent', value => {
          const current = value * ENERGY_SCALING.measure_current.multiplier;
          this.log('[USB_DONGLE] Current:', current, 'A');
          if (this.hasCapability('measure_current')) {this.safeSetCapabilityValue('measure_current', parseFloat(current)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));}
      });

        // Configure reporting
        await electrical.configureReporting({
          activePower: { minInterval: 10, maxInterval: 300, minChange: 1 },
          rmsVoltage: { minInterval: 60, maxInterval: 600, minChange: 10 },
          rmsCurrent: { minInterval: 10, maxInterval: 300, minChange: 10 },
        }).catch(err => this.log('[USB_DONGLE] electrical reporting config failed:', err.message));

        electrical.readAttributes(['activePower', 'rmsVoltage', 'rmsCurrent']).then(data => {
          if (data?.activePower != null) {
            const power = safeMultiply(data.activePower, ENERGY_SCALING.measure_power.multiplier);if (this.hasCapability('measure_power')) {this.safeSetCapabilityValue('measure_power', parseFloat(power)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));}
          }
          if (data?.rmsVoltage != null) {
            const voltage = safeMultiply(data.rmsVoltage, ENERGY_SCALING.measure_voltage.multiplier);
            if (this.hasCapability('measure_voltage')) {this.safeSetCapabilityValue('measure_voltage', parseFloat(voltage)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));}
          }
          if (data?.rmsCurrent != null) {
            const current = data.rmsCurrent * ENERGY_SCALING.measure_current.multiplier;
            if (this.hasCapability('measure_current')) {this.safeSetCapabilityValue('measure_current', parseFloat(current)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));}
          }
        }).catch(() => {});
      }

      if (metering) {
        this.log('[USB_DONGLE] Setting up metering listeners' );

        metering.on('attr.currentSummationDelivered', value => {
          const kWh = value / ENERGY_SCALING.meter_power.divisor;
          this.log('[USB_DONGLE] Energy:', kWh, 'kWh');
          if (this.hasCapability('meter_power')) {this.safeSetCapabilityValue('meter_power', parseFloat(kWh)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));}
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
            const kWh = data.currentSummationDelivered / ENERGY_SCALING.meter_power.divisor;if (this.hasCapability('meter_power')) {this.safeSetCapabilityValue('meter_power', parseFloat(kWh)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));}
          }
        }).catch(() => {});
      }

      this.log('[USB_DONGLE] Energy reporting configured' );
    } catch (err) {
      this.error('[USB_DONGLE] Failed to configure energy reporting, will retry:', err.message);
      // Retry 1 min plus tard si le Zigbee stack n'était pas prÃªt
      (this.homey && typeof this.homey.setTimeout === 'function' ? this.homey : globalThis).setTimeout(() => { if (this._destroyed) {return;} this._configureEnergyReporting(zclNode); }, 60 * 1000);
    }
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = UsbDongleDualRepeaterDevice;


