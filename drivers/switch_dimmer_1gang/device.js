'use strict';

const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const {CLUSTER} = require('zigbee-clusters');

// Debug mode toggle - set to true for detailed logging
const DEBUG_MODE = false;

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

    if (DEBUG_MODE) {
      this.log('════════════════════════════════════════');
      this.log('SwitchDimmer1Gang onNodeInit STARTING');
      this.log('════════════════════════════════════════');
    }

    await super.onNodeInit({zclNode});

    if (DEBUG_MODE) {
      this.printNode();
    }

    // Track last state for detecting physical button presses
    this._lastOnoffState = this.getCapabilityValue('onoff');
    this._lastBrightnessValue = null;

    this._isAppCommand = false;
    this._appCommandDP = null;

    // Register Tuya datapoint mappings
    if (DEBUG_MODE) {
      this.log('Registering Tuya datapoint mappings...');
    }

    this.registerTuyaDatapoint(dataPoints.state, 'onoff', {
      type: 'bool',
    });

    this.registerTuyaDatapoint(dataPoints.brightness, 'dim', {
      type: 'value',
      scale: 990,
      offset: -0.0101,
    });

    this.registerCapabilityListener('onoff', async (value) => {
      if (DEBUG_MODE) {
        this.log('onoff capability changed to:', value);
      }

      // Mark as app command BEFORE sending
      this._isAppCommand = true;
      this._appCommandDP = dataPoints.state;

      try {
        await this.sendTuyaCommand(dataPoints.state, value, 'bool');
      } finally {
        // Clear flag after a delay to ensure response is processed
        setTimeout(() => {
          if (this._appCommandDP === dataPoints.state) {
            this._isAppCommand = false;
            this._appCommandDP = null;
          }
        }, 1500);
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      if (DEBUG_MODE) {
        this.log('Dim capability changed to:', value);
      }

      // Mark as app command BEFORE sending
      this._isAppCommand = true;
      this._appCommandDP = dataPoints.brightness;

      const brightness = Math.round(10 + (value * 990));
      if (DEBUG_MODE) {
        this.log('Converted to Tuya brightness:', brightness);
      }

      try {
        await this.sendTuyaCommand(dataPoints.brightness, brightness, 'value');
      } finally {
        // Clear flag after a delay to ensure response is processed
        setTimeout(() => {
          if (this._appCommandDP === dataPoints.brightness) {
            this._isAppCommand = false;
            this._appCommandDP = null;
          }
        }, 1500);
      }
    });

    this.setupTuyaClusterListener();

    if (DEBUG_MODE) {
      this.log('════════════════════════════════════════');
      this.log('SwitchDimmer1Gang onNodeInit COMPLETE');
      this.log('════════════════════════════════════════');
    }
  }

  setupTuyaClusterListener() {
    try {
      const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.tuya;

      if (!tuyaCluster) {
        this.error('Tuya cluster not found on endpoint 1');
        return;
      }

      tuyaCluster.on('response', (data) => {
        // Check if this is a response to an app command
        const isAppCommand = this._isAppCommand && this._appCommandDP === data.dp;

        this.log(`>>> EVENT: response (dp: ${data.dp}) - ${isAppCommand ? 'APP' : 'PHYSICAL'}`);

        if (DEBUG_MODE) {
          this.log('Tuya response:', JSON.stringify(data, null, 2));
          this.log('_isAppCommand:', this._isAppCommand, '_appCommandDP:', this._appCommandDP);
        }

        // Pass true for physical press, false for app command
        this.handleTuyaDataReport(data, !isAppCommand);
      });

      // These events are always physical
      tuyaCluster.on('dataReport', (data) => {
        this.log('>>> EVENT: dataReport (dp:', data.dp, ') - PHYSICAL');
        if (DEBUG_MODE) {
          this.log('Tuya dataReport received:', JSON.stringify(data, null, 2));
        }
        this.handleTuyaDataReport(data, true);
      });

      tuyaCluster.on('reporting', (data) => {
        this.log('>>> EVENT: reporting (dp:', data.dp, ') - PHYSICAL');
        if (DEBUG_MODE) {
          this.log('Tuya reporting:', JSON.stringify(data, null, 2));
        }
        this.handleTuyaDataReport(data, true);
      });

      if (DEBUG_MODE) {
        this.log('✅ Tuya cluster listener configured');
      }

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

      if (DEBUG_MODE) {
        this.log(`════════════════════════════════════════`);
        this.log(`Sending Tuya command: DP ${dp} = ${value} (${type})`);
        this.log(`════════════════════════════════════════`);
      }

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

      if (DEBUG_MODE) {
        this.log('Data buffer:', dataBuffer);
        this.log('Data type:', datatype);
      }

      const lengthBuffer = Buffer.alloc(2);
      lengthBuffer.writeUInt16BE(dataBuffer.length, 0);

      const transid = Math.floor(Math.random() * 256);

      // Mark that we're sending a command from the app
      this._appCommandTimestamp = Date.now();
      this._appCommandDP = dp;

      if (DEBUG_MODE) {
        this.log('Calling datapoint command...');
      }

      await tuyaCluster.datapoint({
        status: 0,
        transid,
        dp,
        datatype,
        length: lengthBuffer,
        data: dataBuffer,
      });

      if (DEBUG_MODE) {
        this.log('✅ Tuya command sent successfully');
      }

    } catch (err) {
      this.error('Failed to send Tuya command:', err);
      this.error('Error stack:', err.stack);
      throw err;
    }
  }

  handleTuyaDataReport(data, isPhysicalPress = false) {
    if (DEBUG_MODE) {
      this.log('handleTuyaDataReport called with:', data, 'isPhysicalPress:', isPhysicalPress);
    }

    if (!data || typeof data.dp === 'undefined') {
      if (DEBUG_MODE) {
        this.log('Invalid data format');
      }
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

      // Only process if state actually changed
      if (this._lastOnoffState !== state) {
        this.log(`State changed: ${this._lastOnoffState} -> ${state} (${isPhysicalPress ? 'PHYSICAL' : 'APP'})`);

        this._lastOnoffState = state;
        this.setCapabilityValue('onoff', state).catch(this.error);

        // Trigger flow cards ONLY if this is a physical button press
        if (isPhysicalPress) {
          if (state) {
            this.log('Triggering: switch_dimmer_1gang_turned_on');
            this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_turned_on')
              .trigger(this)
              .catch(this.error);
          } else {
            this.log('Triggering: switch_dimmer_1gang_turned_off');
            this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_turned_off')
              .trigger(this)
              .catch(this.error);
          }
        }
      } else {
        // Heartbeat with no change - don't log or trigger anything
        if (DEBUG_MODE) {
          this.log('State unchanged (heartbeat), skipping');
        }
      }
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

      // Only process if brightness changed significantly (more than 1%)
      const changeThreshold = 10; // ~1% of 990 range
      if (this._lastBrightnessValue === null || Math.abs(brightnessRaw - this._lastBrightnessValue) >= changeThreshold) {
        this.log(`Brightness changed: ${this._lastBrightnessValue} -> ${brightnessRaw} (${brightness.toFixed(2)}) (${isPhysicalPress ? 'PHYSICAL' : 'APP'})`);

        // Determine direction before updating
        const brightnessIncreased = this._lastBrightnessValue !== null && brightnessRaw > this._lastBrightnessValue;
        const brightnessDecreased = this._lastBrightnessValue !== null && brightnessRaw < this._lastBrightnessValue;

        this._lastBrightnessValue = brightnessRaw;
        this.setCapabilityValue('dim', brightness).catch(this.error);

        // Trigger flow cards ONLY if this is a physical button press
        if (isPhysicalPress) {
          if (brightnessIncreased) {
            this.log('Triggering: switch_dimmer_1gang_brightness_increased');
            this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_increased')
              .trigger(this, { brightness })
              .catch(this.error);
          } else if (brightnessDecreased) {
            this.log('Triggering: switch_dimmer_1gang_brightness_decreased');
            this.homey.flow.getDeviceTriggerCard('switch_dimmer_1gang_brightness_decreased')
              .trigger(this, { brightness })
              .catch(this.error);
          }
        }
      } else {
        // Heartbeat with no significant change - don't log or trigger anything
        if (DEBUG_MODE) {
          this.log('Brightness unchanged (heartbeat), skipping');
        }
      }
    }
  }

  onDeleted() {
    this.log('Switch Touch Dimmer (1 Gang) removed');
  }

}

module.exports = SwitchDimmer1Gang;
