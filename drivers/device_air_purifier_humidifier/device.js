'use strict';
const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Smart Humidifier — P125: TuyaZigbeeDevice (L14) + mainsPowered
 *
 * DP1: On/Off | DP2: Target humidity | DP3: Current humidity
 * DP5: Mist level | DP12: Water shortage
 */
class HumidifierDevice extends TuyaZigbeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Humidifier initializing...');

    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
    }

    await this._setupTuyaDP(zclNode);

    this.log('Smart Humidifier initialized');
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) { return; }

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) { return; }

    this.log('[TUYA] DP cluster found');

    this.registerCapabilityListener('onoff', async (value) => {
      await tuyaCluster.datapoint({ dp: 1, datatype: 1, value });
    });

    this.registerCapabilityListener('dim', async (value) => {
      const level = Math.round(value);
      await tuyaCluster.datapoint({ dp: 5, datatype: 4, value: level });
    });

    if (this.hasCapability('dim.humidity')) {
      this.registerCapabilityListener('dim.humidity', async (value) => {
        await tuyaCluster.datapoint({ dp: 2, datatype: 2, value: Math.round(value) });
      });
    }

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  _handleDP(dp, value) {
    if (dp === undefined) { return; }
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
    case 1:
      this.safeSetCapabilityValue('onoff', !!value).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      break;
    case 2:
      if (this.hasCapability('dim.humidity')) {
        this.safeSetCapabilityValue('dim.humidity', value).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      }
      break;
    case 3:
      if (this.hasCapability('measure_humidity')) {
        this.safeSetCapabilityValue('measure_humidity', value).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      }
      break;
    case 5: {
      const dim = safeMultiply(value, 3);
      this.safeSetCapabilityValue('dim', dim).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      break;
    }
    case 12:
      this.log(`Water shortage alarm: ${value}`);
      break;
    default:
      break;
    }
  }

  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = HumidifierDevice;
