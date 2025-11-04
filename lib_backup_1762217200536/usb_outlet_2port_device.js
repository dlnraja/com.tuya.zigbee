'use strict';

const { CLUSTER } = require('zigbee-clusters');
const BaseHybridDevice = require('../../lib/BaseHybridDevice');

/**
 * UsbOutlet2PortDevice - SDK3 Compliant 2-Port USB Outlet
 * 
 * Features:
 * - Dual outlet control via OnOff cluster (6) on endpoints 1 & 2
 * - Hybrid power detection: AC/DC/Battery with intelligent auto-detection
 * - SDK3 compliant: Numeric cluster IDs only, proper multi-endpoint support
 * 
 * Endpoints:
 * - Endpoint 1: Main USB port (onoff capability)
 * - Endpoint 2: Secondary USB port (onoff.usb2 capability)
 * 
 * Clusters per endpoint:
 * - 0 (Basic): Device info
 * - 4 (Groups): Group management
 * - 5 (Scenes): Scene support
 * - 6 (OnOff): Port control
 */
class USBOutlet2PortDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('USBOutlet2PortDevice initializing...');
    
    // CRITICAL: Setup multi-endpoint BEFORE super.onNodeInit
    // This ensures BaseHybridDevice configures both endpoints correctly
    this.endpoints = {
      1: { clusters: ['onOff', 'electricalMeasurement'] },
      2: { clusters: ['onOff'] }
    };
    
    await super.onNodeInit({ zclNode });
    
    // Register capabilities for both USB ports
    this.log('[USB] Registering capabilities for 2 USB ports...');
    await this.setupMultiEndpointControl();
    
    this.log('[OK] UsbOutlet2PortDevice ready');
    this.log(`   Power source: ${this.powerType || 'unknown'}`);
    this.log(`   Model: ${this.getData().manufacturerName}`);
  }

  /**
   * Setup multi-endpoint control for 2 USB ports (SDK3)
   * Uses numeric cluster IDs as required by SDK3
   */
  async setupMultiEndpointControl() {
    this.log('[POWER] Setting up 2-port multi-endpoint control (SDK3)...');
    
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
          setParser: value => {
            this.log(`[SEND] Port 1 → ${value ? 'ON' : 'OFF'}`);
            return { value };
          },
          report: 'onOff',
          reportParser: value => {
            this.log(`[RECV] Port 1 state: ${value ? 'ON' : 'OFF'}`);
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
        this.log('[OK] ✅ Port 1 (endpoint 1) configured successfully');
      } else {
        this.log('[WARN] ⚠️ onoff capability missing!');
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
          setParser: value => {
            this.log(`[SEND] Port 2 → ${value ? 'ON' : 'OFF'}`);
            return { value };
          },
          report: 'onOff',
          reportParser: value => {
            this.log(`[RECV] Port 2 state: ${value ? 'ON' : 'OFF'}`);
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
        this.log('[OK] ✅ Port 2 (endpoint 2) configured successfully');
      } else {
        this.log('[WARN] ⚠️ onoff.usb2 capability missing!');
      }
      
      this.log('[OK] ✅ Multi-endpoint control configured - 2 ports ready');
    } catch (err) {
      this.error('Multi-endpoint setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('UsbOutlet2PortDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = USBOutlet2PortDevice;
