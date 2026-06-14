'use strict';
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const { smartParse, smartDivisorDetect } = require('../../lib/managers/SmartDivisorManager');

// v5.11.16: Clamp pour éviter les dépassements de flow
function clampDim(val) {
  const n = Number(val);
  if (isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

const dataPoints = {
  state: 1,
  brightness: 2,
  backlightMode: 15,        // Original - doesn't work for this device
  lightType: 16,
  backlightSwitch: 36,      // Alternative: Backlight on/off
  backlightLightMode: 37,   // Alternative: Light mode (none/relay/pos)
};

const DEBUG_MODE = false;

class WallDimmer1Gang1Way extends TuyaSpecificClusterDevice {

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // v5.11.16: Add missing dim capability
    if (!this.hasCapability('dim')) {
      await this.addCapability('dim').catch(() => {});
    }

    // State tracking for physical button detection
    this._lastBrightnessValue = null;
    this._lastOnoffState = null;

    // v5.5.854: App command tracking for physical button detection
    if (typeof this._registerCapabilityListeners === 'function') {
      try { this._registerCapabilityListeners(); } catch (e) { this.log('registerCapabilityListeners error:', e.message); }
    }

    // v5.5.854: Setup physical button detection if available
    if (typeof this.initPhysicalButtonDetection === 'function') {
      await this.initPhysicalButtonDetection?.(zclNode);
    }

    // v5.5.854: Virtual buttons if available
    if (typeof this.initVirtualButtons === 'function') {
      await this.initVirtualButtons?.();
    }

    // Apply initial settings (backlight, light type)
    if (typeof this._applyInitialSettings === 'function') {
      await this._applyInitialSettings().catch(() => {});
    }

    // Override capability listeners to add physical detection
    this._overrideCapabilityListeners();

    this.log('Switch Touch Dimmer (1 Gang) initialized - v5.11.16');
  }

  _overrideCapabilityListeners() {
    this.registerCapabilityListener('onoff', async (value, opts) => {
      // v5.11.16: Mark app command so DP report won't trigger flow cards
      this._markAppCommand();

      await this.sendTuyaCommand(dataPoints.state, value, 'bool');

      // Also trigger dim state if needed
      if (value && this.getCapabilityValue('dim') === 0) {
        this.triggerCapabilityListener('dim', 0.5).catch(() => {});
      }
    });

    this.registerCapabilityListener('dim', async (value, opts) => {
      this._markAppCommand();

      const dimVal = clampDim(value);
      const tuyaBrightness = dimVal === 1 ? 1000 : Math.round(10 + dimVal * 990);
      this.log(`Setting brightness to ${tuyaBrightness} (${dimVal.toFixed(2)})`);
      await this.sendTuyaCommand(dataPoints.brightness, tuyaBrightness, 'value');

      // Sync onoff state based on dim level
      if (dimVal === 0) {
        this.triggerCapabilityListener('onoff', false).catch(() => {});
      } else {
        this.triggerCapabilityListener('onoff', true).catch(() => {});
      }
    });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    for (const key of changedKeys) {
      switch (key) {
        case 'backlight_mode':
          await this._onBacklightModeChange(newSettings.backlight_mode);
          break;
        case 'light_type':
          await this._onLightTypeChange(newSettings.light_type);
          break;
        default:
          break;
      }
    }
  }

  /**
   * L11: Set backlight mode — 0-based canonical mapping
   * DP15 primary (0=off, 1=normal, 2=inverted)
   * DP36+DP37 fallback for alternate firmware (issue #26578)
   */
  async _onBacklightModeChange(backlightMode) {
    this.log(`[BACKLIGHT] Setting backlight_mode: ${backlightMode}`);

    // Canonical mapping (UnifiedSwitchBase compatible)
    const modeMap = { off: 0, normal: 1, inverted: 2 };
    const dp15Mode = modeMap[backlightMode] ?? 1;

    // 1) Primary: DP15 enum (0/1/2)
    await this.sendTuyaCommand(dataPoints.backlightMode, dp15Mode, 'enum').catch(err =>
      this.log('[BACKLIGHT] DP15 failed or unsupported:', err.message));

    // 2) Fallback: DP36 (on/off) + DP37 (normal/inverted)
    if (backlightMode === 'off') {
      await this.sendTuyaCommand(dataPoints.backlightSwitch, false, 'bool').catch(() => {});
    } else {
      await this.sendTuyaCommand(dataPoints.backlightSwitch, true, 'bool').catch(() => {});
      // L11: ternary maps string → DP integer
      const lightMode = backlightMode === 'inverted' ? 2 : 1;
      await this.sendTuyaCommand(dataPoints.backlightLightMode, lightMode, 'enum').catch(() => {});
    }
  }

  async _onLightTypeChange(lightType) {
    const lightMap = { '0': 0, '1': 1, '2': 2, 'led': 0, 'incandescent': 1, 'halogen': 2 };
    const lightTypeValue = lightMap[String(lightType).toLowerCase()];
    if (lightTypeValue !== undefined) {
      this.log(`Applying light_type: ${lightTypeValue}`);
      await this.sendTuyaCommand(dataPoints.lightType, lightTypeValue, 'enum').catch(e =>
        this.log('light_type not supported by this device'));
    }
  }

  async _applyInitialSettings() {
    try {
      const settings = this.getSettings();
      if (!settings) return;

      // Apply light_type if not default
      if (settings.light_type && settings.light_type !== '0') {
        await this._onLightTypeChange(settings.light_type);
      }

      // Apply backlight_mode if not default
      if (settings.backlight_mode && settings.backlight_mode !== 'normal') {
        await this._onBacklightModeChange(settings.backlight_mode);
      }
    } catch (err) {
      this.error('Failed to apply initial settings:', err);
    }
  }

  /**
   * v5.5.854: Override parent's handleTuyaResponse to detect physical button presses
   * Parent class TuyaSpecificClusterDevice calls this for 'response' events
   * Physical button presses come as 'response' events when no app command is pending
   */
  handleTuyaResponse(data) {
    const isPhysical = !this._appCommandPending;
    this.log(`>>> Tuya response (dp: ${data?.dp}) - ${isPhysical ? 'PHYSICAL' : 'APP'}`);
    this.handleTuyaDataReport(data, isPhysical);
  }

  /**
   * v5.5.854: Override parent's handleTuyaDataReport for consistent handling
   * This is called by parent for 'dataReport' events
   */
  handleTuyaDataReport(data, isReportingEvent = false) {
    this._processTuyaData(data, isReportingEvent);
  }

  /**
   * v5.5.854: Handles both dataReport and response events with physical button detection
   */
  _processTuyaData(data, isReportingEvent = false) {
    if (DEBUG_MODE) {
      this.log('_processTuyaData:', JSON.stringify(data), 'reporting:', isReportingEvent);
    }
    
    if (!data || typeof data.dp === 'undefined') {
      if (DEBUG_MODE) {this.log('Invalid data format');}
      return;
    }

    // v5.5.854: Physical = reporting event AND no pending app command
    const isPhysicalPress = isReportingEvent && !this._appCommandPending;

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
      
      if (this._lastOnoffState !== state) {
        this.log(`State changed: ${this._lastOnoffState} → ${state} (${isPhysicalPress ? 'PHYSICAL' : 'APP'})`);
        this._lastOnoffState = state;
        this.triggerCapabilityListener('onoff', state).catch(this.error);
        
        if (isPhysicalPress) {
          const flowCardId = state ? 'wall_dimmer_1gang_1way_turned_on' : 'wall_dimmer_1gang_1way_turned_off';
          this.log(`Triggering: ${flowCardId}`);
          this.homey.flow.getDeviceTriggerCard(flowCardId)
            .trigger(this, {}, {})
            .catch(err => this.error(`Flow trigger failed: ${err.message}`));
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
      
      const changeThreshold = 10;
      if (this._lastBrightnessValue === null || Math.abs(brightnessRaw - this._lastBrightnessValue) >= changeThreshold) {
        this.log(`Brightness changed: ${this._lastBrightnessValue} → ${brightnessRaw} (${brightness.toFixed(2)}) (${isPhysicalPress ? 'PHYSICAL' : 'APP'})`);
        
        const brightnessIncreased = this._lastBrightnessValue !== null && brightnessRaw > this._lastBrightnessValue;
        const brightnessDecreased = this._lastBrightnessValue !== null && brightnessRaw < this._lastBrightnessValue;
        
        this._lastBrightnessValue = brightnessRaw;
        this.triggerCapabilityListener('dim', brightness).catch(this.error);
        
        if (isPhysicalPress) {
          if (brightnessIncreased) {
            this.log('Triggering: wall_dimmer_1gang_1way_brightness_increased (PHYSICAL)');
            this.homey.flow.getDeviceTriggerCard('wall_dimmer_1gang_1way_brightness_increased')
              .trigger(this, { brightness })
              .catch(this.error);
          } else if (brightnessDecreased) {
            this.log('Triggering: wall_dimmer_1gang_1way_brightness_decreased (PHYSICAL)');
            this.homey.flow.getDeviceTriggerCard('wall_dimmer_1gang_1way_brightness_decreased')
              .trigger(this, { brightness })
              .catch(this.error);
          }
        }
      }
    }
  }

  async sendTuyaCommand(dp, value, type = 'value') {
    try {
      const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.tuya;

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available');
      }

      this.log('════════════════════════════════════════');
      this.log(`Sending Tuya command: DP ${dp} = ${value} (${type})`);
      this.log('════════════════════════════════════════');

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

  _markAppCommand() {
    this._appCommandPending = true;
    if (this._appCommandTimeout) {
      clearTimeout(this._appCommandTimeout);
    }
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }

  onDeleted() {
    this.log('Switch Touch Dimmer (1 Gang) removed');
  }

}

module.exports = WallDimmer1Gang1Way;