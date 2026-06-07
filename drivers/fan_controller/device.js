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
    try {
      await super.onNodeInit({ zclNode });
      this.log('Fan Controller initializing...');
      
      this._zclNode = zclNode;
      
      if (this.hasCapability('onoff')) {
        this.registerCapability('onoff', CLUSTER.ON_OFF);
      }
      if (this.hasCapability('dim')) {
        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);
      }
      
      await this._setupTuyaDP(zclNode);
      await this._registerFlowCards();
      
      this.log('Fan Controller initialized');
    } catch (err) {
      this.error('Fan Controller initialization failed:', err.message);
    }
  }

  async _registerFlowCards() {
    const safeGetCard = (type, id) => {
      try {
        if (type === 'action') {return this.homey.flow.getActionCard(id);}
        if (type === 'condition') {return this.homey.flow.getConditionCard(id);}
        return null;
      } catch (e) {
        this.log(`[FLOW] Card '${id}' not available: ${e.message}`);
        return null;
      }
    };

    // Action: Set fan speed
    const setSpeedCard = safeGetCard('action', 'fan_controller_set_speed');
    if (setSpeedCard) {
      setSpeedCard.registerRunListener(async (args) => {
        const speed = args.speed / 100;
        await this.setCapabilityValue('dim', speed);
        await this._setFanSpeed(speed);
        return true;
      });
    }

    // Action: Increase fan speed
    const speedUpCard = safeGetCard('action', 'fan_controller_speed_up');
    if (speedUpCard) {
      speedUpCard.registerRunListener(async () => {
        const current = this.getCapabilityValue('dim') || 0;
        const newSpeed = Math.min(1, current + 0.25);
        await this.setCapabilityValue('dim', newSpeed);
        await this._setFanSpeed(newSpeed);
        return true;
      });
    }

    // Action: Decrease fan speed
    const speedDownCard = safeGetCard('action', 'fan_controller_speed_down');
    if (speedDownCard) {
      speedDownCard.registerRunListener(async () => {
        const current = this.getCapabilityValue('dim') || 0;
        const newSpeed = Math.max(0, current - 0.25);
        await this.setCapabilityValue('dim', newSpeed);
        await this._setFanSpeed(newSpeed);
        return true;
      });
    }

    // Condition: Fan is on
    const isOnCard = safeGetCard('condition', 'fan_controller_is_on');
    if (isOnCard) {
      isOnCard.registerRunListener((args) => {
        return this.getCapabilityValue('onoff') === true;
      });
    }

    // Condition: Fan speed is
    const speedIsCard = safeGetCard('condition', 'fan_controller_speed_is');
    if (speedIsCard) {
      speedIsCard.registerRunListener(async (args) => {
        const current = (this.getCapabilityValue('dim') || 0) * 100;
        return Math.abs(current - args.speed) < 5;
      });
    }
  }

  async _setFanSpeed(value) {
    const ep1 = this._zclNode?.endpoints?.[1];
    if (!ep1) {return;}
    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) {return;}

    const speed = Math.round(value * 4);
    try {
      await tuyaCluster.datapoint({ dp: 3, datatype: 2, value: speed });
    } catch (e) {
      this.error('Failed to set fan speed:', e.message);
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) {return;}

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) {return;}

    this.log('[TUYA] DP cluster found');

    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        const speed = Math.round(value * 4);
        this.log(`Setting fan speed to: ${speed}`);
        try {
          await tuyaCluster.datapoint({ dp: 3, datatype: 2, value: speed });
        } catch (e) {
          this.error('Failed to set speed:', e.message);
        }
      });
    }

    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
      if (typeof this.markAppCommand === 'function') this.markAppCommand(1, value);
        this.log(`Setting fan on/off: ${value}`);
        try {
          await tuyaCluster.datapoint({ dp: 1, datatype: 1, value: value });
        } catch (e) {
          this.error('Failed to set on/off:', e.message);
        }
      });
    }

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  async _handleDP(dp, value) {
    if (dp === undefined) {return;}
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 1: { // On/Off
        const wasOn = this.getCapabilityValue('onoff');
        await this.setCapabilityValue('onoff', !!value).catch(this.error);
        if (!!value && !wasOn) {
          const trigger = this.homey.flow.getDeviceTriggerCard('fan_controller_turned_on');
          if (trigger) {trigger.trigger(this).catch(this.error);}
        } else if (!value && wasOn) {
          const trigger = this.homey.flow.getDeviceTriggerCard('fan_controller_turned_off');
          if (trigger) {trigger.trigger(this).catch(this.error);}
        }
        break;
      }

      case 3: { // Speed (0-4)
        const dim = value / 4;
        await this.setCapabilityValue('dim', dim).catch(this.error);
        const trigger = this.homey.flow.getDeviceTriggerCard('fan_controller_speed_changed');
        if (trigger) {trigger.trigger(this, { speed: Math.round(dim * 100) }).catch(this.error);}
        break;
      }

      case 6: // Mode
        this.log(`Fan mode: ${value}`);
        break;
    }
  }

  onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = FanControllerDevice;
