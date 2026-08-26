'use strict';

/**
 * DeviceFusionHooks (P2269 Phase 2)
 *
 * WHY (P215):
 * - Pourquoi: DeviceIOFacade grew into a god-file (TX/RX + battery/button/SOS/scene/exotic).
 * - Comment: Fusion methods live here; DeviceIOFacade.attachDeviceFusionHooks(proto) keeps API.
 * - Pour qui: Homey runtime (master soak); SSOT docs for CI agents.
 * - Quand: capability RX commit paths after protocol decode.
 * - Contre quoi: Duplicate linear battery formulas / native setCapabilityValue loops.
 *
 * TIP HUM: docs/architecture/SPAGHETTI_MAP.md · BATTERY_SSOT.md
 */

let BatteryRouter;
try {
  BatteryRouter = require('../helpers/BatteryRouter');
} catch (_e) {
  BatteryRouter = null;
}

let UnifiedBatteryHandler;
try {
  UnifiedBatteryHandler = require('../battery/UnifiedBatteryHandler');
} catch (_e) {
  UnifiedBatteryHandler = null;
}

const FUSION_METHODS = {
  /**
   * Fuse BatteryRouter + UnifiedBatteryHandler into one RX commit path.
   * Bans linear (v-2.5)/0.5 — always uses UnifiedBatteryHandler curves.
   */
  async fuseBattery(dpOrAttr, value, meta = {}) {
    try {
      const device = this.device;
      if (!device?.hasCapability?.('measure_battery') && meta.force !== true) {
        return false;
      }

      let percent = null;
      const source = meta.source || 'io-fuse-battery';

      if (meta.kind === 'voltage' || meta.isVoltage) {
        if (!UnifiedBatteryHandler) {return false;}
        const voltage = UnifiedBatteryHandler.normalizeVoltage(value);
        const chem = BatteryRouter?.getRecommendedBatteryType?.(device)
          || meta.batteryType
          || 'CR2032';
        percent = UnifiedBatteryHandler.calculateFromVoltage(voltage, chem);
      } else if (typeof dpOrAttr === 'number' || /^\d+$/.test(String(dpOrAttr))) {
        const dp = Number(dpOrAttr);
        if (UnifiedBatteryHandler?.normalizeTuyaBatteryValue) {
          const profile = UnifiedBatteryHandler.lookupBatteryProfile?.(
            device.getSetting?.('zb_manufacturer_name'),
            device.getSetting?.('zb_model_id'),
          );
          percent = UnifiedBatteryHandler.normalizeTuyaBatteryValue(dp, value, {
            profile,
            manufacturerName: device.getSetting?.('zb_manufacturer_name'),
          });
        }
      } else if (UnifiedBatteryHandler?.normalizeZigbeeValue) {
        percent = UnifiedBatteryHandler.normalizeZigbeeValue(value);
      } else if (typeof value === 'number') {
        percent = value > 100 ? Math.round(value / 2) : Math.round(value);
      }

      if (percent == null || Number.isNaN(percent)) {return false;}
      percent = Math.max(0, Math.min(100, Math.round(percent)));

      if (UnifiedBatteryHandler?.shouldCommitBatteryValue) {
        const okCommit = UnifiedBatteryHandler.shouldCommitBatteryValue(device, percent, { source });
        if (okCommit === false) {return false;}
      }

      if (typeof device.safeSetCapabilityValue === 'function') {
        await device.safeSetCapabilityValue('measure_battery', percent);
      } else if (typeof device.setCapabilityValue === 'function') {
        await device.setCapabilityValue('measure_battery', percent);
      } else {
        return false;
      }
      this._log(`fuseBattery → ${percent}% (${source})`);
      return true;
    } catch (err) {
      this._log('fuseBattery failed:', err?.message || err);
      return false;
    }
  },

  /**
   * Fuse PhysicalButtonMixin + VirtualButtonMixin + NamedButtonFallback.
   * event: { gang, pressType } | number gang | string pressType
   */
  async fuseButton(event, meta = {}) {
    try {
      const device = this.device;
      let gang = meta.gang ?? 1;
      let pressType = meta.pressType || meta.type || 'single';

      if (event && typeof event === 'object') {
        gang = event.gang ?? event.button ?? event.endpoint ?? gang;
        pressType = event.pressType || event.type || event.action || pressType;
      } else if (typeof event === 'number') {
        gang = event;
      } else if (typeof event === 'string') {
        pressType = event;
      }

      if (typeof device._triggerPhysicalFlow === 'function' && meta.virtual !== true) {
        device._triggerPhysicalFlow(gang, pressType, meta.tokens || {});
        return true;
      }
      if (typeof device.triggerButtonPress === 'function') {
        await device.triggerButtonPress(gang, pressType, meta.clicks || 1, {
          source: meta.source || 'io-fuse-button',
        });
        return true;
      }
      if (meta.virtual === true && typeof device._handleVirtualToggle === 'function') {
        await device._handleVirtualToggle(gang, meta);
        return true;
      }

      const cap = gang > 1 ? `button.${gang}` : 'button';
      if (typeof device.safeSetCapabilityValue === 'function' && device.hasCapability?.(cap)) {
        await device.safeSetCapabilityValue(cap, true);
        this.defer(() => device.safeSetCapabilityValue(cap, false).catch(() => {}), 200);
        return true;
      }
      return false;
    } catch (err) {
      this._log('fuseButton failed:', err?.message || err);
      return false;
    }
  },

  /**
   * Fuse SOS via IAS ACE emergency/panic or IAS Zone alarm bits.
   * Accepts boolean | status object | numeric zoneStatus bitmask (IAS Zone).
   */
  async fuseSos(zoneStatus, meta = {}) {
    try {
      const device = this.device;
      let statusObj = null;

      if (typeof zoneStatus === 'number') {
        statusObj = {
          alarm1: !!(zoneStatus & 0x0001),
          alarm2: !!(zoneStatus & 0x0002),
          tamper: !!(zoneStatus & 0x0004),
          batteryLow: !!(zoneStatus & 0x0008),
          emergency: !!(zoneStatus & 0x0001),
          panic: !!(zoneStatus & 0x0002),
        };
      } else if (zoneStatus && typeof zoneStatus === 'object') {
        statusObj = zoneStatus;
      }

      let active = false;
      if (typeof zoneStatus === 'boolean') {
        active = zoneStatus;
      } else if (statusObj) {
        active = !!(statusObj.alarm1 || statusObj.alarm2 || statusObj.emergency
          || statusObj.panic || meta.emergency || meta.panic);
      } else if (meta.emergency || meta.panic) {
        active = true;
      }

      if (statusObj && device._iasZoneEnhanced?._updateCapabilitiesFromStatus) {
        await device._iasZoneEnhanced._updateCapabilitiesFromStatus(statusObj).catch(() => {});
      }

      const caps = ['alarm_sos', 'alarm_generic', 'alarm_contact', 'alarm_motion']
        .filter((c) => device.hasCapability?.(c));
      if (!caps.length && meta.forceCapability) {
        caps.push(meta.forceCapability);
      }
      if (!caps.length && !device._iasZoneEnhanced) {return false;}

      for (const cap of caps) {
        if (typeof device.safeSetCapabilityValue === 'function') {
          // eslint-disable-next-line no-await-in-loop
          await device.safeSetCapabilityValue(cap, active);
        } else if (typeof device.setCapabilityValue === 'function') {
          // eslint-disable-next-line no-await-in-loop
          await device.setCapabilityValue(cap, active);
        }
      }

      if (statusObj?.tamper != null && device.hasCapability?.('alarm_tamper')) {
        await device.safeSetCapabilityValue?.('alarm_tamper', !!statusObj.tamper);
      }
      if (statusObj?.batteryLow != null && device.hasCapability?.('alarm_battery')) {
        await device.safeSetCapabilityValue?.('alarm_battery', !!statusObj.batteryLow);
      }

      if (active && typeof device._triggerPhysicalFlow === 'function' && meta.triggerFlow !== false) {
        device._triggerPhysicalFlow(meta.gang || 1, 'sos', { sos: true });
      }
      return true;
    } catch (err) {
      this._log('fuseSos failed:', err?.message || err);
      return false;
    }
  },

  /**
   * MultistateInput / genScenes recall → button/scene flow.
   */
  async fuseScene(sceneId, meta = {}) {
    try {
      const device = this.device;
      const id = sceneId?.sceneId ?? sceneId?.sceneGroup ?? sceneId;
      const gang = meta.gang || meta.button || Number(id) || 1;
      const pressType = meta.pressType || meta.action || 'single';

      if (typeof device._triggerPhysicalFlow === 'function') {
        device._triggerPhysicalFlow(gang, pressType, {
          sceneId: id,
          source: 'io-fuse-scene',
          ...(meta.tokens || {}),
        });
        return true;
      }
      return this.fuseButton({ gang, pressType }, { ...meta, source: 'io-fuse-scene' });
    } catch (err) {
      this._log('fuseScene failed:', err?.message || err);
      return false;
    }
  },

  /**
   * Write Tuya E001 attrs (switchMode / powerOnBehavior) via io.writeZcl.
   */
  async writeE00x(attrName, value, opts = {}) {
    try {
      const ep = opts.endpoint ?? 1;
      const cluster = opts.cluster ?? 0xE001;
      const map = {
        switchMode: { switchMode: value },
        powerOnBehavior: { powerOnBehavior: value },
        backlight: { backlightMode: value },
      };
      const attrs = opts.attributes || map[attrName] || { [attrName]: value };
      const ok = await this.writeZcl(ep, cluster, attrs);
      if (!ok && cluster === 0xE001) {
        return this.writeZcl(ep, 0xE001, attrs);
      }
      return ok;
    } catch (err) {
      this._log('writeE00x failed:', err?.message || err);
      return false;
    }
  },

  /**
   * Subscribe IR binder events when Zosung clusters present (profile opt-in).
   */
  async subscribeIrBinder(opts = {}) {
    try {
      const epId = opts.endpoint ?? 1;
      const ep = this.device.zclNode?.endpoints?.[epId];
      if (!ep?.clusters) {return false;}
      const ir = ep.clusters.zosungIRControl
        || ep.clusters[0xE004]
        || ep.clusters[57348]
        || ep.clusters.zosungIRTransmit
        || ep.clusters[0xED00];
      if (!ir) {
        this._log('subscribeIrBinder: no IR cluster');
        return false;
      }
      if (this._binder && typeof this._binder.subscribeCluster === 'function') {
        await this._binder.subscribeCluster(epId, ir);
      }
      this.device._irBinderSubscribed = true;
      this._log('IR binder subscribed');
      return true;
    } catch (err) {
      this._log('subscribeIrBinder failed:', err?.message || err);
      return false;
    }
  },

  /**
   * Cover calibration hooks — route through UnifiedCoverBase / DP10 when present.
   */
  async coverCalibration(action = 'start', opts = {}) {
    try {
      const device = this.device;
      if (typeof device.startCalibration === 'function' && action === 'start') {
        await device.startCalibration(opts);
        return true;
      }
      if (typeof device.stopCalibration === 'function' && action === 'stop') {
        await device.stopCalibration(opts);
        return true;
      }
      if (opts.seconds != null) {
        return this.sendDP(10, Number(opts.seconds) || 0, { type: 'value', ...opts });
      }
      if (opts.reverse != null) {
        return this.sendDP(5, opts.reverse ? 1 : 0, { type: 'enum', ...opts });
      }
      this._log('coverCalibration: no handler / seconds');
      return false;
    } catch (err) {
      this._log('coverCalibration failed:', err?.message || err);
      return false;
    }
  },

  /**
   * Apply a named exotic profile from data/exotic_cluster_profiles.json (opt-in).
   * Never auto-maps unknown clusters to capabilities — listen/bind only.
   */
  async applyExoticProfile(profileId, opts = {}) {
    try {
      if (!profileId) {return false;}
      const fs = require('fs');
      const path = require('path');
      const p = path.join(__dirname, '..', '..', 'data', 'exotic_cluster_profiles.json');
      if (!fs.existsSync(p)) {
        this._log('applyExoticProfile: profiles file missing');
        return false;
      }
      const table = JSON.parse(fs.readFileSync(p));
      const profile = table?.profiles?.[profileId];
      if (!profile) {
        this._log('applyExoticProfile: unknown', profileId);
        return false;
      }
      const results = { profileId, actions: {} };
      const actions = profile.actions || [];
      for (const action of actions) {
        if (action === 'subscribeIrBinder') {
          // eslint-disable-next-line no-await-in-loop
          results.actions[action] = !!(await this.subscribeIrBinder(opts).catch(() => false));
        } else if (action === 'coverCalibration' && opts.coverAction) {
          // eslint-disable-next-line no-await-in-loop
          results.actions[action] = !!(await this.coverCalibration(opts.coverAction, opts).catch(() => false));
        } else if (action === 'startReportingPollFallback') {
          results.actions[action] = !!this.startReportingPollFallback(opts.poll || {});
        } else if (action === 'writeE00x' && opts.attrName != null) {
          // eslint-disable-next-line no-await-in-loop
          results.actions[action] = !!(await this.writeE00x(opts.attrName, opts.value, opts).catch(() => false));
        } else if (action === 'fuseScene' || action === 'fuseButton') {
          results.actions[action] = 'armed';
        } else {
          results.actions[action] = 'skipped';
        }
      }
      this.device._exoticProfile = results;
      this._log('exotic profile applied:', profileId, JSON.stringify(results.actions));
      return true;
    } catch (err) {
      this._log('applyExoticProfile failed:', err?.message || err);
      return false;
    }
  },
};

/**
 * Attach fusion/exotic methods onto DeviceIOFacade.prototype.
 * @param {object} proto
 */
function attachDeviceFusionHooks(proto) {
  if (!proto || typeof proto !== 'object') {return;}
  Object.assign(proto, FUSION_METHODS);
}

module.exports = {
  attachDeviceFusionHooks,
  FUSION_METHODS,
};
