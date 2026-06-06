'use strict';

const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

const DRIVER_CAPABILITIES = new Set(['garagedoor_closed', 'alarm_contact']);

// DP1 intentionally absent — relay pulse (0→1 in ~100ms), not a state signal.
// transform: v => v on DP3 signals TuyaEF00Manager to use raw parsed value.
// Without it, _applyDPValue falls through to temperature auto-conversion
// (generic fallback maps DP3→'temperature_soil'), making dp-3 always emit 0.
const DRIVER_DP_MAPPINGS = {
  3: { capability: 'alarm_contact', parser: v => !!v, transform: v => v },
};

class GarageDoorOpenerDevice extends BaseUnifiedDevice {

  async onNodeInit({ zclNode }) {
    if (this._initialized) { return; }
    this._initialized = true;

    await super.onNodeInit({ zclNode });

    // Set device-level dpMappings so TuyaEF00Manager._getDPContext(3) returns
    // 'alarm_contact' instead of 'temperature_soil' (generic fallback default).
    // This is the primary guard against temperature auto-conversion of DP3.
    this.dpMappings = { 3: { capability: 'alarm_contact' } };

    // Disable UniversalVariantManager — it incorrectly routes DP1→alarm_contact
    if (this.variantManager) {
      this.variantManager.destroy?.();
      this.variantManager = null;
      this.log('[GarageOpener] UniversalVariantManager disabled');
    }

    // ZCL fallback for TS0603 variants that expose genOnOff
    if (this.zclNode?.endpoints?.[1]?.clusters?.genOnOff) {
      this.log('[GarageOpener] ZCL OnOff fallback mode (TS0603)');
      this.registerCapability('garagedoor_closed', 'genOnOff', {
        get: 'onOff',
        reportParser: value => !value,
        set: value => !value,
      });
      return;
    }

    if (this.tuyaEF00Manager) {
      // Lock tuyaEF00Manager.dpMappings — background init overwrites it with generic
      // passive defaults. The setter is a no-op; getter always returns DRIVER_DP_MAPPINGS.
      // DRIVER_DP_MAPPINGS[3].transform also triggers raw-value path in _applyDPValue
      // (secondary guard against temperature auto-conversion).
      Object.defineProperty(this.tuyaEF00Manager, 'dpMappings', {
        get: () => DRIVER_DP_MAPPINGS,
        set: () => {},
        configurable: true,
        enumerable: true,
      });
      this.log('[GarageOpener] dpMappings locked');

      // DP3 = physical contact sensor = ground truth for both capabilities.
      // DP1 is a relay pulse (0→1 within ~100ms) — intentionally not listened.
      this.tuyaEF00Manager.on('dp-3', (value) => {
        const isOpen = !!value;
        await this.setCapabilityValue('alarm_contact', isOpen)
          .catch(err => this.error(`[GarageOpener] alarm_contact set failed: ${err.message}`));
        await this.setCapabilityValue('garagedoor_closed', !isOpen)
          .catch(err => this.error(`[GarageOpener] garagedoor_closed set failed: ${err.message}`));
        this.log(`[GarageOpener] DP3 → door ${isOpen ? 'OPEN' : 'CLOSED'} (raw=${value})`);
      });
    }

    // Send Tuya command when user opens/closes via Homey
    this.registerCapabilityListener('garagedoor_closed', async (value) => {
      if (typeof this.markAppCommand === 'function') { this.markAppCommand(1, value); }
      this.log(`[GarageOpener] Command: ${value ? 'CLOSE' : 'OPEN'}`);
      return this.sendTuyaCommand(1, value ? 0 : 1, 'bool');
    });

    this.log('[GarageOpener] ✅ Ready');
  }

  // Break the TuyaZigbeeDevice.setCapabilityValue → BaseUnifiedDevice.safeSetCapabilityValue
  // circular reference introduced in v5.13.5: TZD.setCV calls this.safeSetCV which resolves
  // (dynamic dispatch) to BUD.safeSetCV, which calls this.setCV again — ThrottleManager
  // breaks the loop before the actual Homey write at TZD line 833 is ever reached.
  // TZD.safeSetCapabilityValue uses super.setCapabilityValue (lexically bound above TZD),
  // so calling it directly bypasses the loop while preserving sanity/calibration/throttle.
  async setCapabilityValue(capabilityId, value) {
    return TuyaZigbeeDevice.prototype.safeSetCapabilityValue.call(this, capabilityId, value);
  }

  // Prevent IntelligentDeviceAdapter / DCM from adding non-driver capabilities.
  async addCapability(capability) {
    if (!DRIVER_CAPABILITIES.has(capability)) {
      this.log(`[GarageOpener] Blocked addCapability: ${capability}`);
      return Promise.resolve();
    }
    return super.addCapability(capability);
  }

  // Called polymorphically by BaseUnifiedDevice — cleans up after background init.
  async _runBackgroundInitialization() {
    this.log('[GarageOpener] background init: start');
    await super._runBackgroundInitialization();
    this.log('[GarageOpener] background init: super done, cleaning up');

    // Destroy IntelligentDeviceAdapter — maps DP1/DP3/DP12 to wrong capabilities
    if (this.intelligentAdapter) {
      this.intelligentAdapter.destroy?.();
      this.intelligentAdapter = null;
      this.log('[GarageOpener] IntelligentDeviceAdapter disabled');
    }

    // Clear stored adapter data to prevent re-learning on next restart
    await this.setStoreValue('intelligentAdapter', null).catch(() => {});
    await this.setStoreValue('intelligentAdapterData', null).catch(() => {});

    // Remove any capabilities added despite the addCapability guard
    for (const cap of this.getCapabilities()) {
      if (!DRIVER_CAPABILITIES.has(cap)) {
        await this.removeCapability(cap).catch(() => {});
        this.log(`[GarageOpener] Removed unexpected capability: ${cap}`);
      }
    }

    // Set default CLOSED state if alarm_contact was never set (fresh install / upgrade).
    // Must run here — not in onNodeInit — because setCapabilityValue needs the device
    // to be fully initialized before Homey accepts the write.
    // Device is edge-triggered and passive (no active query), so this is the only
    // reliable way to provide a sane initial state before the first sensor change.
    if (this.getCapabilityValue('alarm_contact') === null) {
      await this.setCapabilityValue('alarm_contact', false).catch(() => {});
      await this.setCapabilityValue('garagedoor_closed', true).catch(() => {});
      this.log('[GarageOpener] alarm_contact was null: defaulted to CLOSED (background init)');
    }

    // Request current DP3 state — device only reports on edge change, not on connect.
    // This device is passive-mode only so requestDP may return "no active query method"
    // but we still attempt it; some firmware versions respond.
    if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestDP === 'function') {
      await new Promise(r => setTimeout(r, 2000));
      await this.tuyaEF00Manager.requestDP(3).catch(() => {});
      this.log('[GarageOpener] DP3 state requested for initial sync');
    }

    this.log('[GarageOpener] background init: cleanup done');
  }

}

module.exports = GarageDoorOpenerDevice;
