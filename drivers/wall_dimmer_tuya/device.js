'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');
const { toTuyaBrightness, fromTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');

Cluster.addCluster(TuyaSpecificCluster);

class wall_dimmer_tuya extends TuyaSpecificClusterDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    if (this.mainsPowered) {
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(() => {});
      }
      if (this.hasCapability('alarm_battery')) {
        await this.removeCapability('alarm_battery').catch(() => {});
      }
    }

    // Forum silent-scan: BSEED/Tuya wall dimmers pair but stay mute when Homey
    // interview misses 0xEF00 — compensate before attaching listeners.
    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(zclNode);
    }

    // Read and log device attributes
    await this._readDeviceAttributes(zclNode);

    // Setup capability listeners for on/off and dim
    await this._setupGang(zclNode);

    // Attach event listeners for Tuya-specific reports (manual state changes)
    if (!this.hasListenersAttached) {
      const tuya = (typeof this._resolveTuyaCluster === 'function'
        ? this._resolveTuyaCluster(zclNode)
        : null)
        || zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.[0xEF00];

      if (tuya?.on) {
        tuya.on('reporting', async (value) => {
          try {
            this.log('Received reporting:', value);
            await this.processDatapoint(value);
          } catch (err) {
            this.error('Error processing datapoint:', err);
          }
        });

        tuya.on('response', async (value) => {
          try {
            this.log('Received response:', value);
            await this.processDatapoint(value);
          } catch (err) {
            this.error('Error processing datapoint:', err);
          }
        });
        this.hasListenersAttached = true;
      } else {
        this.log('[WALL-DIMMER] Tuya cluster missing after compensation — passive I/O armed');
        this.io?._enablePassiveTuyaListen?.({});
      }
    }
  }

  async _readDeviceAttributes(zclNode) {
    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']);
    } catch (err) {
      this.error('Error when reading device attributes:', err);
    }
  }

  async _setupGang(zclNode) {
    // WHY(P2308 / Gmail `_TZE284_m1cvyneb`): never rethrow IEEE/token misses —
    // Homey UI showed "none of the controls work" while writeBool logged and failed.
    this.registerCapabilityListener('onoff', async (value) => {
      if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
      this.log('onoff:', value);
      try {
        if (typeof this._ensureTuyaIo === 'function') {
          await this._ensureTuyaIo(zclNode || this.zclNode);
        }
        await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, value);
      } catch (err) {
        this.error('Error when writing onOff:', err);
        // Soft-fail: keep Homey UI responsive; device may be offline/rejoining.
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
      const brightness = toTuyaBrightness(value); // 0-1000, MCU-safe
      this.log('brightness:', brightness);

      try {
        if (typeof this._ensureTuyaIo === 'function') {
          await this._ensureTuyaIo(zclNode || this.zclNode);
        }
        if (brightness > 0 && !this.getCapabilityValue('onoff')) {
          this.log('Dim level is greater than 0, turning on device');
          await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, true);
          await this['safeSetCapabilityValue']('onoff', true);
        }

        await this.writeData32(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness, brightness);

        if (brightness === 0) {
          this.log('Dim level is 0, turning off device');
          await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, false);
          await this['safeSetCapabilityValue']('onoff', false);
        }
      } catch (err) {
        this.error('Error when writing brightness:', err);
      }
    });
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff:
        this.log('Received on/off:', parsedValue);
        await this['safeSetCapabilityValue']('onoff', parsedValue === true || parsedValue === 1).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness:
        this.log('Received dim level:', parsedValue);
        await this['safeSetCapabilityValue']('dim', fromTuyaBrightness(parsedValue)).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.countdown:
        this.log('Countdown DP6:', parsedValue);
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.powerOnBehavior: {
        const map = { 0: 'off', 1: 'on', 2: 'previous' };
        const key = map[Number(parsedValue)];
        if (key && typeof this.setSettings === 'function') {
          await this.setSettings({ power_on_behavior: key }).catch(() => {});
        }
        break;
      }

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.backlightMode: {
        // Strings only — Layer 11 / .cursorrules
        const map = { 0: 'off', 1: 'normal', 2: 'inverted' };
        const key = map[Number(parsedValue)];
        if (key && typeof this.setSettings === 'function') {
          await this.setSettings({ backlight_mode: key }).catch(() => {});
        }
        break;
      }

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.typeOfLightSource: {
        const map = { 0: 'led', 1: 'incandescent', 2: 'halogen' };
        const key = map[Number(parsedValue)];
        if (key && typeof this.setSettings === 'function') {
          await this.setSettings({ light_type: key }).catch(() => {});
        }
        break;
      }

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.minimumBrightness:
        this.log('Informational DP (min brightness):', parsedValue);
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  /**
   * Z2M TS0601_dimmer_1_gang_1 + #28658: DP14 power-on, DP4 light type, DP21 backlight.
   * Backlight values MUST stay strings (off/normal/inverted).
   */
  async onSettings({ newSettings, changedKeys }) {
    if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
    const keys = changedKeys || Object.keys(newSettings || {});

    if (keys.includes('backlight_mode')) {
      const mode = String(newSettings.backlight_mode || 'normal');
      const enumVal = mode === 'off' ? 0 : mode === 'inverted' ? 2 : 1;
      await this.writeEnum(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.backlightMode, enumVal);
    }

    if (keys.includes('power_on_behavior')) {
      const mode = String(newSettings.power_on_behavior || 'previous');
      const enumVal = mode === 'off' ? 0 : mode === 'on' ? 1 : 2;
      await this.writeEnum(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.powerOnBehavior, enumVal);
    }

    if (keys.includes('light_type')) {
      const mode = String(newSettings.light_type || 'led');
      const enumVal = mode === 'incandescent' ? 1 : mode === 'halogen' ? 2 : 0;
      await this.writeEnum(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.typeOfLightSource, enumVal);
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('Wall Dimmer removed');
  }

}

module.exports = wall_dimmer_tuya;
