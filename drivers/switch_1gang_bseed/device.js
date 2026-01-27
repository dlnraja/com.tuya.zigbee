'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Bseed 1-Gang Switch Device
 *
 * This driver is specifically for Bseed switches that use:
 * - Standard ZCL onOff cluster (cluster 6)
 * - Custom Bseed clusters 0xE000 (57344) and 0xE001 (57345)
 * - Product ID: TS0001
 * - Manufacturer: _TZ3000_blhvsaqf
 *
 * Features:
 * - Physical button press detection for flow triggers
 * - Standard ZCL onOff control
 */
class BseedSwitch1GangDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Bseed 1-Gang Switch initializing...');
    this.printNode();

    // Track state for detecting physical button presses
    this._lastOnoffState = null;
    this._appCommandPending = false;  // Track if app sent command recently
    this._appCommandTimeout = null;

    // Register onoff capability with standard ZCL onOff cluster
    if (this.hasCapability('onoff')) {
      // Register capability for reading state from device
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1,
        reportParser: (value) => {
          this.log(`📥 Attribute report received: onoff = ${value}`);
          // Attribute reports indicate physical button press (not app command)
          this._handleOnOffChange(value, !this._appCommandPending);
          return value;
        }
      });

      // Register capability listener for sending commands to device
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`Setting onoff to: ${value} (APP COMMAND)`);
        this._markAppCommand();  // Mark as app command

        try {
          const result = await this.zclNode.endpoints[1].clusters.onOff[value ? 'setOn' : 'setOff']();
          this.log(`✅ Successfully set switch to ${value ? 'ON' : 'OFF'}`);
          return result;
        } catch (error) {
          this.error(`Failed to set switch: ${error.message}`);
          throw error;
        }
      });

      this.log('✅ onoff capability and listener registered with ZCL onOff cluster');
    }

    this.log('Bseed 1-Gang Switch initialized successfully');
  }

  /**
   * Handle onoff state changes and trigger flow cards for physical button presses
   * @param {boolean} value - The new onoff state
   * @param {boolean} isPhysical - Whether this change came from a physical button press
   */
  _handleOnOffChange(value, isPhysical) {
    // Only process if state actually changed
    if (this._lastOnoffState !== value) {
      this.log(`State changed: ${this._lastOnoffState} → ${value} (${isPhysical ? 'PHYSICAL' : 'APP'})`);

      this._lastOnoffState = value;

      // Trigger flow cards ONLY if this is a physical button press
      if (isPhysical) {
        const flowCardId = value ? 'switch_1gang_bseed_turned_on' : 'switch_1gang_bseed_turned_off';
        this.log(`Triggering flow: ${flowCardId}`);

        this.homey.flow.getDeviceTriggerCard(flowCardId)
          .trigger(this, {}, {})
          .then(() => this.log(`✅ Flow card triggered: ${flowCardId}`))
          .catch(err => this.error(`Flow trigger failed: ${err.message}`));
      }
    }
  }

  /**
   * Mark that an app command was sent
   * Used to distinguish physical button presses from app commands
   */
  _markAppCommand() {
    this._appCommandPending = true;
    if (this._appCommandTimeout) {
      clearTimeout(this._appCommandTimeout);
    }
    // Clear after 2 seconds - device should respond within this time
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
      this.log('App command timeout cleared');
    }, 2000);
  }

  onDeleted() {
    if (this._appCommandTimeout) {
      clearTimeout(this._appCommandTimeout);
    }
    this.log('Bseed 1-Gang Switch removed');
  }

}

module.exports = BseedSwitch1GangDevice;
