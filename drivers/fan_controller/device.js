'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Fan Speed Controller Device
 *
 * Supports on/off and multi-speed control
 * DP mappings:
 * DP1: On/Off
 * DP3: Speed (0-4 typically: off, low, medium, high, turbo)
 * DP6: Mode (normal, sleep, natural, etc)
 */
class FanControllerDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Fan Controller initializing...');

    // Store zclNode for later use
    this._zclNode = zclNode;

    // Try standard ZCL clusters first
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF);
    }

    if (this.hasCapability('dim')) {
      this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);
    }

    // Setup Tuya DP for TS0601 devices
    await this._setupTuyaDP(zclNode);

    // Register flow cards
    await this._registerFlowCards();

    this.log('Fan Controller initialized');
  }

  async _registerFlowCards() {
    // Action: Set fan speed
    this.homey.flow.getDeviceActionCard('fan_controller_set_speed')
      .registerRunListener(async (args, state) => {
        const speed = args.speed / 100; // Convert 0-100 to 0-1
        await this.setCapabilityValue('dim', speed);
        await this._setFanSpeed(speed);
        return true;
      });

    // Action: Increase fan speed
    this.homey.flow.getDeviceActionCard('fan_controller_speed_up')
      .registerRunListener(async (args, state) => {
        const current = this.getCapabilityValue('dim') || 0;
        const newSpeed = Math.min(1, current + 0.25);
        await this.setCapabilityValue('dim', newSpeed);
        await this._setFanSpeed(newSpeed);
        return true;
      });

    // Action: Decrease fan speed
    this.homey.flow.getDeviceActionCard('fan_controller_speed_down')
      .registerRunListener(async (args, state) => {
        const current = this.getCapabilityValue('dim') || 0;
        const newSpeed = Math.max(0, current - 0.25);
        await this.setCapabilityValue('dim', newSpeed);
        await this._setFanSpeed(newSpeed);
        return true;
      });

    // Condition: Fan is on
    this.homey.flow.getDeviceConditionCard('fan_controller_is_on')
      .registerRunListener(async (args, state) => {
        return this.getCapabilityValue('onoff') === true;
      });

    // Condition: Fan speed is
    this.homey.flow.getDeviceConditionCard('fan_controller_speed_is')
      .registerRunListener(async (args, state) => {
        const current = (this.getCapabilityValue('dim') || 0) * 100;
        return Math.abs(current - args.speed) < 5;
      });
  }

  async _setFanSpeed(value) {
    const ep1 = this._zclNode?.endpoints?.[1];
    if (!ep1) return;
    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    const speed = Math.round(value * 4);
    try {
      await tuyaCluster.datapoint({ dp: 3, datatype: 2, value: speed });
    } catch (e) {
      this.error('Failed to set speed:', e);
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] DP cluster found');

    // Register capability listener for dim via Tuya DP
    this.registerCapabilityListener('dim', async (value) => {
      const speed = Math.round(value * 4); // 0-4 speed levels
      this.log(`Setting fan speed to: ${speed}`);
      try {
        await tuyaCluster.datapoint({ dp: 3, datatype: 2, value: speed });
      } catch (e) {
        this.error('Failed to set speed:', e);
      }
    });

    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`Setting fan on/off: ${value}`);
      try {
        await tuyaCluster.datapoint({ dp: 1, datatype: 1, value: value });
      } catch (e) {
        this.error('Failed to set on/off:', e);
      }
    });

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  _handleDP(dp, value) {
    if (dp === undefined) return;
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 1: // On/Off
        const wasOn = this.getCapabilityValue('onoff');
        this.setCapabilityValue('onoff', !!value).catch(this.error);
        // Trigger flow cards
        if (!!value && !wasOn) {
          this.homey.flow.getDeviceTriggerCard('fan_turned_on').trigger(this).catch(this.error);
        } else if (!value && wasOn) {
          this.homey.flow.getDeviceTriggerCard('fan_turned_off').trigger(this).catch(this.error);
        }
        break;

      case 3: // Speed (0-4)
        const dim = value / 4; // Convert to 0-1 range
        this.setCapabilityValue('dim', dim).catch(this.error);
        // Trigger speed changed flow card
        this.homey.flow.getDeviceTriggerCard('fan_speed_changed')
          .trigger(this, { speed: Math.round(dim * 100) }).catch(this.error);
        break;

      case 6: // Mode (some devices)
        this.log(`Fan mode: ${value}`);
        break;
    }
  }
}

module.exports = FanControllerDevice;
