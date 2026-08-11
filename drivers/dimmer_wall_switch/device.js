'use strict';
const { safeParse, safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

class DimmerWallSwitchDevice extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  // v9.0.411 (P92): Energy scaling note (CI gate check-energy-divisor).
  // This driver has no local Tuya-DP or ZCL energy code path: `measure_power`
  // is populated by Homey's approximated energy (driver.compose.json
  // capabilitiesOptions.measure_power "approximated": true). If ZCL energy
  // reporting is later wired via registerCapability, homey-zigbeedriver's
  // system capability configs (lib/system/capabilities/meter_power/metering.js,
  // measure_power|measure_current|measure_voltage/electricalMeasurement.js)
  // apply scaling from the device-reported multiplier/divisor attributes
  // (metering multiplier/divisor, acPowerMultiplier/acPowerDivisor, etc.) —
  // factor = multiplier / divisor: default 1 when unread.

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Dimmer Wall Switch v5.9.12 Ready');

    // v9.0.411 (P92.119): UI maintenance buttons — this driver extends
    // ZigBeeDevice directly, so the universal TuyaZigbeeDevice button
    // listeners do not apply here.
    for (const [cap, epNum] of [['button.1', 1], ['button.toggle_1', 1], ['button.toggle_2', 2]]) {
      if (!this.hasCapability(cap)) { continue; }
      try {
        this.registerCapabilityListener(cap, async () => {
          this.log(`[BUTTON-UI] ${cap} pressed (virtual)`);
          const cluster = zclNode.endpoints[epNum] && zclNode.endpoints[epNum].clusters
            && zclNode.endpoints[epNum].clusters.onOff;
          if (cluster && typeof cluster.toggle === 'function') {
            await cluster.toggle();
            const onoffCap = epNum === 1 ? 'onoff' : `onoff.gang${epNum}`;
            if (this.hasCapability(onoffCap)) {
              await this.safeSetCapabilityValue(onoffCap, this.getCapabilityValue(onoffCap) !== true)
                .catch(() => {});
            }
          } else {
            this.log(`[BUTTON-UI] ${cap}: no onOff cluster on endpoint ${epNum} (no-op)`);
          }
          return true;
        });
      } catch (e) {
        this.log(`[BUTTON-UI] could not register ${cap}: ${e.message}`);
      }
    }
    if (this.hasCapability('button.identify')) {
      try {
        this.registerCapabilityListener('button.identify', async () => {
          const idc = zclNode.endpoints[1] && zclNode.endpoints[1].clusters
            && zclNode.endpoints[1].clusters.identify;
          if (idc && typeof idc.identify === 'function') {
            await idc.identify({ identifyTime: 5 }).catch(() => {});
          }
          this.log('[BUTTON-UI] button.identify pressed');
          return true;
        });
      } catch (e) {
        this.log(`[BUTTON-UI] could not register button.identify: ${e.message}`);
      }
    }

    const ep = zclNode.endpoints[1];
    if (ep && ep.clusters.levelControl) {
      ep.clusters.levelControl.on('attr.currentLevel', (value) => {
        const dim = value / 254;
        this.safeSetCapabilityValue('dim', dim).catch(() => {});
      });
      this._readInitialLevel(ep.clusters.levelControl);
    }
  }

  async _readInitialLevel(cluster) {
    try {
      const data = await cluster.readAttributes(['currentLevel']).catch(() => ({}));
      if (data.currentLevel != null) {
        this.safeSetCapabilityValue('dim', data.currentLevel / 254).catch(() => {});
      }
    } catch (e) {
      this.log('Initial level read failed:', e.message);
    }
  }

  async setCapabilityValue(capability, value) {
    if (capability === 'dim') {
      const level = Math.round(value * 254);
      const ep = this.zclNode.endpoints[1];
      if (ep && ep.clusters.levelControl) {
        await ep.clusters.levelControl.moveToLevel({ level, transitionTime: 10 });
      }
    }
    return super.setCapabilityValue(capability, value);
  }
}

module.exports = DimmerWallSwitchDevice;
