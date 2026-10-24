'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { toTuyaBrightness, fromTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');

Cluster.addCluster(TuyaSpecificCluster);

const DP_ONOFF = 1;
const DP_BRIGHTNESS = 3;
// P3019: extra DPs from the Tuya product schema (Koenkk/zigbee2mqtt#31445, JohanBendz#1504).
// Reported values are kept in the store only; nothing here is sent at pairing.
const DP_WORK_MODE = 2;
const DP_SCENE = 6;
const DP_COUNTDOWN = 7;
const DP_POWER_MEMORY = 101;
const DP_DO_NOT_DISTURB = 102;
const WORK_MODES = Object.freeze({ 0: 'white', 1: 'colour', 2: 'scene', 3: 'music' });

class MC101ZPWMDimmerDevice extends TuyaSpecificClusterDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    this.printNode();

    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(zclNode);
    }

    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff:', value);
      await this.writeBool(DP_ONOFF, value);
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = toTuyaBrightness(value);
      this.log('brightness:', brightness);

      if (brightness > 0 && !this.getCapabilityValue('onoff')) {
        await this.writeBool(DP_ONOFF, true);
        await this.safeSetCapabilityValue('onoff', true);
      }

      await this.writeData32(DP_BRIGHTNESS, brightness);

      if (brightness === 0) {
        await this.writeBool(DP_ONOFF, false);
        await this.safeSetCapabilityValue('onoff', false);
      }
    });

    if (!this.hasListenersAttached) {
      const tuya = (typeof this._resolveTuyaCluster === 'function'
        ? this._resolveTuyaCluster(zclNode)
        : null)
        || zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.[0xEF00];

      if (tuya?.on) {
        const process = async (value) => {
          try {
            await this.processDatapoint(value);
          } catch (err) {
            this.error('Error processing datapoint:', err);
          }
        };

        tuya.on('reporting', process);
        tuya.on('response', process);
        this.hasListenersAttached = true;
      } else {
        this.log('[MC101Z] Tuya cluster unavailable; passive RX via DeviceIO');
      }
    }
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);

    this.log(`Processing DP ${dp}, Data Type: ${data.datatype}, Parsed Value:`, parsedValue);

    switch (dp) {
      case DP_ONOFF:
        await this.safeSetCapabilityValue(
          'onoff',
          parsedValue === true || parsedValue === 1,
        );
        break;

      case DP_BRIGHTNESS:
        await this.safeSetCapabilityValue(
          'dim',
          fromTuyaBrightness(parsedValue),
        );
        break;

      case DP_WORK_MODE:
        await this._storeDp('mc101z_work_mode', WORK_MODES[Number(parsedValue)] ?? Number(parsedValue));
        break;

      case DP_SCENE:
      case DP_POWER_MEMORY:
        await this._storeDp(dp === DP_SCENE ? 'mc101z_scene_data' : 'mc101z_power_memory',
          Buffer.isBuffer(parsedValue) ? parsedValue.toString('hex') : parsedValue);
        break;

      case DP_COUNTDOWN:
        await this._storeDp('mc101z_countdown_s', Number(parsedValue));
        break;

      case DP_DO_NOT_DISTURB: {
        const dnd = parsedValue === true || parsedValue === 1;
        await this._storeDp('mc101z_do_not_disturb', dnd);
        // WHY: mirror the device state into the opt-in setting so the UI matches the hardware.
        if (this.getSetting?.('do_not_disturb') !== dnd) {
          await Promise.resolve(this.setSettings?.({ do_not_disturb: dnd })).catch(() => { });
        }
        break;
      }

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  async _storeDp(key, value) {
    try { await this.setStoreValue(key, value); } catch (_e) { /* store is best effort */ }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (typeof super.onSettings === 'function') {
      await super.onSettings({ oldSettings, newSettings, changedKeys });
    }
    // WHY(P3019): opt-in only. DP102 is written when the user flips this setting, never otherwise.
    if (Array.isArray(changedKeys) && changedKeys.includes('do_not_disturb')) {
      await this.writeBool(DP_DO_NOT_DISTURB, newSettings.do_not_disturb === true);
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('MC101Z PWM Dimmer removed');
  }
}

module.exports = MC101ZPWMDimmerDevice;
