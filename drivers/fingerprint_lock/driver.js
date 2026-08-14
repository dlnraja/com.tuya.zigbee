'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * P132: Use lock()/unlock() (LockControlMixin) instead of raw setCapabilityValue.
 */
class FingerprintLockDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    this.log('Fingerprint Lock driver initialized (P132)');

    const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) { card.registerRunListener(fn); }
      } catch (e) {
        this.log('[Flow]', id, e.message);
      }
    };

    reg('fingerprint_lock_lock', async ({ device }) => {
      if (!device) { return false; }
      if (typeof device.lock === 'function') {
        await device.lock().catch(() => {});
      } else if (typeof device.triggerCapabilityListener === 'function') {
        await device.triggerCapabilityListener('locked', true).catch(() => {});
      }
      return true;
    });

    reg('fingerprint_lock_unlock', async ({ device }) => {
      if (!device) { return false; }
      if (typeof device.unlock === 'function') {
        await device.unlock().catch(() => {});
      } else if (typeof device.triggerCapabilityListener === 'function') {
        await device.triggerCapabilityListener('locked', false).catch(() => {});
      }
      return true;
    });
  }
}

module.exports = FingerprintLockDriver;
