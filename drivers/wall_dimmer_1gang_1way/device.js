'use strict';

const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

/**
 * WallDimmer1Gang1Way - v5.5.799
 */

const dataPoints = {
  state: 1,
  brightness: 2,
  minBrightness: 3,
  countdown: 9,
  powerOnBehavior: 14,
  backlightMode: 15,
  lightType: 16,
  backlightSwitch: 36,
  backlightLightMode: 37,
};

class WallDimmer1Gang1Way extends TuyaSpecificClusterDevice {

  async onNodeInit({zclNode}) {
    this.log('WallDimmer1Gang1Way onNodeInit STARTING');
    
    this._lastOnoffState = null;
    this._lastBrightnessValue = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;
    this._settingsApplied = false;

    this.registerTuyaDatapoint(dataPoints.state, 'onoff', { type: 'bool' });
    this.registerTuyaDatapoint(dataPoints.brightness, 'dim', {
      type: 'value',
      scale: 990,
      offset: 10,
    });

    this.registerCapabilityListener('onoff', async (value) => {
      this._markAppCommand();
      await this.sendTuyaCommand(dataPoints.state, value, 'bool');
    });
    
    this.registerCapabilityListener('dim', async (value) => {
      this._markAppCommand();
      const brightness = Math.round(10 + (value * 990));
      await this.sendTuyaCommand(dataPoints.brightness, brightness, 'value');
    });

    this.homey.setTimeout(() => {
      this._applyInitialSettings().catch(this.error);
    }, 3000);

    this.log('WallDimmer1Gang1Way onNodeInit COMPLETE');
  }
  
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    for (const key of changedKeys) {
      try {
        switch (key) {
          case 'min_brightness':
            const minBrightness = Math.round(10 + (newSettings.min_brightness * 9.9));
            await this.sendTuyaCommand(dataPoints.minBrightness, minBrightness, 'value');
            break;
          case 'power_on_behavior':
            await this.sendTuyaCommand(dataPoints.powerOnBehavior, parseInt(newSettings.power_on_behavior, 10), 'enum');
            break;
          case 'light_type':
            await this.sendTuyaCommand(dataPoints.lightType, parseInt(newSettings.light_type, 10), 'enum');
            break;
          case 'backlight_mode':
            const val = parseInt(newSettings.backlight_mode, 10);
            await this.sendTuyaCommand(dataPoints.backlightSwitch, val !== 0, 'bool').catch(() => {});
            await this.sendTuyaCommand(dataPoints.backlightLightMode, val, 'enum').catch(() => {});
            break;
        }
      } catch (err) {
        this.error(`Failed to apply setting ${key}:`, err);
      }
    }
  }
  
  async _applyInitialSettings() {
    if (this._settingsApplied) return;
    this._settingsApplied = true;
    const settings = this.getSettings();
    if (settings.min_brightness > 1) {
      const minBrightness = Math.round(10 + (settings.min_brightness * 9.9));
      await this.sendTuyaCommand(dataPoints.minBrightness, minBrightness, 'value').catch(() => {});
    }
  }

  handleTuyaResponse(data) {
    const isPhysical = !this._appCommandPending;
    this._processTuyaData(data, isPhysical);
  }

  _processTuyaData(data, isPhysicalPress = false) {
    if (!data || typeof data.dp === 'undefined') return;

    if (data.dp === dataPoints.state) {
      const state = !!data.value;
      if (this._lastOnoffState !== state) {
        this._lastOnoffState = state;
        this.setCapabilityValue('onoff', state).catch(this.error);
        if (isPhysicalPress) {
          const flowId = state ? 'wall_dimmer_1gang_1way_turned_on' : 'wall_dimmer_1gang_1way_turned_off';
          this.homey.flow.getDeviceTriggerCard(flowId).trigger(this).catch(this.error);
        }
      }
    }

    if (data.dp === dataPoints.brightness) {
      const brightnessRaw = data.value;
      const brightness = Math.max(0, Math.min(1, (brightnessRaw - 10) / 990));
      if (this._lastBrightnessValue === null || Math.abs(brightnessRaw - this._lastBrightnessValue) >= 10) {
        this._lastBrightnessValue = brightnessRaw;
        this.setCapabilityValue('dim', brightness).catch(this.error);
      }
    }
  }

  async sendTuyaCommand(dp, value, type = 'value') {
    const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.tuya;
    if (!tuyaCluster) return;

    let dataBuffer;
    let datatype;
    
    switch (type) {
      case 'bool':
        dataBuffer = Buffer.from([value ? 1 : 0]);
        datatype = 1;
        break;
      case 'value':
        dataBuffer = Buffer.alloc(4);
        dataBuffer.writeInt32BE(value, 0);
        datatype = 2;
        break;
      case 'enum':
        dataBuffer = Buffer.from([value]);
        datatype = 4;
        break;
      default:
        dataBuffer = Buffer.from([value]);
        datatype = 2;
    }

    const lengthBuffer = Buffer.alloc(2);
    lengthBuffer.writeUInt16BE(dataBuffer.length, 0);

    await tuyaCluster.datapoint({
      status: 0,
      transid: Math.floor(Math.random() * 256),
      dp,
      datatype,
      length: lengthBuffer,
      data: dataBuffer,
    });
  }

  _markAppCommand() {
    this._appCommandPending = true;
    if (this._appCommandTimeout) clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = this.homey.setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }
}

module.exports = WallDimmer1Gang1Way;
