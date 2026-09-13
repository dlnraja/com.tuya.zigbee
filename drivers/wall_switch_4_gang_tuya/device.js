'use strict';

/**
 * 4-Gang EF00 wall switch — P2485 max DP/flow/heuristic adaptation.
 * Couples: shkxsgis / aagrxlbd / hewlydpz / 7ytnacie (+ case forms).
 * Profiles: lib/tuya/Ef00MultiGangProfiles.js (Z2M-locked).
 */

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const {
  resolveEf00MultiGangProfile,
  gangStateDp,
  powerOnToEnum,
  enumToPowerOn,
  indicatorToEnum,
  enumToIndicator,
  colorToEnum,
} = require('../../lib/tuya/Ef00MultiGangProfiles');

Cluster.addCluster(TuyaSpecificCluster);

class wall_switch_4_gang_tuya extends TuyaSpecificClusterDevice {
  get mainsPowered() { return true; }

  get gangCount() { return 4; }

  _resolveMfr() {
    return this.getSetting?.('zb_manufacturer_name')
      || this.getStoreValue?.('zb_manufacturer_name')
      || this.getStoreValue?.('manufacturerName')
      || '';
  }

  _profile() {
    if (!this._ef00Profile) {
      this._ef00Profile = resolveEf00MultiGangProfile(this._resolveMfr(), { gangs: 4 });
      this.log(`[P2485] EF00 profile=${this._ef00Profile.id} mfr=${this._resolveMfr()}`);
    }
    return this._ef00Profile;
  }

  async _setGangOnOff(gang, value) {
    const dp = gangStateDp(this._profile(), gang);
    if (!dp) return false;
    this.log(`[FLOW] _setGangOnOff gang=${gang} dp=${dp} value=${value}`);
    if (typeof this.markAppCommand === 'function') this.markAppCommand();
    await this.writeBool(dp, !!value);
    return true;
  }

  async _stripPhantomBattery() {
    // WHY(P2472a/P2485): mains EF00 4-gang — compose legacy measure_battery must not stick
    try {
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(() => {});
      }
      if (typeof this.setEnergy === 'function') {
        await this.setEnergy({ batteries: null, mains: true }).catch(() => {});
      }
    } catch (_) { /* soft */ }
  }

  async onNodeInit({ zclNode }) {
    this.printNode();
    await this._stripPhantomBattery();

    const { subDeviceId } = this.getData();
    this._gangNumber = subDeviceId === 'secondGang' ? 2
      : subDeviceId === 'thirdGang' ? 3
        : subDeviceId === 'fourthGang' ? 4
          : 1;
    this._isSubDevice = Boolean(subDeviceId);
    const profile = this._profile();

    if (this.isSubDevice()) {
      const dp = gangStateDp(profile, this._gangNumber);
      await this._setupGang(zclNode, `gang ${this._gangNumber}`, dp);
    } else {
      await this._setupGang(zclNode, 'first gang', gangStateDp(profile, 1));
    }

    const tuya = zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya && !this._ef00Bound) {
      this._ef00Bound = true;
      tuya.on('reporting', async (value) => {
        try { await this.processDatapoint(value); } catch (err) { this.error('DP reporting:', err); }
      });
      tuya.on('response', async (value) => {
        try { await this.processDatapoint(value); } catch (err) { this.error('DP response:', err); }
      });
    }

    // UI maintenance buttons → toggle matching gang DP
    for (let gang = 1; gang <= 4; gang++) {
      const cap = `button.${gang}`;
      if (!this.hasCapability(cap)) continue;
      const dp = gangStateDp(profile, gang);
      this.registerCapabilityListener(cap, async () => {
        const next = !this._dpStates?.[dp];
        this.log(`${cap} pressed (UI) — DP${dp} → ${next}`);
        if (typeof this.markAppCommand === 'function') this.markAppCommand();
        await this.writeBool(dp, next);
        return true;
      });
    }

    // Apply settings → TX on boot (heuristic soft)
    await this._applySettingsToDevice(this.getSettings?.() || {}).catch(() => {});
  }

  async _setupGang(zclNode, gangName, dpOnOff) {
    this.registerCapabilityListener('onoff', async (value) => {
      if (typeof this.markAppCommand === 'function') this.markAppCommand();
      this.log(`${gangName} on/off:`, value);
      await this.writeBool(dpOnOff, value);
    });
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const { subDeviceId } = this.getData();
    const profile = this._profile();
    const dps = profile.dps;

    this._dpStates = this._dpStates || {};
    this._dpStates[dp] = parsedValue;
    this.log(`Processing DP ${dp}:`, parsedValue);

    // Gang states
    for (let gang = 1; gang <= (profile.gangs || 4); gang++) {
      const gdp = gangStateDp(profile, gang);
      if (dp !== gdp) continue;
      const mine = (gang === 1 && !this.isSubDevice())
        || (gang === 2 && subDeviceId === 'secondGang')
        || (gang === 3 && subDeviceId === 'thirdGang')
        || (gang === 4 && subDeviceId === 'fourthGang');
      if (!mine) return;
      if (typeof this._triggerPhysicalFlow === 'function') {
        this._triggerPhysicalFlow(gang, parsedValue ? 'on' : 'off');
      }
      await this.safeSetCapabilityValue('onoff', !!parsedValue).catch((e) => this.error(e));
      return;
    }

    // Master all-on/off (DP13) — update main tile only
    if (dps.master != null && dp === dps.master && !this.isSubDevice()) {
      await this.safeSetCapabilityValue('onoff', !!parsedValue).catch(() => {});
      return;
    }

    if (dps.power_on != null && dp === dps.power_on) {
      const mode = enumToPowerOn(Number(parsedValue));
      await this.setSettings({ power_on_behavior: mode }).catch(() => {});
      return;
    }

    if (dps.indicator != null && dp === dps.indicator) {
      const mode = enumToIndicator(Number(parsedValue));
      await this.setSettings({ backlight_mode: mode }).catch(() => {});
      return;
    }

    if (dps.backlight_switch != null && dp === dps.backlight_switch) {
      await this.setSettings({ backlight_switch: parsedValue ? 'on' : 'off' }).catch(() => {});
      return;
    }

    if (dps.child_lock != null && dp === dps.child_lock) {
      await this.setSettings({ child_lock: parsedValue ? 'locked' : 'unlocked' }).catch(() => {});
      return;
    }

    if (dps.backlight_pct != null && dp === dps.backlight_pct) {
      await this.setSettings({ backlight_brightness: Math.max(0, Math.min(100, Number(parsedValue) || 0)) }).catch(() => {});
      return;
    }

    // Countdown RX soft-store (no invent capability)
    for (const key of ['countdown_l1', 'countdown_l2', 'countdown_l3', 'countdown_l4']) {
      if (dps[key] != null && dp === dps[key]) {
        this._dpStates[`cd_${key}`] = Number(parsedValue) || 0;
        return;
      }
    }

    this.log('Unhandled DP:', dp, parsedValue);
  }

  async onSettings({ newSettings, changedKeys }) {
    await this._applySettingsToDevice(newSettings, changedKeys);
    return true;
  }

  async _applySettingsToDevice(settings, changedKeys = null) {
    const profile = this._profile();
    const dps = profile.dps;
    const keys = changedKeys || Object.keys(settings || {});
    const want = (k) => !changedKeys || keys.includes(k);

    if (want('power_on_behavior') && dps.power_on != null && settings.power_on_behavior != null) {
      await this.writeEnum(dps.power_on, powerOnToEnum(settings.power_on_behavior)).catch((e) => this.error(e));
    }
    if (want('backlight_mode') && dps.indicator != null && settings.backlight_mode != null) {
      // strings: off / normal / inverted → indicator enum
      await this.writeEnum(dps.indicator, indicatorToEnum(settings.backlight_mode)).catch((e) => this.error(e));
    }
    if (want('backlight_switch') && dps.backlight_switch != null && settings.backlight_switch != null) {
      await this.writeBool(dps.backlight_switch, settings.backlight_switch === 'on' || settings.backlight_switch === true).catch((e) => this.error(e));
    }
    if (want('child_lock') && dps.child_lock != null && settings.child_lock != null) {
      await this.writeBool(dps.child_lock, settings.child_lock === 'locked' || settings.child_lock === true).catch((e) => this.error(e));
    }
    if (want('backlight_brightness') && dps.backlight_pct != null && settings.backlight_brightness != null) {
      await this.writeData32(dps.backlight_pct, Math.max(0, Math.min(100, Number(settings.backlight_brightness) || 0))).catch((e) => this.error(e));
    }
    if (want('on_color') && dps.on_color != null && settings.on_color != null) {
      await this.writeEnum(dps.on_color, colorToEnum(settings.on_color)).catch((e) => this.error(e));
    }
    if (want('off_color') && dps.off_color != null && settings.off_color != null) {
      await this.writeEnum(dps.off_color, colorToEnum(settings.off_color)).catch((e) => this.error(e));
    }
  }

  /** Flow helper: set countdown seconds for gang 1–4 */
  async setGangCountdown(gang, seconds) {
    const profile = this._profile();
    const key = `countdown_l${gang}`;
    const dp = profile.dps[key];
    if (dp == null) return false;
    if (typeof this.markAppCommand === 'function') this.markAppCommand();
    await this.writeData32(dp, Math.max(0, Math.min(86400, Number(seconds) || 0)));
    return true;
  }

  async setChildLock(locked) {
    const dp = this._profile().dps.child_lock;
    if (dp == null) return false;
    if (typeof this.markAppCommand === 'function') this.markAppCommand();
    await this.writeBool(dp, !!locked);
    return true;
  }

  async setBacklightSwitch(on) {
    const dp = this._profile().dps.backlight_switch;
    if (dp == null) return false;
    if (typeof this.markAppCommand === 'function') this.markAppCommand();
    await this.writeBool(dp, !!on);
    return true;
  }

  onDeleted() {
    super.onDeleted();
    this.log('4 Gang Wall Switch removed');
  }
}

module.exports = wall_switch_4_gang_tuya;
