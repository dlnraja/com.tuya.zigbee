'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class UsbOutlet2PortDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('UsbOutlet2PortDevice initialized');
    this.log('Device model:', this.getData().manufacturerName, this.getData().productId);

    // Register capability listeners
    this.registerCapabilityListeners();

    // Detect and configure power source (hybrid intelligent detection)
    await this.detectAndConfigurePowerSource(zclNode).catch(err => this.error(err));

    // Configure power monitoring if available
    await this.configurePowerMonitoring().catch(err => this.error(err));
  }

  /**
   * Register capability listeners for USB port control
   */
  registerCapabilityListeners() {
    // Port 1 (main onoff)
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('Port 1 turned', value ? 'on' : 'off');
      
      // TODO: Wrap in try/catch
      await this.zclNode.endpoints[1].clusters.onOff.toggle().catch(err => this.error(err));
      
      // Trigger flow card
      const triggerCard = value ? 
        'usb_outlet_2port_port1_turned_on' : 
        'usb_outlet_2port_port1_turned_off';
      
      await this.homey.flow.getDeviceTriggerCard(triggerCard)
        .trigger(this)
        .catch(err => this.error('Error triggering flow card:', err));
      
      return value;
    });

    // Port 2
    this.registerCapabilityListener('onoff.usb2', async (value) => {
      this.log('Port 2 turned', value ? 'on' : 'off');
      
      // TODO: Wrap in try/catch
      await this.zclNode.endpoints[2].clusters.onOff.toggle().catch(err => this.error(err));
      
      // Trigger flow card
      const triggerCard = value ? 
        'usb_outlet_2port_port2_turned_on' : 
        'usb_outlet_2port_port2_turned_off';
      
      await this.homey.flow.getDeviceTriggerCard(triggerCard)
        .trigger(this)
        .catch(err => this.error('Error triggering flow card:', err));
      
      return value;
    });
  }

  /**
   * Hybrid intelligent power source detection
   * Detects AC, DC, or Battery power and configures appropriately
   */
  async detectAndConfigurePowerSource(zclNode) {
    try {
      const powerSourceSetting = this.getSetting('power_source');
      
      if (powerSourceSetting !== 'auto') {
        this.log('✅ Manual power source selected:', powerSourceSetting);
        this.powerSource = powerSourceSetting;
        return;
      }

      // Auto-detect power source from device
      const basicCluster = zclNode.endpoints[1]?.clusters?.basic;
      if (basicCluster?.attributes?.powerSource) {
        const detectedSource = basicCluster.attributes.powerSource;
        this.log('🔍 Detected power source from device:', detectedSource);
        
        // Map Zigbee power source values
        const powerSourceMap = {
          0: 'unknown',
          1: 'ac',      // Mains (single phase)
          2: 'ac',      // Mains (3 phase)
          3: 'battery', // Battery
          4: 'dc',      // DC source
          5: 'battery', // Emergency mains constantly powered
          6: 'battery'  // Emergency mains and transfer switch
        };
        
        this.powerSource = powerSourceMap[detectedSource] || 'ac';
        this.log('✅ Auto-detected power source:', this.powerSource);
        
        // USB outlets reporting battery are usually AC powered (firmware bug)
        if (this.powerSource === 'battery') {
          this.log('⚠️  USB outlet reports battery but is likely AC powered');
          this.log('💡 Assuming AC power for USB outlet (user can override in settings)');
          this.powerSource = 'ac';
        }
      } else {
        this.log('⚠️  Could not detect power source, assuming AC for USB device');
        this.powerSource = 'ac';
      }
    } catch (err) {
      this.error('Error detecting power source:', err);
      this.powerSource = 'ac'; // Safe default for USB outlets
    }
  }

  /**
   * Configure power monitoring if capabilities are available
   */
  async configurePowerMonitoring() {
    // Power measurement (optional for USB outlets)
    if (this.hasCapability('measure_power')) {
      try {
        this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
          get: 'activePower',
          report: 'activePower',
          reportParser: value => value / 10 // Convert to Watts
        });
        this.log('✅ Power monitoring configured');
      } catch (err) {
        this.log('Power monitoring not available:', err.message);
      }
    }

    // Energy meter (optional)
    if (this.hasCapability('meter_power')) {
      try {
        this.registerCapability('meter_power', CLUSTER.METERING, {
          get: 'currentSummationDelivered',
          report: 'currentSummationDelivered',
          reportParser: value => value / 1000 // Convert to kWh
        });
        this.log('✅ Energy meter configured');
      } catch (err) {
        this.log('Energy meter not available:', err.message);
      }
    }
  }

  /**
   * Handle device removal
   */
  async onDeleted() {
    this.log('UsbOutlet2PortDevice removed');
  }
}

module.exports = UsbOutlet2PortDevice;
