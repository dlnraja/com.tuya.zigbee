'use strict';

const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const {CLUSTER} = require('zigbee-clusters');

const dataPoints = {
  state: 1,
  brightness: 2,
  minBrightness: 3,
  countdown: 9,
  powerOnBehavior: 14,
  lightType: 16,
};

/**
 * Driver for Bseed Touch Dimmer Wall Switches
 * Supports manufacturer IDs: _TZE200_3p5ydos3, _TZE204_n9ctkb6j
 * Model: TS0601
 */
class SwitchDimmer1Gang extends TuyaSpecificClusterDevice {

  async onNodeInit({zclNode}) {
    
    this.log('Bseed Touch Dimmer initializing...');
    
    // Call parent initialization
    await super.onNodeInit({zclNode});
    
    this.printNode();

    // Track last known state to detect actual changes
    this._lastState = null;
    this._lastBrightness = null;
    this._lastStateTimestamp = 0;
    this._lastBrightnessTimestamp = 0;

    // Register Tuya datapoint mappings
    this.log('Registering datapoint mappings...');
    
    this.registerTuyaDatapoint(dataPoints.state, 'onoff', {
      type: 'bool',
    });
    
    this.registerTuyaDatapoint(dataPoints.brightness, 'dim', {
      type: 'value',
      scale: 990,
      offset: -0.0101,
    });

    // Register capability listeners
    this.log('Registering capability listeners...');
    
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('Setting onoff to:', value);
      await this.sendTuyaCommand(dataPoints.state, value, 'bool');
    });
    
    this.registerCapabilityListener('dim', async (value) => {
      this.log('Setting brightness to:', Math.round(value * 100) + '%');
      const brightness = Math.round(10 + (value * 990));
      await this.sendTuyaCommand(dataPoints.brightness, brightness, 'value');
    });

    // Setup listener for incoming data
    this.setupTuyaClusterListener();

    this.log('Bseed Touch Dimmer ready');
  }

  /**
   * Setup Tuya cluster listener to receive device state updates
   */
  setupTuyaClusterListener() {
    try {
      const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.tuya;

      if (!tuyaCluster) {
        this.error('Tuya cluster not found on endpoint 1');
        return;
      }

      this.log('Setting up cluster listeners...');

      // Listen for query responses - this is where physical button presses come from
      tuyaCluster.on('response', (data) => {
        this.log('[response event]');
        // Treat as physical press if it contains actual data
        const isPhysicalPress = data && typeof data.dp !== 'undefined';
        this.handleTuyaDataReport(data, isPhysicalPress);
      });

      // Listen for automatic state reports (polling/heartbeat)
      tuyaCluster.on('dataReport', (data) => {
        this.log('[dataReport event]');
        this.handleTuyaDataReport(data, false);
      });

      // Listen for reporting events (might not be used by this device)
      tuyaCluster.on('reporting', (data) => {
        this.log('[reporting event]');
        this.handleTuyaDataReport(data, true);
      });

      this.log('Cluster listeners configured');

    } catch (err) {
      this.error('Failed to setup cluster listeners:', err);
    }
  }

  /**
   * Send command to Tuya device
   * @param {number} dp - Datapoint ID
   * @param {*} value - Value to send
   * @param {string} type - Data type (bool/value/enum/string)
   */
  async sendTuyaCommand(dp, value, type = 'value') {
    try {
      const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.tuya;

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available');
      }

      // Prepare data buffer based on type
      let dataBuffer;
      let datatype;
      
      switch (type) {
        case 'bool':
          dataBuffer = Buffer.alloc(1);
          dataBuffer.writeUInt8(value ? 1 : 0, 0);
          datatype = 1;
          break;
          
        case 'value':
          dataBuffer = Buffer.alloc(4);
          dataBuffer.writeInt32BE(value, 0);
          datatype = 2;
          break;
          
        case 'enum':
          dataBuffer = Buffer.alloc(1);
          dataBuffer.writeUInt8(Number(value), 0);
          datatype = 4;
          break;
          
        case 'string':
          dataBuffer = Buffer.from(String(value), 'utf8');
          datatype = 3;
          break;
          
        default:
          dataBuffer = Buffer.from([value]);
          datatype = 2;
      }

      // Create length buffer (big-endian 16-bit)
      const lengthBuffer = Buffer.alloc(2);
      lengthBuffer.writeUInt16BE(dataBuffer.length, 0);

      // Send command via Tuya datapoint protocol
      await tuyaCluster.datapoint({
        status: 0,
        transid: Math.floor(Math.random() * 256),
        dp,
        datatype,
        length: lengthBuffer,
        data: dataBuffer,
      });

    } catch (err) {
      this.error('Failed to send command:', err);
      throw err;
    }
  }

  /**
   * Handle incoming Tuya data reports
   * @param {Object} data - Tuya datapoint report
   * @param {boolean} isPhysicalPress - True if triggered by physical button
   */
  handleTuyaDataReport(data, isPhysicalPress = false) {
    
    if (!data || typeof data.dp === 'undefined') {
      return;
    }

    const now = Date.now();

    // Handle on/off state (DP 1)
    if (data.dp === dataPoints.state) {
      let state;
      
      if (Buffer.isBuffer(data.data)) {
        state = data.data.readUInt8(0) === 1;
      } else if (Array.isArray(data.data)) {
        state = data.data[0] === 1;
      } else {
        state = Boolean(data.data);
      }
      
      // Check if this is a duplicate within 1 second
      const isDuplicate = (this._lastState === state && (now - this._lastStateTimestamp) < 1000);
      
      if (!isDuplicate) {
        const eventType = isPhysicalPress ? '🔘 PHYSICAL BUTTON' : '📡 automatic';
        this.log(`State update: ${state ? 'ON' : 'OFF'} [response] ${eventType}`);
        
        const stateChanged = this._lastState !== state;
        this._lastState = state;
        this._lastStateTimestamp = now;
        
        if (stateChanged) {
          this.setCapabilityValue('onoff', state).catch(this.error);
        }

        // Trigger flow cards for physical button presses
        if (isPhysicalPress && stateChanged) {
          const triggerCard = state ? 'switch_dimmer_1gang_turned_on' : 'switch_dimmer_1gang_turned_off';
          this.log('🎯 Triggering flow card:', triggerCard);
          
          this.homey.flow.getDeviceTriggerCard(triggerCard)
            .trigger(this, {}, {})
            .then(() => {
              this.log('✅ Flow triggered successfully');
            })
            .catch(err => {
              this.error('❌ Flow trigger error:', err);
            });
        }
      }
    }

    // Handle brightness (DP 2)
    if (data.dp === dataPoints.brightness) {
      let brightnessRaw;
      
      if (Buffer.isBuffer(data.data)) {
        brightnessRaw = data.data.readInt32BE(0);
      } else if (Array.isArray(data.data) && data.data.length >= 4) {
        brightnessRaw = Buffer.from(data.data).readInt32BE(0);
      } else {
        brightnessRaw = data.data || 0;
      }
      
      // Convert from Tuya range (10-1000) to Homey range (0-1)
      const brightness = Math.max(0, Math.min(1, (brightnessRaw - 10) / 990));
      
      // Check if brightness actually changed (> 1% difference) and not a duplicate within 1 second
      const brightnessChanged = this._lastBrightness === null || 
                                Math.abs(brightness - this._lastBrightness) > 0.01;
      const isDuplicate = !brightnessChanged && (now - this._lastBrightnessTimestamp) < 1000;
      
      if (!isDuplicate && brightnessChanged) {
        const eventType = isPhysicalPress ? '🔘 PHYSICAL BUTTON' : '📡 automatic';
        this.log(`Brightness update: ${Math.round(brightness * 100)}% [response] ${eventType}`);
        
        const previousBrightness = this._lastBrightness;
        this._lastBrightness = brightness;
        this._lastBrightnessTimestamp = now;
        
        this.setCapabilityValue('dim', brightness).catch(this.error);

        // Trigger flow cards for physical brightness changes
        if (isPhysicalPress && previousBrightness !== null) {
          const triggerCard = brightness > previousBrightness 
            ? 'switch_dimmer_1gang_brightness_increased' 
            : 'switch_dimmer_1gang_brightness_decreased';
          
          this.log('🎯 Triggering flow card:', triggerCard, 'with brightness:', brightness);
          
          this.homey.flow.getDeviceTriggerCard(triggerCard)
            .trigger(this, {brightness: brightness}, {})
            .then(() => {
              this.log('✅ Flow triggered successfully with brightness:', Math.round(brightness * 100) + '%');
            })
            .catch(err => {
              this.error('❌ Flow trigger error:', err);
            });
        }
      }
    }
  }

  /**
   * Called when device is deleted
   */
  onDeleted() {
    this.log('Bseed Touch Dimmer removed');
  }

}

module.exports = SwitchDimmer1Gang;
