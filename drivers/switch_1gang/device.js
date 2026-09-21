'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { setupSonoffEwelink, handleSonoffEwlSettings } = require('../../lib/mixins/SonoffEwelinkMixin');
const {
  isHobeianZg301z,
  healHobeianZg301z,
  forceSwitchTypeState,
  clearOnTimeCountdown,
} = require('../../lib/tuya/HobeianZg301zHeal');
const {
  shouldSkipElectricalReporting,
  buildCalmElectricalReportingConfigs,
  configureReportingSoft,
} = require('../../lib/zigbee/MeshFloodCalm');

/**
 * 1-GANG SWITCH - v5.5.940 + P2632/P2662/P2663 HOBEIAN ZG-301Z
 *
 * Uses UnifiedSwitchBase (DP + ZCL).
 * NOTE: BSEED → wall_switch_1gang_1way.
 * P2632: HOBEIAN+ZG-301Z kitchen light auto-off ~5s → clear onTime + force switch_type=state.
 * P2663: heal BEFORE reporting; calm electrical intervals (mesh flood).
 */
class Switch1GangDevice extends UnifiedSwitchBase {

  get gangCount() { return 1; }

  /**
   * WHY(P2665): HOBEIAN ZG-301Z exposes unused 0xEF00 — never queryAll / EF00 TX.
   */
  getDeviceProfile() {
    const base = (typeof super.getDeviceProfile === 'function' && super.getDeviceProfile()) || {};
    if (isHobeianZg301z(this)) {
      return Object.assign({}, base, {
        noEf00Tx: true,
        noEf00: true,
        mainsPowered: true,
        skipBatteryReporting: true,
        protocol: 'zcl_onoff',
      });
    }
    return base;
  }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   * (skipped at runtime for HOBEIAN ZG-301Z — no electrical clusters)
   */
  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    if (isHobeianZg301z(this)) {
      return { ...parentMappings };
    }
    return {
      ...parentMappings,
      17: { capability: 'measure_current', smartDivisor: true, unit: 'A' },
      18: { capability: 'measure_power', smartDivisor: true, unit: 'W' },
      19: { capability: 'measure_voltage', smartDivisor: true, unit: 'V' },
      20: { capability: 'meter_power', smartDivisor: true, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    // WHY(P2663): resolve HOBEIAN + disable leftover electrical reports BEFORE any
    // configureAttributeReporting — blank pid on 1.0.34 flooded the mesh (~4k msgs).
    try {
      await healHobeianZg301z(this, zclNode);
    } catch (e) {
      this.log('[P2632] heal soft-fail:', e.message);
    }

    const hobeian301 = isHobeianZg301z(this) || shouldSkipElectricalReporting(this);

    if (!hobeian301) {
      try {
        const ok = await configureReportingSoft(
          this,
          buildCalmElectricalReportingConfigs({ withBattery: true, withJitter: true }),
        );
        if (ok) this.log('[P2663] calm electrical reporting configured (jittered)');
      } catch (err) {
        this.log('Attribute reporting config failed (device may not support it):', err.message);
      }
    } else {
      this.log('[P2663] skip electrical reporting (HOBEIAN / no electrical cluster)');
    }

    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    await setupSonoffEwelink(this, zclNode);

    // Re-heal after super (settings/mfr may have been filled by base)
    try {
      await healHobeianZg301z(this, zclNode);
    } catch (e) {
      this.log('[P2632] post-super heal soft-fail:', e.message);
    }

    this.log('[SWITCH-1G] ready' + (hobeian301 ? ' (P2632/P2663 HOBEIAN ZG-301Z mesh-calm)' : ''));
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });
    for (const k of changedKeys) {
      await handleSonoffEwlSettings(this, k, newSettings[k]);
      if (k === 'switch_mode' && isHobeianZg301z(this)) {
        const v = newSettings[k];
        if (v === 'state' || v === 'toggle') {
          await forceSwitchTypeState(this);
          if (v === 'toggle') {
            try { await this._writeE001Attribute?.('switchMode', 0); } catch (_e) { /* soft */ }
          }
        }
        await clearOnTimeCountdown(this);
      }
      if (k === 'clear_countdown' && newSettings[k]) {
        await clearOnTimeCountdown(this);
        await this.setSettings({ clear_countdown: false }).catch(() => {});
      }
    }
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = Switch1GangDevice;
