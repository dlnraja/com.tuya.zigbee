'use strict';

const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const {CLUSTER} = require('zigbee-clusters');

const dataPoints = {
  state: 1,
  brightness: 2,
  minBrightness: 3,
  countdown: 9,
  powerOnBehavior: 14,
  lightType: 16,
};

class SwitchDimmer1Gang extends TuyaSpecificClusterDevice {

  async onNodeInit({zclNode}) {
    
    this.log('════════════════════════════════════════');
    this.log('SwitchDimmer1Gang onNodeInit STARTING');
    this.log('════════════════════════════════════════');
    
    await super.onNodeInit({zclNode});
    
    this.printNode();

    // Track last state for detecting physical button presses
    this._lastOnoffState = null;
    this._lastBrightnessValue = null;

    // Register Tuya datapoint mappings
    this.log('Registering Tuya datapoint mappings...');
    
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
      this.log('onoff capability changed to:', value);
      await this.sendTuyaCommand(dataPoints.state, value, 'bool');
    });
    
    this.registerCapabilityListener('dim', async (value) => {
      this.log('Dim capability changed to:', value);
      const brightness = Math.round(10 + (value * 990));
      this.log('Converted to Tuya brightness:', brightness);
      await this.sendTuyaCommand(dataPoints.brightness, brightness, 'value');
    });

    this.setupTuyaClusterListener();

    this.log('════════════════════════════════════════');
    this.log('SwitchDimmer1Gang onNodeInit COMPLETE');
    this.log('════════════════════════════════════════');
  }

  setupTuyaClusterListener() {
    try {
      const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.tuya;

      if (!tuyaCluster) {
        this.error('Tuya cluster not found on endpoint 1');
        return;
      }

      this.log('Setting up Tuya cluster listener...');

      tuyaCluster.on('dataReport', (data) => {
        this.log('Tuya dataReport received:', JSON.stringify(data, null, 2));
        this.handleTuyaDataReport(data);
      });

      tuyaCluster.on('response', (data) => {
        this.log('Tuya response:', JSON.stringify(data, null, 2));
        this.handleTuyaDataReport(data);
      });

      tuyaCluster.on('reporting', (data) => {
        this.log('Tuya reporting:', JSON.stringify(data, null, 2));
        this.handleTuyaDataReport(data, true); // Pass true to indicate physical press
      });

      this.log('✅ Tuya cluster listener configured');

    } catch (err) {
      this.error('Failed to setup Tuya cluster:', err);
    }
  }

  async sendTuyaCommand(dp, value, type = 'value') {
    try {
      const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.tuya;

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available');
      }

      this.log(`════════════════════════════════════════`);
      this.log(`Sending Tuya command: DP ${dp} = ${value} (${type})`);
      this.log(`════════════════════════════════════════`);

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

      this.log('Data buffer:', dataBuffer);
      this.log('Data type:', datatype);

      const lengthBuffer = Buffer.alloc(2);
      lengthBuffer.writeUInt16BE(dataBuffer.length, 0);

      const transid = Math.floor(Math.random() * 256);

      this.log('Calling datapoint command...');
      await tuyaCluster.datapoint({
        status: 0,
        transid,
        dp,
        datatype,
        length: lengthBuffer,
        data: dataBuffer,
      });

      this.log('✅ Tuya command sent successfully');

    } catch (err) {
      this.error('Failed to send Tuya command:', err);
      this.error('Error stack:', err.stack);
      throw err;
    }
  }

  handleTuyaDataReport(data, isPhysicalPress = false) {
    this.log('handleTuyaDataReport called with:', data, 'isPhysicalPress:', isPhysicalPress);
    
    if (!data || typeof data.dp === 'undefined') {
      this.log('Invalid data format');
      return;
    }

    // Handle state (onoff)
    if (data.dp === dataPoints.state) {
      let state;
      if (Buffer.isBuffer(data.data)) {
        state = data.data.readUInt8(0) === 1;
      } else if (Array.isArray(data.data)) {
        state = data.data[0] === 1;
      } else {
        state = Boolean(data.data);
      }
      
      this.log('State update:', state);
      
      // Trigger flow cards if this is a physical button press (reporting event)
      if (isPhysicalPress && this._lastOnoffState !== null && this._lastOnoffState !== state) {
        this.log('Physical button press detected!');
        if (state) {
          this.log('Triggering: switch_dimmer_1gang_turned_on');
          this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_turned_on')
            .trigger(this, {}, {})
            .catch(this.error);
        } else {
          this.log('Triggering: switch_dimmer_1gang_turned_off');
          this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_turned_off')
            .trigger(this, {}, {})
            .catch(this.error);
        }
      }
      
      this._lastOnoffState = state;
      this.setCapabilityValue('onoff', state).catch(this.error);
    }

    // Handle brightness
    if (data.dp === dataPoints.brightness) {
      let brightnessRaw;
      if (Buffer.isBuffer(data.data)) {
        brightnessRaw = data.data.readInt32BE(0);
      } else if (Array.isArray(data.data) && data.data.length >= 4) {
        brightnessRaw = Buffer.from(data.data).readInt32BE(0);
      } else {
        brightnessRaw = data.data || 0;
      }
      
      const brightness = Math.max(0, Math.min(1, (brightnessRaw - 10) / 990));
      this.log('Brightness update - raw:', brightnessRaw, 'converted:', brightness);
      
      // Trigger flow cards if this is a physical button press
      if (isPhysicalPress && this._lastBrightnessValue !== null) {
        if (brightnessRaw > this._lastBrightnessValue) {
          this.log('Triggering: switch_dimmer_1gang_brightness_increased');
          this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_increased')
            .trigger(this, {brightness}, {})
            .catch(this.error);
        } else if (brightnessRaw < this._lastBrightnessValue) {
          this.log('Triggering: switch_dimmer_1gang_brightness_decreased');
          this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_decreased')
            .trigger(this, {brightness}, {})
            .catch(this.error);
        }
      }
      
      this._lastBrightnessValue = brightnessRaw;
      this.setCapabilityValue('dim', brightness).catch(this.error);
    }
  }

  onDeleted() {
    this.log('Switch Touch Dimmer (1 Gang) removed');
  }

}

module.exports = SwitchDimmer1Gang;
