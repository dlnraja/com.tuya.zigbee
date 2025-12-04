'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * MultiGangUSBSocketDevice - 2-Gang Socket with 2 USB Ports
 *
 * Based on Zigbee2MQTT TS011F_2_gang_2_usb_wall:
 * - L1 (Endpoint 1): Socket 1
 * - L2 (Endpoint 2): Socket 2
 * - L3 (Endpoint 3): USB 1
 * - L4 (Endpoint 4): USB 2
 *
 * Manufacturer IDs: _TZ3000_cfnprab5, _TZ3000_ww6drja5, _TZ3000_2xlvlnvp
 */
class MultiGangUSBSocketDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('MultiGangUSBSocketDevice initializing...');

    // Detect number of endpoints
    const endpoints = Object.keys(zclNode.endpoints || {}).filter(e => e !== 'groups');
    this.log(`[USB] Detected endpoints: ${endpoints.join(', ')}`);

    // Mapping: capability -> endpoint
    const capabilityEndpointMap = {
      'onoff': 1,           // Socket 1
      'onoff.socket2': 2,   // Socket 2
      'onoff.usb1': 3,      // USB 1
      'onoff.usb2': 4       // USB 2
    };

    // Setup each capability with its endpoint
    for (const [capability, endpointId] of Object.entries(capabilityEndpointMap)) {
      const endpoint = zclNode.endpoints[endpointId];

      if (endpoint?.clusters?.onOff) {
        this.log(`[USB] Setting up ${capability} on endpoint ${endpointId}`);

        // Register capability
        if (!this.hasCapability(capability)) {
          await this.addCapability(capability).catch(err => {
            this.log(`[USB] Could not add ${capability}:`, err.message);
          });
        }

        // Register onOff cluster for this endpoint
        this.registerCapability(capability, CLUSTER.ON_OFF, {
          endpoint: endpointId,
          get: 'onOff',
          set: value => (value ? 'setOn' : 'setOff'),
          setParser: () => ({}),
          report: 'onOff',
          reportParser: value => value
        });

        // Capability listener
        this.registerCapabilityListener(capability, async (value) => {
          this.log(`[USB] ${capability} -> ${value}`);
          try {
            const cluster = endpoint.clusters.onOff;
            if (value) {
              await cluster.setOn();
            } else {
              await cluster.setOff();
            }
          } catch (err) {
            this.error(`[USB] Error setting ${capability}:`, err.message);
            throw err;
          }
        });

        // Attribute report listener
        endpoint.clusters.onOff.on('attr.onOff', (value) => {
          this.log(`[USB] ${capability} report: ${value}`);
          this.setCapabilityValue(capability, value).catch(this.error);
        });

      } else {
        this.log(`[USB] Endpoint ${endpointId} not available for ${capability}`);
        // Remove capability if endpoint not available
        if (this.hasCapability(capability) && capability !== 'onoff') {
          await this.removeCapability(capability).catch(() => { });
        }
      }
    }

    // Setup energy monitoring if available (usually on endpoint 1)
    await this._setupEnergyMonitoring(zclNode);

    this.log('MultiGangUSBSocketDevice initialized');
  }

  /**
   * Setup energy monitoring clusters
   */
  async _setupEnergyMonitoring(zclNode) {
    const endpoint1 = zclNode.endpoints[1];

    // Metering cluster (0x0702) - meter_power
    if (endpoint1?.clusters?.seMetering) {
      this.log('[USB] Setting up metering cluster');

      if (this.hasCapability('meter_power')) {
        this.registerCapability('meter_power', CLUSTER.METERING, {
          endpoint: 1,
          get: 'currentSummationDelivered',
          report: 'currentSummationDelivered',
          reportParser: value => {
            const divisor = endpoint1.clusters.seMetering.divisor || 1000;
            return value / divisor;
          }
        });
      }
    }

    // Electrical Measurement cluster (0x0B04) - measure_power, voltage, current
    if (endpoint1?.clusters?.haElectricalMeasurement) {
      this.log('[USB] Setting up electrical measurement cluster');

      if (this.hasCapability('measure_power')) {
        this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
          endpoint: 1,
          get: 'activePower',
          report: 'activePower',
          reportParser: value => value / 10
        });
      }

      if (this.hasCapability('measure_voltage')) {
        this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
          endpoint: 1,
          get: 'rmsVoltage',
          report: 'rmsVoltage',
          reportParser: value => value / 10
        });
      }

      if (this.hasCapability('measure_current')) {
        this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
          endpoint: 1,
          get: 'rmsCurrent',
          report: 'rmsCurrent',
          reportParser: value => value / 1000
        });
      }
    }
  }

  async onDeleted() {
    this.log('MultiGangUSBSocketDevice deleted');
  }
}

module.exports = MultiGangUSBSocketDevice;
