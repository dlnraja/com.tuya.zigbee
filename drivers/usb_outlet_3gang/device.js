'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * UsbOutlet3GangDevice - SDK3 Compliant 3-Port USB Outlet
 * 
 * Features:
 * - Triple outlet control via OnOff cluster (6) on endpoints 1, 2 & 3
 * - Aggregate power measurement (cluster 2820): measure_power, meter_power
 * - Hybrid power detection: AC/DC/Battery with intelligent auto-detection
 * - SDK3 compliant: Numeric cluster IDs only, proper multi-endpoint support
 * 
 * Endpoints:
 * - Endpoint 1: Main USB port (onoff capability)
 * - Endpoint 2: Secondary USB port (onoff.usb2 capability)
 * - Endpoint 3: Tertiary USB port (onoff.usb3 capability)
 * 
 * Clusters per endpoint:
 * - 0 (Basic): Device info
 * - 4 (Groups): Group management
 * - 5 (Scenes): Scene support
 * - 6 (OnOff): Port control
 */
class UsbOutlet3GangDevice extends SwitchDevice {

  async onNodeInit() {
    this.log('⚡ UsbOutlet3GangDevice initializing (SDK3)...');
    
    // Set gang count for SwitchDevice base class
    this.gangCount = 3;
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit().catch(err => this.error('Base init failed:', err));
    
    // Setup multi-endpoint control
    await this.setupMultiEndpointControl();
    
    // Setup aggregate power measurement
    await this.setupAggregatePowerMeasurement();
    
    this.log('✅ UsbOutlet3GangDevice ready');
    this.log(`   Power source: ${this.powerType || 'unknown'}`);
    this.log(`   Model: ${this.getData().manufacturerName}`);
  }

  /**
   * Setup multi-endpoint control for 3 USB ports (SDK3)
   * Uses numeric cluster IDs as required by SDK3
   */
  async setupMultiEndpointControl() {
    this.log('🔌 Setting up 3-port multi-endpoint control (SDK3)...');
    
    try {
      // Endpoint 1: Main USB port (onoff)
      if (this.hasCapability('onoff')) {
        /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('onoff', 6,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'onoff', Cluster: 6
*/
// this.registerCapability('onoff', 6, {
          endpoint: 1,
          get: 'onOff',
          set: 'onOff',
          setParser: value => ({ value }),
          report: 'onOff',
          reportParser: value => {
            this.log('📥 Port 1 state:', value ? 'on' : 'off');
            return value;
          },
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 0,
              maxInterval: 300,
              minChange: 1
            }
          },
          getOpts: {
            getOnStart: true
          }
        });
        this.log('✅ Port 1 (endpoint 1) configured');
      }
      
      // Endpoint 2: Secondary USB port (onoff.usb2)
      if (this.hasCapability('onoff.usb2')) {
        /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('onoff.usb2', 6,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'onoff.usb2', Cluster: 6
*/
// this.registerCapability('onoff.usb2', 6, {
          endpoint: 2,
          get: 'onOff',
          set: 'onOff',
          setParser: value => ({ value }),
          report: 'onOff',
          reportParser: value => {
            this.log('📥 Port 2 state:', value ? 'on' : 'off');
            return value;
          },
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 0,
              maxInterval: 300,
              minChange: 1
            }
          },
          getOpts: {
            getOnStart: true
          }
        });
        this.log('✅ Port 2 (endpoint 2) configured');
      }
      
      // Endpoint 3: Tertiary USB port (onoff.usb3)
      if (this.hasCapability('onoff.usb3')) {
        /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('onoff.usb3', 6,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'onoff.usb3', Cluster: 6
*/
// this.registerCapability('onoff.usb3', 6, {
          endpoint: 3,
          get: 'onOff',
          set: 'onOff',
          setParser: value => ({ value }),
          report: 'onOff',
          reportParser: value => {
            this.log('📥 Port 3 state:', value ? 'on' : 'off');
            return value;
          },
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 0,
              maxInterval: 300,
              minChange: 1
            }
          },
          getOpts: {
            getOnStart: true
          }
        });
        this.log('✅ Port 3 (endpoint 3) configured');
      }
      
      this.log('✅ Multi-endpoint control configured successfully');
    } catch (err) {
      this.error('Multi-endpoint setup failed:', err);
    }
  }

  /**
   * Setup aggregate power measurement for all 3 ports (SDK3)
   * Most devices report total power consumption for all ports
   */
  async setupAggregatePowerMeasurement() {
    // Skip power measurement if running on battery
    if (this.powerType === 'BATTERY') {
      this.log('⏭️  Skipping power measurement (battery mode)');
      return;
    }
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint) {
      this.log('⚠️  Endpoint 1 not available');
      return;
    }
    
    this.log('🔌 Setting up aggregate power measurement (SDK3)...');
    
    // Cluster 2820 (ElectricalMeasurement): Total power for all ports
    if (endpoint.clusters[2820]) {
      try {
        // measure_power (activePower) - Aggregate for all 3 ports
        if (this.hasCapability('measure_power')) {
          /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_power', 2820,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_power', Cluster: 2820
*/
// this.registerCapability('measure_power', 2820, {
            get: 'activePower',
            report: 'activePower',
            reportParser: value => {
              // Convert to Watts (device reports in 0.1W units)
              const watts = value / 10;
              this.log('📊 Total Power (3 ports):', watts, 'W');
              return watts;
            },
            reportOpts: {
              configureAttributeReporting: {
                minInterval: 5,        // 5 seconds minimum
                maxInterval: 300,      // 5 minutes maximum
                minChange: 1           // 0.1W change
              }
            },
            getOpts: {
              getOnStart: true
            }
          });
          this.log('✅ measure_power configured (cluster 2820)');
        }
      } catch (err) {
        this.error('Electrical measurement setup failed:', err);
      }
    } else {
      this.log('ℹ️  Cluster 2820 (ElectricalMeasurement) not available');
    }
    
    // Cluster 1794 (Metering): Total energy consumption
    if (endpoint.clusters[1794]) {
      try {
        // meter_power (currentSummationDelivered) - Aggregate for all 3 ports
        if (this.hasCapability('meter_power')) {
          /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('meter_power', 1794,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'meter_power', Cluster: 1794
*/
// this.registerCapability('meter_power', 1794, {
            get: 'currentSummationDelivered',
            report: 'currentSummationDelivered',
            reportParser: value => {
              // Convert to kWh (device reports in Wh)
              const kwh = value / 1000;
              this.log('📊 Total Energy (3 ports):', kwh, 'kWh');
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
          this.log('✅ meter_power configured (cluster 1794)');
        }
      } catch (err) {
        this.error('Metering setup failed:', err);
      }
    } else {
      this.log('ℹ️  Cluster 1794 (Metering) not available');
    }
    
    this.log('✅ Aggregate power measurement setup complete');
  }

  async onDeleted() {
    this.log('UsbOutlet3GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = UsbOutlet3GangDevice;
