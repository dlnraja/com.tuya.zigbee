'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const { safeSetTimeout } = require('../../lib/utils/safe-timers');

/**
 * WallCurtainSwitchDevice — TS130F ZCL windowCovering (cluster 258)
 *
 * WHY P2275 / D011 (ZHA#5226 · Z2M TS130F invert_cover):
 * - Pourquoi: `_TZ3210_ol1uhvza`+TS130F reports inverted lift % and can stop mid-travel
 *   if Homey TX sends raw Homey 0–1 without invert.
 * - Comment: invert_position setting (+ auto for ol1uhvza) on TX goToLiftPercentage and RX attr.
 * - Pour qui: Homey cover tile users (master soak).
 * - Quand: onNodeInit + capability listeners + attr.currentPositionLiftPercentage.
 * - Contre quoi: one-way TX-only driver with no RX → stuck UI / ~50% travel.
 *
 * D033: backlight via OnOff attr 0x5000 (TuyaOnOffExtCluster.backlightSwitch).
 */
class WallCurtainSwitchDevice extends PhysicalButtonMixin(VirtualButtonMixin(TuyaZigbeeDevice)) {

  get mainsPowered() { return true; }
  get gangCount() { return 1; }

  _mfr() {
    try {
      return String(
        this.getSetting?.('zb_manufacturer_name')
        || this.getData?.()?.manufacturerName
        || ''
      ).toLowerCase();
    } catch (_e) {
      return '';
    }
  }

  /**
   * Homey windowcoverings_set: 0=closed, 1=open.
   * ZCL currentPositionLiftPercentage: device-dependent; invert when needed.
   */
  _shouldInvertPosition() {
    // Couple default ON for ol1uhvza (ZHA#5226); checkbox enables invert for other TS130F.
    if (this._mfr().includes('ol1uhvza')) return true;
    return !!(typeof this.getSetting === 'function' && this.getSetting('invert_position'));
  }

  _toDevicePercent(homey01) {
    let pct = Math.round(Math.max(0, Math.min(1, Number(homey01) || 0)) * 100);
    if (this._shouldInvertPosition()) pct = 100 - pct;
    return pct;
  }

  _fromDevicePercent(devicePct) {
    let pct = Math.max(0, Math.min(100, Number(devicePct) || 0));
    if (this._shouldInvertPosition()) pct = 100 - pct;
    return pct / 100;
  }

  async onNodeInit({ zclNode }) {
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    this.log('[WallCurtain] Initializing (P2275 invert/RX)...');
    await super.onNodeInit({ zclNode });
    await this.initVirtualButtons();

    this._invertedPosition = this._shouldInvertPosition();
    if (this._invertedPosition) {
      this.log('[WallCurtain] position invert ON (setting or ol1uhvza couple)');
    }

    const ep = zclNode?.endpoints?.[1];
    const cover = ep?.clusters?.windowCovering
      || ep?.clusters?.closuresWindowCovering
      || ep?.clusters?.[258]
      || ep?.clusters?.['258'];

    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        if (!cover?.goToLiftPercentage) return;
        const percentageLiftValue = this._toDevicePercent(value);
        this.log(`[WallCurtain] TX lift ${Math.round(value * 100)}% → device ${percentageLiftValue}%`);
        return cover.goToLiftPercentage({ percentageLiftValue });
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (value) => {
        if (!cover) return;
        switch (value) {
          case 'up': return cover.upOpen?.();
          case 'down': return cover.downClose?.();
          default: return cover.stop?.();
        }
      });
    }

    // RX: position reports (missing previously — root of stuck/mid-travel UI)
    if (cover?.on && this.hasCapability('windowcoverings_set')) {
      cover.on('attr.currentPositionLiftPercentage', async (v) => {
        try {
          const homey = this._fromDevicePercent(v);
          await this.safeSetCapabilityValue('windowcoverings_set', homey);
        } catch (_e) { /* noop */ }
      });
    }

    // Configure reporting + seed position
    safeSetTimeout(this, async () => {
      try {
        if (cover?.configureReporting) {
          await cover.configureReporting({
            currentPositionLiftPercentage: {
              minInterval: 1,
              maxInterval: 300,
              minChange: 1,
            },
          }).catch(() => {});
        }
        if (cover?.readAttributes) {
          const attrs = await cover.readAttributes(['currentPositionLiftPercentage']).catch(() => null);
          if (attrs?.currentPositionLiftPercentage != null && this.hasCapability('windowcoverings_set')) {
            await this.safeSetCapabilityValue(
              'windowcoverings_set',
              this._fromDevicePercent(attrs.currentPositionLiftPercentage),
            );
          }
        }
      } catch (_e) { /* sleepy-safe */ }
    }, 2000);

    this.log('[WallCurtain] Ready');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (typeof super.onSettings === 'function') {
      await super.onSettings({ oldSettings, newSettings, changedKeys }).catch(() => {});
    }
    if (changedKeys.includes('invert_position')) {
      this._invertedPosition = !!newSettings.invert_position;
      this.log(`[WallCurtain] invert_position → ${this._invertedPosition}`);
    }
    // D033: TS130F backlight_switch attr 0x5000 on OnOff
    if (changedKeys.includes('backlight_mode')) {
      try {
        const ep = this.zclNode?.endpoints?.[1];
        const onOff = ep?.clusters?.onOff;
        if (onOff?.writeAttributes) {
          const mode = newSettings.backlight_mode;
          const map = { off: 0, low: 1, high: 2, normal: 1, inverted: 2 };
          const val = map[String(mode)] ?? (mode ? 1 : 0);
          await onOff.writeAttributes({ backlightSwitch: val }).catch(() => {
            // Numeric attr id fallback when cluster schema lacks manufacturer attrs
            return onOff.writeAttributes({ 0x5000: val }).catch(() => false);
          });
          this.log(`[WallCurtain] backlight 0x5000 → ${val}`);
        }
      } catch (err) {
        this.log(`[WallCurtain] backlight write failed: ${err.message}`);
      }
    }
  }

}

module.exports = WallCurtainSwitchDevice;
