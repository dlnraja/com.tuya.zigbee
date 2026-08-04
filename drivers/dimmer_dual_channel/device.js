'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');
const { isUnsupportedError } = require('../../lib/zigbee/UnsupportedRegistry');

/**
 * DimmerDualChannelDevice - v5.3.90
 *
 * Supports 2-channel dimmers like TS1101 / _TZ3000_7ysdnebc
 *
 * Channel 1: Endpoint 1 (onoff, dim)
 * Channel 2: Endpoint 2 (onoff.channel2, dim.channel2)
 *
 * v5.12.58 (P92.125): UNSUPPORTED_CLUSTER fallback — some devices sold as
 * "2-channel dimmer" are TS0601 Tuya-DP devices (no levelControl/onOff on
 * endpoint 2), and even ZCL variants reject commands on a missing cluster
 * (forum JohnLundin #2069: red UNSUPPORTED_CLUSTER banner on every touch).
 * Every command now cascades: ZCL endpoint cluster → Tuya DP
 * (canonical 2ch dimmer map: DP1 state L1, DP2 bright L1 0-1000,
 *  DP3 state L2, DP4 bright L2 0-1000).
 */
class DimmerDualChannelDevice extends PhysicalButtonMixin(VirtualButtonMixin(TuyaZigbeeDevice)) {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await this._safeInvoke(async () => { await super.onNodeInit({ zclNode  });
    await this.initVirtualButtons();
      this.log('╔══════════════════════════════════════════════════════════════╗');
      this.log('║         DUAL CHANNEL DIMMER v5.3.90 (+DP fallback)           ║');
      this.log('╚══════════════════════════════════════════════════════════════╝');

      // CHANNEL 1 — onoff / dim with ZCL → DP fallback
      if (this.hasCapability('onoff')) {
        this.registerCapabilityListener('onoff', async (value) => this._setChannelOnOff(zclNode, 1, value));
        this._registerZclAttrMirror(zclNode, 1, 'onOff', 'onoff', Boolean);
        this.log('[CH1] ✅ onoff (ZCL ep1 + DP1 fallback)');
      }
      if (this.hasCapability('dim')) {
        this.registerCapabilityListener('dim', async (value) => this._setChannelDim(zclNode, 1, value));
        this._registerZclAttrMirror(zclNode, 1, 'currentLevel', 'dim', (v) => v / 254);
        this.log('[CH1] ✅ dim (ZCL ep1 + DP2 fallback)');
      }

      // CHANNEL 2 — onoff.channel2 / dim.channel2 with ZCL → DP fallback
      if (this.hasCapability('onoff.channel2')) {
        this.registerCapabilityListener('onoff.channel2', async (value) => this._setChannelOnOff(zclNode, 2, value));
        this._registerZclAttrMirror(zclNode, 2, 'onOff', 'onoff.channel2', Boolean);
        this.log('[CH2] ✅ onoff.channel2 (ZCL ep2 + DP3 fallback)');
      }
      if (this.hasCapability('dim.channel2')) {
        this.registerCapabilityListener('dim.channel2', async (value) => this._setChannelDim(zclNode, 2, value));
        this._registerZclAttrMirror(zclNode, 2, 'currentLevel', 'dim.channel2', (v) => v / 254);
        this.log('[CH2] ✅ dim.channel2 (ZCL ep2 + DP4 fallback)');
      }
      this.log('[DIMMER-DUAL] ✅ 2-Channel Dimmer Ready');
    }, 'onNodeInit');
  }

  /** Tuya DP ids per channel: state 1/3, brightness 2/4 (canonical 2ch dimmer). */
  _dpFor(channel, kind) {
    return kind === 'onoff' ? (channel === 1 ? 1 : 3) : (channel === 1 ? 2 : 4);
  }

  async _sendDpFallback(dp, value, type) {
    if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.sendDP === 'function') {
      return this.tuyaEF00Manager.sendDP(dp, value, type).catch((e) => {
        this.log(`[DIMMER-DUAL] DP${dp} send failed: ${e.message}`);
        return false;
      });
    }
    if (typeof this._sendTuyaDP === 'function') {
      return this._sendTuyaDP(dp, value, type).catch(() => false);
    }
    this.log('[DIMMER-DUAL] ⚠️ no Tuya DP sender available');
    return false;
  }

  async _setChannelOnOff(zclNode, channel, value) {
    const cluster = zclNode.endpoints[channel] && zclNode.endpoints[channel].clusters
      && (zclNode.endpoints[channel].clusters.onOff || zclNode.endpoints[channel].clusters.genOnOff);
    if (cluster) {
      try {
        await (value ? cluster.setOn() : cluster.setOff());
        await this.safeSetCapabilityValue(channel === 1 ? 'onoff' : 'onoff.channel2', value).catch(() => {});
        return true;
      } catch (e) {
        if (!isUnsupportedError(e)) { throw e; } // transient: surface it
        this.log(`[DIMMER-DUAL] CH${channel} onOff unsupported → DP fallback`);
      }
    }
    const dp = this._dpFor(channel, 'onoff');
    const sent = await this._sendDpFallback(dp, Boolean(value), 'bool');
    if (sent !== false) {
      await this.safeSetCapabilityValue(channel === 1 ? 'onoff' : 'onoff.channel2', value).catch(() => {});
      return true;
    }
    throw new Error(`channel${channel}_onoff_unreachable`);
  }

  async _setChannelDim(zclNode, channel, value) {
    const dimValue = Math.min(1, Math.max(0, Number(value) || 0));
    const cluster = zclNode.endpoints[channel] && zclNode.endpoints[channel].clusters
      && (zclNode.endpoints[channel].clusters.levelControl || zclNode.endpoints[channel].clusters.genLevelCtrl);
    if (cluster) {
      try {
        await cluster.moveToLevel({ level: Math.round(dimValue * 254), transitionTime: 10 });
        await this.safeSetCapabilityValue(channel === 1 ? 'dim' : 'dim.channel2', dimValue).catch(() => {});
        return true;
      } catch (e) {
        if (!isUnsupportedError(e)) { throw e; }
        this.log(`[DIMMER-DUAL] CH${channel} levelControl unsupported → DP fallback`);
      }
    }
    // Tuya 2ch dimmer brightness DPs use the 0-1000 range
    const dp = this._dpFor(channel, 'dim');
    const dpValue = Math.max(10, Math.round(dimValue * 1000));
    const sent = await this._sendDpFallback(dp, dpValue, 'value');
    if (sent !== false) {
      await this.safeSetCapabilityValue(channel === 1 ? 'dim' : 'dim.channel2', dimValue).catch(() => {});
      return true;
    }
    throw new Error(`channel${channel}_dim_unreachable`);
  }

  /** Mirror ZCL attribute reports into capabilities (state sync). */
  _registerZclAttrMirror(zclNode, channel, attr, capability, map) {
    try {
      const clusters = zclNode.endpoints[channel] && zclNode.endpoints[channel].clusters;
      const cluster = clusters && (clusters.onOff || clusters.genOnOff || clusters.levelControl || clusters.genLevelCtrl);
      const target = attr === 'currentLevel'
        ? (clusters && (clusters.levelControl || clusters.genLevelCtrl))
        : cluster;
      if (target && typeof target.on === 'function') {
        target.on(`attr.${attr}`, (v) => {
          this.safeSetCapabilityValue(capability, map(v)).catch(() => {});
        });
      }
    } catch (_e) { /* mirror is best-effort */ }
  }

  onDeleted() {
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = DimmerDualChannelDevice;
