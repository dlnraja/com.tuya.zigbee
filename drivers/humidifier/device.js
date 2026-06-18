'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Smart Humidifier Device
 *
 * DP mappings (typical):
 * DP1: On/Off
 * DP2: Target humidity (30-80%)
 * DP3: Current humidity
 * DP5: Mist level (low/medium/high)
 * DP12: Water shortage alarm
 */
class HumidifierDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });
      this.log('Smart Humidifier initializing...');
      await this._setupTuyaDP(zclNode);
      this.log('Smart Humidifier initialized');
    }, 'onNodeInit');
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) {return;}

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) {return;}

    this.log('[TUYA] DP cluster found');

    // Register capability listeners
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        if (typeof this.markAppCommand === 'function') {this.markAppCommand(1, value);}
        await tuyaCluster.datapoint({ dp: 1, datatype: 1, value: value });
      });
    }

    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        const level = Math.round(value * 3); // 0=off, 1=low, 2=medium, 3=high
        await tuyaCluster.datapoint({ dp: 5, datatype: 4, value: level });
      });
    }

    if (this.hasCapability('dim.humidity')) {
      this.registerCapabilityListener('dim.humidity', async (value) => {
        await tuyaCluster.datapoint({ dp: 2, datatype: 2, value: Math.round(value) });
      });
    }

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  async _handleDP(dp, value) {
    if (this._destroyed) return;
    if (dp === undefined) {return;}
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 1: // On/Off
        await this.triggerCapabilityListener('onoff', !!value).catch(this.error);
        break;

      case 2: // Target humidity
        if (this.hasCapability('dim.humidity')) {
          await this.safeSetCapabilityValue('dim.humidity', value).catch(this.error);
        }
        break;

      case 3: // Current humidity
        if (this.hasCapability('measure_humidity')) {
          await this.safeSetCapabilityValue('measure_humidity', value).catch(this.error);
        }
        break;

      case 5: // Mist level (0-3)
        const dim = value / 3;
        await this.triggerCapabilityListener('dim', dim).catch(this.error);
        break;

      case 12: // Water shortage
        this.log(`Water shortage alarm: ${value}`);
        break;
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = HumidifierDevice;
