'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * usb_outlet_3gang - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const { CLUSTER } = require('zigbee-clusters');
const SwitchDevice = require('../../lib/devices/SwitchDevice');
const ReportingConfig = require('../../lib/utils/ReportingConfig');

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
class UsbOutlet3GangDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('⚡ UsbOutlet3GangDevice initializing (SDK3)...');
    
    // Set gang count for SwitchDevice base class
    this.gangCount = 3;
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit({ zclNode }).catch(err => this.error('Base init failed:', err));
    
    // Setup multi-endpoint control
    await this.setupMultiEndpointControl();
    
    // Setup aggregate power measurement
    await this.setupAggregatePowerMeasurement();
    
    this.log('[OK] UsbOutlet3GangDevice ready');
    this.log(`   Power source: ${this.powerType || 'unknown'}`);
    this.log(`   Model: ${this.getData().manufacturerName}`);
  }

  /**
   * Setup multi-endpoint control for 3 USB ports (SDK3)
   * Uses numeric cluster IDs as required by SDK3
   */
  async setupMultiEndpointControl() {
    this.log('[POWER] Setting up 3-port multi-endpoint control (SDK3)...');
    
    try {
      // Endpoint 1: Main USB port (onoff)
      this.log('🔌 Configuring Port 1 (endpoint 1)...');
      if (this.hasCapability('onoff')) {
        this.log('  - Capability onoff exists');
        this.log('  - Registering with CLUSTER.ON_OFF on endpoint 1');
        
        this.registerCapability('onoff', CLUSTER.ON_OFF, {
          endpoint: 1,
          get: 'onOff',
          set: 'onOff',
          setParser: value => ({ value }),
          report: 'onOff',
          reportParser: value => {
            this.log('[RECV] Port 1 state:', value ? 'on' : 'off');
            return value;
          },
          reportOpts: {
            configureAttributeReporting: ReportingConfig.getConfig('onoff')
          },
          getOpts: ReportingConfig.getGetOpts('onoff')
        });
        this.log('[OK] ✅ Port 1 (endpoint 1) configured successfully');
      }
      
      // Endpoint 2: Secondary USB port (onoff.usb2)
      this.log('🔌 Configuring Port 2 (endpoint 2)...');
      if (this.hasCapability('onoff.usb2')) {
        this.log('  - Capability onoff.usb2 exists');
        this.log('  - Registering with CLUSTER.ON_OFF on endpoint 2');
        
        this.registerCapability('onoff.usb2', CLUSTER.ON_OFF, {
          endpoint: 2,
          get: 'onOff',
          set: 'onOff',
          setParser: value => ({ value }),
          report: 'onOff',
          reportParser: value => {
            this.log('[RECV] Port 2 state:', value ? 'on' : 'off');
            return value;
          },
          reportOpts: {
            configureAttributeReporting: ReportingConfig.getConfig('onoff')
          },
          getOpts: ReportingConfig.getGetOpts('onoff')
        });
        this.log('[OK] ✅ Port 2 (endpoint 2) configured successfully');
      }
      
      // Endpoint 3: Tertiary USB port (onoff.usb3)
      this.log('🔌 Configuring Port 3 (endpoint 3)...');
      if (this.hasCapability('onoff.usb3')) {
        this.log('  - Capability onoff.usb3 exists');
        this.log('  - Registering with CLUSTER.ON_OFF on endpoint 3');
        
        this.registerCapability('onoff.usb3', CLUSTER.ON_OFF, {
          endpoint: 3,
          get: 'onOff',
          set: 'onOff',
          setParser: value => ({ value }),
          report: 'onOff',
          reportParser: value => {
            this.log('[RECV] Port 3 state:', value ? 'on' : 'off');
            return value;
          },
          reportOpts: {
            configureAttributeReporting: ReportingConfig.getConfig('onoff')
          },
          getOpts: ReportingConfig.getGetOpts('onoff')
        });
        this.log('[OK] ✅ Port 3 (endpoint 3) configured successfully');
      }
      
      this.log('[OK] Multi-endpoint control configured successfully');
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
      this.log('[WARN]  Endpoint 1 not available');
      return;
    }
    
    this.log('[POWER] Setting up aggregate power measurement (SDK3)...');
    
    // Cluster 2820 (ElectricalMeasurement): Total power for all ports
    if (endpoint.clusters[2820]) {
      try {
        // measure_power (activePower) - Aggregate for all 3 ports
        if (this.hasCapability('measure_power')) {
          this.log('  - Configuring measure_power with CLUSTER.ELECTRICAL_MEASUREMENT');
          
          this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
            get: 'activePower',
            report: 'activePower',
            reportParser: value => {
              // Convert to Watts (device reports in 0.1W units)
              const watts = value / 10;
              this.log('[DATA] Total Power (3 ports):', watts, 'W');
              return watts;
            },
            reportOpts: {
              configureAttributeReporting: ReportingConfig.getConfig('measure_power')
            },
            getOpts: ReportingConfig.getGetOpts('measure_power')
          });
          this.log('[OK] measure_power configured (cluster 2820)');
        }
      } catch (err) {
        this.error('Electrical measurement setup failed:', err);
      }
    } else {
      this.log('[INFO]  Cluster 2820 (ElectricalMeasurement) not available');
    }
    
    // Cluster 1794 (Metering): Total energy consumption
    if (endpoint.clusters[1794]) {
      try {
        // meter_power (currentSummationDelivered) - Aggregate for all 3 ports
        if (this.hasCapability('meter_power')) {
          this.log('  - Configuring meter_power with CLUSTER.METERING');
          
          this.registerCapability('meter_power', CLUSTER.METERING, {
            get: 'currentSummationDelivered',
            report: 'currentSummationDelivered',
            reportParser: value => {
              // Convert to kWh (device reports in Wh)
              const kwh = value / 1000;
              this.log('[DATA] Total Energy (3 ports):', kwh, 'kWh');
              return kwh;
            },
            reportOpts: {
              configureAttributeReporting: ReportingConfig.getConfig('meter_power')
            },
            getOpts: ReportingConfig.getGetOpts('meter_power')
          });
          this.log('[OK] meter_power configured (cluster 1794)');
        }
      } catch (err) {
        this.error('Metering setup failed:', err);
      }
    } else {
      this.log('[INFO]  Cluster 1794 (Metering) not available');
    }
    
    this.log('[OK] Aggregate power measurement setup complete');
  }

  async onDeleted() {
    this.log('UsbOutlet3GangDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = UsbOutlet3GangDevice;


module.exports = UsbOutlet3GangDevice;
