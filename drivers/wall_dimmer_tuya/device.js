'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');
const { toTuyaBrightness, fromTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');
const { healZigbeeNodeIdentity } = require('../../lib/io/healZigbeeNodeIdentity');

Cluster.addCluster(TuyaSpecificCluster);

class wall_dimmer_tuya extends TuyaSpecificClusterDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.printNode();

    if (this.mainsPowered) {
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(() => {});
      }
      if (this.hasCapability('alarm_battery')) {
        await this.removeCapability('alarm_battery').catch(() => {});
      }
    }

    // P2314 BOTH: heal IEEE + EF00 before listeners (PresentSky dead controls)
    await healZigbeeNodeIdentity(this, { force: true }).catch(() => {});
    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(zclNode, { queryAll: true, mcu: true, pollFallback: false });
    }
    await this._ensureEf00Manager(zclNode);

    await this._readDeviceAttributes(zclNode);
    await this._setupGang(zclNode);

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
        this.log('[WALL-DIMMER] Tuya cluster missing — passive I/O armed');
        this.io?._enablePassiveTuyaListen?.({});
      }
    }
  }

  async _ensureEf00Manager(zclNode) {
    try {
      if (this.tuyaEF00Manager) {
        if (typeof this.tuyaEF00Manager.initialize === 'function' && zclNode) {
          await this.tuyaEF00Manager.initialize(zclNode).catch(() => {});
        }
        return;
      }
      const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');
      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      if (zclNode && typeof this.tuyaEF00Manager.initialize === 'function') {
        await this.tuyaEF00Manager.initialize(zclNode).catch(() => {});
      }
      this.log('[WALL-DIMMER] TuyaEF00Manager attached');
    } catch (err) {
      this.log(`[WALL-DIMMER] EF00 manager skip: ${err?.message || err}`);
    }
  }

  async _readDeviceAttributes(zclNode) {
    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes([
        'manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus',
      ]);
    } catch (err) {
      this.error('Error when reading device attributes:', err);
    }
  }

  async _txOnoff(value) {
    if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
    await healZigbeeNodeIdentity(this, { force: false }).catch(() => {});
    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(this.zclNode, { light: true });
    }
    await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, Boolean(value));
  }

  async _txDim(value) {
    if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
    await healZigbeeNodeIdentity(this, { force: false }).catch(() => {});
    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(this.zclNode, { light: true });
    }
    const brightness = toTuyaBrightness(value);
    if (brightness > 0 && !this.getCapabilityValue('onoff')) {
      await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, true);
      await this.safeSetCapabilityValue('onoff', true);
    }
    await this.writeData32(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness, brightness);
    if (brightness === 0) {
      await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, false);
      await this.safeSetCapabilityValue('onoff', false);
    }
  }

  async _setupGang() {
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff:', value);
      try {
        await this._txOnoff(value);
      } catch (err) {
        this.error('Error when writing onOff:', err);
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      this.log('brightness:', toTuyaBrightness(value));
      try {
        await this._txDim(value);
      } catch (err) {
        this.error('Error when writing brightness:', err);
      }
    });
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    this.log(`Processing DP ${dp}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff:
        await this.safeSetCapabilityValue('onoff', parsedValue === true || parsedValue === 1)
          .catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;
      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness:
        await this.safeSetCapabilityValue('dim', fromTuyaBrightness(parsedValue))
          .catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;
      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.countdown:
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
      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
    await healZigbeeNodeIdentity(this, { force: false }).catch(() => {});
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
