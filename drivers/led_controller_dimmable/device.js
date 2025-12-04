'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * LED Controller Dimmable (Single Channel) - v5.3.70
 *
 * For single-channel 24V/12V LED dimmers like:
 * - TS0501B / _TZB210_ngnt8kni (WoodUpp)
 * - Other mono-channel LED drivers
 *
 * Fixes Issue #83: xSondreBx - WoodUpp LED Driver
 *
 * CRITICAL FIX v5.3.70:
 * - Direct ZCL cluster access (bypass HybridLightBase)
 * - Use raw Zigbee commands for levelControl
 * - Multiple command strategies for compatibility
 */
class LEDControllerDimmableDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Prevent double init
    if (this._ledControllerInited) return;
    this._ledControllerInited = true;

    this.zclNode = zclNode;

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║    LED CONTROLLER DIMMABLE (Single Channel) - v5.3.70       ║');
    this.log('║    Fixes Issue #83: WoodUpp 24V LED Driver                  ║');
    this.log('╠══════════════════════════════════════════════════════════════╣');
    this.log('║ ✅ Direct ZCL commands for maximum compatibility            ║');
    this.log('║ ✅ Multiple dimming strategies                              ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // Ensure capabilities exist
    if (!this.hasCapability('onoff')) await this.addCapability('onoff').catch(() => { });
    if (!this.hasCapability('dim')) await this.addCapability('dim').catch(() => { });

    // Get clusters
    const endpoint = zclNode.endpoints[1];
    this._onOffCluster = endpoint?.clusters?.onOff;
    this._levelCluster = endpoint?.clusters?.levelControl;

    // Log cluster availability
    this.log(`[LED] onOff cluster: ${this._onOffCluster ? '✅' : '❌'}`);
    this.log(`[LED] levelControl cluster: ${this._levelCluster ? '✅' : '❌'}`);

    // Setup attribute listeners
    this._setupAttributeListeners();

    // Register capability listeners
    this._registerCapabilityListeners();

    // Try to read initial values
    await this._readInitialValues();

    this.log('[LED] ✅ Initialization complete');
  }

  _setupAttributeListeners() {
    // On/Off attribute listener
    if (this._onOffCluster) {
      this._onOffCluster.on('attr.onOff', (value) => {
        this.log(`[LED] onOff attribute changed: ${value}`);
        this.setCapabilityValue('onoff', !!value).catch(this.error);
      });
    }

    // Level attribute listener
    if (this._levelCluster) {
      this._levelCluster.on('attr.currentLevel', (value) => {
        const dim = Math.max(0, Math.min(1, value / 254));
        this.log(`[LED] currentLevel attribute changed: ${value} → dim=${dim}`);
        this.setCapabilityValue('dim', dim).catch(this.error);
      });
    }
  }

  _registerCapabilityListeners() {
    // On/Off capability
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[LED] Setting onoff: ${value}`);

      if (!this._onOffCluster) {
        this.error('[LED] No onOff cluster!');
        throw new Error('No onOff cluster available');
      }

      try {
        if (value) {
          await this._onOffCluster.setOn();
        } else {
          await this._onOffCluster.setOff();
        }
        this.log(`[LED] ✅ onoff command sent`);
      } catch (err) {
        this.error(`[LED] onoff error: ${err.message}`);
        throw err;
      }
    });

    // Dim capability
    this.registerCapabilityListener('dim', async (value, opts) => {
      this.log(`[LED] Setting dim: ${Math.round(value * 100)}%`);

      if (!this._levelCluster) {
        this.error('[LED] No levelControl cluster!');
        throw new Error('No levelControl cluster available');
      }

      const level = Math.max(1, Math.min(254, Math.round(value * 254)));
      const duration = opts?.duration || 0;
      const transitionTime = Math.round(duration / 100); // Convert ms to 1/10s

      this.log(`[LED] Target level: ${level}, transitionTime: ${transitionTime}`);

      // Try multiple strategies for maximum compatibility
      try {
        // Strategy 1: moveToLevelWithOnOff (recommended for most devices)
        await this._tryMoveToLevelWithOnOff(level, transitionTime);
        this.log(`[LED] ✅ dim command sent via moveToLevelWithOnOff`);
        return;
      } catch (err1) {
        this.log(`[LED] moveToLevelWithOnOff failed: ${err1.message}`);
      }

      try {
        // Strategy 2: moveToLevel (without onOff)
        await this._tryMoveToLevel(level, transitionTime);
        this.log(`[LED] ✅ dim command sent via moveToLevel`);
        return;
      } catch (err2) {
        this.log(`[LED] moveToLevel failed: ${err2.message}`);
      }

      try {
        // Strategy 3: Write currentLevel attribute directly
        await this._tryWriteLevel(level);
        this.log(`[LED] ✅ dim command sent via writeAttributes`);
        return;
      } catch (err3) {
        this.log(`[LED] writeAttributes failed: ${err3.message}`);
      }

      // If all strategies fail, try turning on first then dimming
      try {
        this.log(`[LED] Final attempt: setOn() + moveToLevel()`);
        if (value > 0 && this._onOffCluster) {
          await this._onOffCluster.setOn();
          await new Promise(r => setTimeout(r, 100)); // Small delay
        }
        await this._levelCluster.moveToLevel({ level, transitionTime });
        this.log(`[LED] ✅ dim command sent via setOn + moveToLevel`);
      } catch (err4) {
        this.error(`[LED] All dimming strategies failed: ${err4.message}`);
        throw err4;
      }
    });
  }

  async _tryMoveToLevelWithOnOff(level, transitionTime) {
    if (typeof this._levelCluster.moveToLevelWithOnOff !== 'function') {
      throw new Error('moveToLevelWithOnOff not available');
    }
    await this._levelCluster.moveToLevelWithOnOff({
      level,
      transitionTime
    });
  }

  async _tryMoveToLevel(level, transitionTime) {
    if (typeof this._levelCluster.moveToLevel !== 'function') {
      throw new Error('moveToLevel not available');
    }
    await this._levelCluster.moveToLevel({
      level,
      transitionTime
    });
  }

  async _tryWriteLevel(level) {
    if (typeof this._levelCluster.writeAttributes !== 'function') {
      throw new Error('writeAttributes not available');
    }
    await this._levelCluster.writeAttributes({
      currentLevel: level
    });
  }

  async _readInitialValues() {
    try {
      // Read onOff state
      if (this._onOffCluster) {
        const onOffAttrs = await this._onOffCluster.readAttributes(['onOff']).catch(() => ({}));
        if (onOffAttrs.onOff !== undefined) {
          await this.setCapabilityValue('onoff', !!onOffAttrs.onOff).catch(() => { });
          this.log(`[LED] Initial onoff: ${onOffAttrs.onOff}`);
        }
      }

      // Read level
      if (this._levelCluster) {
        const levelAttrs = await this._levelCluster.readAttributes(['currentLevel']).catch(() => ({}));
        if (levelAttrs.currentLevel !== undefined) {
          const dim = Math.max(0, Math.min(1, levelAttrs.currentLevel / 254));
          await this.setCapabilityValue('dim', dim).catch(() => { });
          this.log(`[LED] Initial level: ${levelAttrs.currentLevel} → dim=${dim}`);
        }
      }
    } catch (err) {
      this.log(`[LED] Could not read initial values: ${err.message}`);
    }
  }
}

module.exports = LEDControllerDimmableDevice;
