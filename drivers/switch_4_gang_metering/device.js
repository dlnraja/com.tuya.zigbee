const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

// Energy scaling divisors — ZCL raw attributes; Tuya-DP drivers use smartDivisor: true via SmartDivisorManager
const ENERGY_DIVISORS = {
  meter_power: { divisor: 100.0 },
  measure_power: { divisor: 100 },
  measure_current: { divisor: 1000 },
  measure_voltage: { divisor: 1 }
};

class switch_4_gang_metering extends UnifiedSwitchBase {

  async onNodeInit({zclNode}) {

    this.printNode();
    this.log('[SWITCH-4G] Endpoints:', zclNode.endpoints?.length);

    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    // Setting offsets and report intervals
    this.meteringOffset = this.getSetting('metering_offset');
    this.measureOffset = this.getSetting('measure_offset') * 100;
    this.minReportPower = this.getSetting('minReportPower') * 1000;
    this.minReportCurrent = this.getSetting('minReportCurrent') * 1000;
    this.minReportVoltage = this.getSetting('minReportVoltage') * 1000;

    // Determine endpoint based on subDeviceId
    const endpoint = subDeviceId === 'secondSwitch' ? 2 : subDeviceId === 'thirdSwitch' ? 3 : subDeviceId === 'fourthSwitch' ? 4 : 1;
    this.log(`Registering capabilities for endpoint ${endpoint}`);

    // Register only applicable capabilities based on the endpoint
    try {
      if (endpoint === 1) {

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
          this.error('Error when reading device attributes ', err);
        });

        // Register all capabilities for the first endpoint
        this.registerCapabilities(zclNode, { endpoint });
      } else {
        // Register only onoff for the endpoint
        this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint }, {
          getOpts: {
            getOnStart: true
          }
        });
      }
    } catch (error) {
      this.error(`Error registering capabilities for endpoint ${endpoint}:`, error);
    }

    // Attempt to configure instant reporting for the onOff attribute
    try {
      await zclNode.endpoints[endpoint].clusters.onOff.configureReporting({
        attribute: 'onOff',
        minimumReportInterval: 1, // Minimum interval in seconds (instant reporting)
        maximumReportInterval: 600, // Maximum interval in seconds
        reportableChange: 1, // Report on any change
      });
      this.log('Configured instant reporting for onOff');
    } catch (error) {
      // If reporting fails, log the error and set up fallback polling
      this.error('Failed to configure onOff reporting, setting up fallback polling', error);
      
      // Directly set the fallback polling interval without re-registering the capability
      this.setCapabilityOptions('onoff', {
        getOpts: {
          getOnStart: true,
          pollInterval: 60000, // Poll every 60 seconds as a fallback
        },
      });
    }

    // v10.6.2 FIX: listeners for the declared button.1..4 maintenance buttons.
    // This driver overrides onNodeInit() without calling super, so
    // UnifiedSwitchBase._registerButtonCapabilityListeners() never ran and
    // pressing a button in the app UI logged "Missing Capability Listener:
    // Button N" (diag Gmail 16/07/2026). Pressing button.N toggles endpoint N.
    // Sub-devices only carry the onoff capability (hasCapability guard).
    for (let gang = 1; gang <= 4; gang++) {
      const cap = `button.${gang}`;
      if (!this.hasCapability(cap)) {continue;}
      this.registerCapabilityListener(cap, async () => {
        this.log(`[SWITCH-4G] ${cap} pressed (UI) — toggling endpoint ${gang}`);
        const onOffCluster = zclNode.endpoints[gang]?.clusters?.onOff;
        if (onOffCluster && typeof onOffCluster.toggle === 'function') {
          await onOffCluster.toggle();
        }
        return true;
      });
    }

  }

  registerCapabilities(zclNode, options) {
    const endpoint = options.endpoint;

    // onOff capability
    this.registerCapability('onoff', CLUSTER.ON_OFF, options, {
      getOpts: {
        getOnStart: true
      }
    });

    // Only for endpoint 1 (main device), register additional capabilities
    if (endpoint === 1) {
      // meter_power capability
      this.registerCapability('meter_power', CLUSTER.METERING, options, {
        reportParser: value => (value * this.meteringOffset) / ENERGY_DIVISORS.meter_power.divisor,
        getParser: value => (value * this.meteringOffset) / ENERGY_DIVISORS.meter_power.divisor,
        getOpts: {
          getOnStart: true,
          pollInterval: 300000
        }
      });

      // measure_power capability
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => (value * this.measureOffset) / ENERGY_DIVISORS.measure_power.divisor,
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportPower
        }
      });

      // measure_current capability
      this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => value / ENERGY_DIVISORS.measure_current.divisor,
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportCurrent
        }
      });

      // measure_voltage capability
      this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, options, {
        reportParser: value => value / ENERGY_DIVISORS.measure_voltage.divisor,
        getOpts: {
          getOnStart: true,
          pollInterval: this.minReportVoltage
        }
      });
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log(`Double Power Point removed`);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // Check if specific settings have changed and update accordingly
    if (changedKeys.includes('metering_offset')) {
      this.meteringOffset = newSettings.metering_offset;
    }
    if (changedKeys.includes('measure_offset')) {
      this.measureOffset = newSettings.measure_offset * 100;
    }
    if (changedKeys.includes('minReportPower')) {
      this.minReportPower = newSettings.minReportPower * 1000;
    }
    if (changedKeys.includes('minReportCurrent')) {
      this.minReportCurrent = newSettings.minReportCurrent * 1000;
    }
    if (changedKeys.includes('minReportVoltage')) {
      this.minReportVoltage = newSettings.minReportVoltage * 1000;
    }
  }

}

module.exports = switch_4_gang_metering;

