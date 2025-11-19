'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');

/**
 * UsbOutlet1GangDevice - SDK3 Compliant Single Gang USB Outlet
 *
 * Features:
 * - Single outlet control via OnOff cluster (6)
 * - Power measurement (cluster 2820): measure_power, measure_voltage, measure_current
 * - Energy metering (cluster 1794): meter_power
 * - Hybrid power detection: AC/DC/Battery with intelligent auto-detection
 * - SDK3 compliant: Numeric cluster IDs only, proper attribute reporting
 *
 * Clusters:
 * - 0 (Basic): Power source detection
 * - 1 (PowerConfiguration): Battery monitoring (if present)
 * - 3 (Identify): Device identification
 * - 4 (Groups): Group management
 * - 5 (Scenes): Scene support
 * - 6 (OnOff): Main outlet control
 * - 1794 (Metering): Energy consumption
 * - 2820 (ElectricalMeasurement): Power, voltage, current
 */
class UsbOutlet1GangDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    this.log('⚡ UsbOutlet1GangDevice initializing (SDK3)...');

    // Set gang count for SwitchDevice base class
    this.gangCount = 1;

    // Initialize base (power detection + switch control)
    await super.onNodeInit({ zclNode }).catch(err => this.error('Base init failed:', err));

    // Setup power measurement capabilities (SDK3)
    await this.setupPowerMeasurement();

    this.log('[OK] UsbOutlet1GangDevice ready');
    this.log(`   Power source: ${this.powerType || 'unknown'}`);
    this.log(`   Model: ${this.getData().manufacturerName}`);
  }

  /**
   * Setup power measurement capabilities (SDK3)
   * Uses numeric cluster IDs as required by SDK3
   */
  async setupPowerMeasurement() {
    // Skip power measurement if running on battery
    if (this.powerType === 'BATTERY') {
      this.log('⏭️  Skipping power measurement (battery mode)');
      return;
    }

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint) {
      this.log('[WARN]  Endpoint 1 not available');
      return;
    }

    this.log('[POWER] Setting up power measurement (SDK3)...');

    // Cluster 2820 (ElectricalMeasurement): Power, Voltage, Current
    if (endpoint.clusters[2820]) {
      try {
        // measure_power (activePower)
        if (this.hasCapability('measure_power')) {
          /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_power', 2820,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_power', Cluster: 2820
*/
          // this.registerCapability('measure_power', 2820, {
          //             get: 'activePower',
          //             report: 'activePower',
          //             reportParser: value => {
          //               // Convert to Watts (device reports in 0.1W units)
          //               const watts = value / 10;
          //               this.log('[DATA] Power:', watts, 'W');
          //               return watts;
          //             },
          //           reportOpts: {
          //             configureAttributeReporting: {
          //               minInterval: 5,        // 5 seconds minimum
          //               maxInterval: 300,      // 5 minutes maximum
          //               minChange: 1           // 0.1W change
          //             }
          //           },
          //           getOpts: {
          //             getOnStart: true
          //           }
          //         });
          //         this.log('[OK] measure_power configured (cluster 2820)');
        }

        // measure_voltage (rmsVoltage)
        if (this.hasCapability('measure_voltage')) {
          /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_voltage', 2820,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_voltage', Cluster: 2820
  */
          // this.registerCapability('measure_voltage', 2820, {
          //             get: 'rmsVoltage',
          //             report: 'rmsVoltage',
          //             reportParser: value => {
          const volts = value;
          this.log('[DATA] Voltage:', volts, 'V');
          return volts;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,       // 1 minute
              maxInterval: 600,      // 10 minutes
                minChange: 10          // 10V change
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      this.log('[OK] measure_voltage configured (cluster 2820)');
    }

    // measure_current (rmsCurrent)
    if (this.hasCapability('measure_current')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
    Original: this.registerCapability('measure_current', 2820,
    Replace with SDK3 pattern - see ZigbeeDevice docs
    Capability: 'measure_current', Cluster: 2820
    */
      // this.registerCapability('measure_current', 2820, {
      //             get: 'rmsCurrent',
      //             report: 'rmsCurrent',
      //             reportParser: value => {
      // Convert to Amps (device reports in mA)
      const amps = value / 1000;
      this.log('[DATA] Current:', amps, 'A');
      return amps;
    },
    reportOpts: {
      configureAttributeReporting: {
        minInterval: 60,       // 1 minute
          maxInterval: 600,      // 10 minutes
            minChange: 100         // 100mA change
      }
    },
    getOpts: {
      getOnStart: true
    }
  });
this.log('[OK] measure_current configured (cluster 2820)');
        }
      } catch (err) {
  this.error('Electrical measurement setup failed:', err);
}
    } else {
  this.log('[INFO]  Cluster 2820 (ElectricalMeasurement) not available');
}

// Cluster 1794 (Metering): Energy consumption
if (endpoint.clusters[1794]) {
  try {
    // meter_power (currentSummationDelivered)
    if (this.hasCapability('meter_power')) {
      /* REFACTOR: registerCapability deprecated with cluster spec.
Original: this.registerCapability('meter_power', 1794,
Replace with SDK3 pattern - see ZigbeeDevice docs
Capability: 'meter_power', Cluster: 1794
*/
      // this.registerCapability('meter_power', 1794, {
      //             get: 'currentSummationDelivered',
      //             report: 'currentSummationDelivered',
      //             reportParser: value => {
      // Convert to kWh (device reports in Wh)
      const kwh = value / 1000;
      this.log('[DATA] Energy:', kwh, 'kWh');
      return kwh;
    },
    reportOpts: {
      configureAttributeReporting: {
        minInterval: 300,      // 5 minutes
          maxInterval: 3600,     // 1 hour
            minChange: 100         // 100Wh change
      }
    },
    getOpts: {
      getOnStart: true
    }
  });
  this.log('[OK] meter_power configured (cluster 1794)');
}
      } catch (err) {
  this.error('Metering setup failed:', err);
}
    } else {
  this.log('[INFO]  Cluster 1794 (Metering) not available');
}

this.log('[OK] Power measurement setup complete');
  }

  async onDeleted() {
  this.log('UsbOutlet1GangDevice deleted');
  await super.onDeleted().catch(err => this.error(err));
}
}

module.exports = UsbOutlet1GangDevice;
