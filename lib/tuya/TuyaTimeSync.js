'use strict';

/**
 * Tuya Time Synchronization Manager
 * 
 * Inspired by zigbee-herdsman's Tuya time sync logic.
 * Responds to time requests from Tuya devices and pushes current local time.
 */

class TuyaTimeSync {
  constructor(device) {
    this.device = device;
  }

  /**
   * Handle a time request from a Tuya device
   * Usually arrives via a specific DP or command in the Tuya cluster
   */
  async handleTimeRequest() {
    this.device.log('Received time synchronization request');
    await this.sendCurrentTime();
  }

  /**
   * Send the current local time to the device
   * Format is typically [YY, MM, DD, HH, MM, SS]
   */
  async sendCurrentTime() {
    try {
      const now = new Date();
      const timePayload = [
        now.getFullYear() % 100,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      ];

      this.device.log(`Sending time sync: ${timePayload.join(':')}`);

      // In Homey, this is sent via the Tuya cluster (0xEF00)
      // Command 0x24 is often used for time sync in newer Tuya firmware
      // or DP 0x00 for older ones.
      
      if (this.device.sendTuyaCommand) {
        await this.device.sendTuyaCommand(0x24, timePayload);
      } else {
        this.device.log('sendTuyaCommand not available on device, skipping time sync');
      }
    } catch (err) {
      this.device.error('Failed to send time sync:', err.message);
    }
  }
}

module.exports = TuyaTimeSync;
