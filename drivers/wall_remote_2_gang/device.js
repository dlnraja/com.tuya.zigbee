'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Wall Remote 2 Gang - TS0042
 * 2-button battery wall remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class WallRemote2GangDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    this.log('[WALL_REMOTE_2_GANG] v5.12.0 init - 2 buttons');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[WALL_REMOTE_2_GANG] init err:', err.message));
    // --- Battery Alarm (auto-injected) ---
    if (this.hasCapability('measure_battery')) {
      this.registerCapabilityListener('measure_battery', async (value) => {
        if (this.hasCapability('alarm_battery')) {
          await this.setCapabilityValue('alarm_battery', value < 15).catch(() => {});
        }
      });
      // Initial check
      const bat = this.getCapabilityValue('measure_battery');
      if (bat !== null && this.hasCapability('alarm_battery')) {
        this.setCapabilityValue('alarm_battery', bat < 15).catch(() => {});
      }
    }
    this.log('[WALL_REMOTE_2_GANG] ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WallRemote2GangDevice;
