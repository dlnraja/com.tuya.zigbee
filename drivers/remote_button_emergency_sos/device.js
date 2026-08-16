'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');

const ALARM_RESET_MS = 5000;

/**
 * Remote Emergency SOS Button
 *
 * Panic remotes in this family expose their keys as ordinary ZCL buttons, so
 * ButtonDevice already covers press detection, flow cards and battery. What it
 * does not do is drive `alarm_generic`, which this driver declares — without it
 * the panic state never reaches flows. Any key press raises the alarm and it
 * self-clears so the next press is observable as a fresh event.
 */
class RemoteEmergencySosDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.buttonCount = 4;
      await Promise.resolve()
        .then(() => super.onNodeInit({ zclNode }))
        .catch((err) => this.error('[SOS-REMOTE] init err:', err.message));

      if (!this.hasCapability('alarm_generic')) {
        await this.addCapability('alarm_generic').catch(() => {});
      }
      await this.safeSetCapabilityValue('alarm_generic', false).catch(() => {});

      this.log('[SOS-REMOTE] ready - 4 keys, alarm_generic armed');
    }, 'onNodeInit');
  }

  async triggerButtonPress(button, pressType, count, options) {
    const result = await Promise.resolve()
      .then(() => super.triggerButtonPress(button, pressType, count, options))
      .catch((err) => {
        this.error('[SOS-REMOTE] button dispatch err:', err.message);
        return null;
      });

    await this._raiseAlarm(button, pressType);
    return result;
  }

  async _raiseAlarm(button, pressType) {
    if (!this.hasCapability('alarm_generic')) return;

    this.log(`[SOS-REMOTE] panic raised (button=${button}, press=${pressType})`);
    await this.safeSetCapabilityValue('alarm_generic', true).catch(() => {});

    safeClearTimeout(this, this._alarmResetTimer);
    this._alarmResetTimer = safeSetTimeout(this, () => {
      this.safeSetCapabilityValue('alarm_generic', false).catch(() => {});
    }, ALARM_RESET_MS);
  }

  onDeleted() {
    safeClearTimeout(this, this._alarmResetTimer);
    this._alarmResetTimer = null;
    super.onDeleted();
  }
}

module.exports = RemoteEmergencySosDevice;
