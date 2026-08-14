'use strict';

/**
 * P130 — Writable lock control for devices that expose `locked`.
 * Dual-path: DeviceIOFacade.sendDP → sendTuyaCommand → ZCL doorlock → UI sync.
 */

function LockControlMixin(Base) {
  return class LockControlDevice extends Base {
    get lockDpId() {
      return this._lockDpId || 1;
    }

    async _sendLockState(locked) {
      const value = locked === true || locked === 1 || locked === '1';
      const dp = this.lockDpId;

      if (this.io && typeof this.io.sendDP === 'function') {
        try {
          const ok = await this.io.sendDP(dp, value, { type: 'bool' });
          if (ok) { return true; }
        } catch (err) {
          this.log?.(`[LOCK] io.sendDP failed: ${err.message}`);
        }
      }

      if (typeof this.sendTuyaCommand === 'function') {
        try {
          await this.sendTuyaCommand(dp, value, 'bool');
          return true;
        } catch (err) {
          this.log?.(`[LOCK] sendTuyaCommand failed: ${err.message}`);
        }
      }

      try {
        const cluster = this.zclNode?.endpoints?.[1]?.clusters?.doorLock
          || this.zclNode?.endpoints?.[1]?.clusters?.closuresDoorLock;
        if (cluster) {
          if (value && typeof cluster.lockDoor === 'function') {
            await cluster.lockDoor();
            return true;
          }
          if (!value && typeof cluster.unlockDoor === 'function') {
            await cluster.unlockDoor();
            return true;
          }
        }
      } catch (err) {
        this.log?.(`[LOCK] ZCL doorLock failed: ${err.message}`);
      }

      this.log?.('[LOCK] No TX path succeeded — UI-only sync');
      return false;
    }

    _registerLockControl() {
      if (this._lockControlRegistered) { return; }
      if (typeof this.hasCapability === 'function' && !this.hasCapability('locked')) { return; }
      this._lockControlRegistered = true;

      this.registerCapabilityListener('locked', async (value) => {
        this.log?.(`[LOCK] set locked=${value}`);
        await this._sendLockState(value);
      });
    }

    async lock() {
      if (typeof this.triggerCapabilityListener === 'function') {
        try {
          await this.triggerCapabilityListener('locked', true);
          return true;
        } catch (_) { /* fall through */ }
      }
      await this._sendLockState(true);
      if (typeof this.safeSetCapabilityValue === 'function') {
        await this.safeSetCapabilityValue('locked', true).catch(() => {});
      }
      return true;
    }

    async unlock() {
      if (typeof this.triggerCapabilityListener === 'function') {
        try {
          await this.triggerCapabilityListener('locked', false);
          return true;
        } catch (_) { /* fall through */ }
      }
      await this._sendLockState(false);
      if (typeof this.safeSetCapabilityValue === 'function') {
        await this.safeSetCapabilityValue('locked', false).catch(() => {});
      }
      return true;
    }
  };
}

module.exports = LockControlMixin;
