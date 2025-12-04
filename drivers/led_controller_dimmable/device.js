'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * LED Controller Dimmable (Single Channel) - v5.3.75
 *
 * For single-channel 24V/12V LED dimmers like:
 * - TS0501B / _TZB210_ngnt8kni (WoodUpp)
 * - Other mono-channel LED drivers
 *
 * Fixes Issue #83: xSondreBx - WoodUpp LED Driver
 *
 * v5.3.75 CHANGES:
 * - Added 7 dimming strategies (some Tuya devices need specific approaches)
 * - Added non-zero transition time (some devices need this!)
 * - Added moveWithOnOff, step, move commands
 * - Added ultra-verbose logging for diagnostics
 * - Added cluster method inspection
 */
class LEDControllerDimmableDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Prevent double init
    if (this._ledControllerInited) return;
    this._ledControllerInited = true;

    this.zclNode = zclNode;

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║    LED CONTROLLER DIMMABLE (Single Channel) - v5.3.75       ║');
    this.log('║    Fixes Issue #83: WoodUpp 24V LED Driver                  ║');
    this.log('╠══════════════════════════════════════════════════════════════╣');
    this.log('║ ✅ 7 dimming strategies for maximum compatibility           ║');
    this.log('║ ✅ Ultra-verbose logging for diagnostics                    ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // Ensure capabilities exist
    if (!this.hasCapability('onoff')) await this.addCapability('onoff').catch(() => { });
    if (!this.hasCapability('dim')) await this.addCapability('dim').catch(() => { });

    // Get clusters
    const endpoint = zclNode.endpoints[1];
    this._onOffCluster = endpoint?.clusters?.onOff;
    this._levelCluster = endpoint?.clusters?.levelControl;

    // Log cluster availability with detailed info
    this.log(`[LED] onOff cluster: ${this._onOffCluster ? '✅' : '❌'}`);
    this.log(`[LED] levelControl cluster: ${this._levelCluster ? '✅' : '❌'}`);

    // Log available methods on levelControl cluster
    if (this._levelCluster) {
      const methods = Object.keys(this._levelCluster).filter(k => typeof this._levelCluster[k] === 'function');
      this.log(`[LED] levelControl methods: ${methods.join(', ')}`);
    }

    // Log device info
    const settings = this.getSettings() || {};
    const store = this.getStore() || {};
    this.log(`[LED] Model: ${settings.zb_modelId || store.modelId || 'unknown'}`);
    this.log(`[LED] Manufacturer: ${settings.zb_manufacturerName || store.manufacturerName || 'unknown'}`);

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

    // Dim capability - v5.3.75: 7 STRATEGIES for maximum compatibility
    this.registerCapabilityListener('dim', async (value, opts) => {
      this.log('');
      this.log('┌─────────────────────────────────────────────────────────────┐');
      this.log(`│ 💡 DIM COMMAND: ${Math.round(value * 100)}%`);
      this.log('└─────────────────────────────────────────────────────────────┘');

      if (!this._levelCluster) {
        this.error('[LED] ❌ No levelControl cluster!');
        throw new Error('No levelControl cluster available');
      }

      const level = Math.max(1, Math.min(254, Math.round(value * 254)));
      this.log(`[LED] Target level: ${level} (0-254 scale)`);

      // IMPORTANT: Some Tuya devices REQUIRE non-zero transition time!
      const strategies = [
        // Strategy 1: moveToLevelWithOnOff (transition=0)
        { name: 'moveToLevelWithOnOff (transition=0)', fn: () => this._levelCluster.moveToLevelWithOnOff?.({ level, transitionTime: 0 }) },

        // Strategy 2: moveToLevelWithOnOff (transition=10 = 1 second) - SOME TUYA DEVICES NEED THIS
        { name: 'moveToLevelWithOnOff (transition=10)', fn: () => this._levelCluster.moveToLevelWithOnOff?.({ level, transitionTime: 10 }) },

        // Strategy 3: moveToLevel (without onOff)
        { name: 'moveToLevel (transition=0)', fn: () => this._levelCluster.moveToLevel?.({ level, transitionTime: 0 }) },

        // Strategy 4: moveToLevel with transition
        { name: 'moveToLevel (transition=10)', fn: () => this._levelCluster.moveToLevel?.({ level, transitionTime: 10 }) },

        // Strategy 5: step command (for devices that prefer step-by-step)
        {
          name: 'stepWithOnOff', fn: async () => {
            const currentLevel = await this._levelCluster.readAttributes?.(['currentLevel']).then(r => r.currentLevel || 127).catch(() => 127);
            const diff = level - currentLevel;
            if (diff !== 0) {
              const mode = diff > 0 ? 0 : 1; // 0=up, 1=down
              const stepSize = Math.abs(diff);
              await this._levelCluster.stepWithOnOff?.({ mode, stepSize, transitionTime: 10 });
            }
          }
        },

        // Strategy 6: Write currentLevel attribute directly
        { name: 'writeAttributes(currentLevel)', fn: () => this._levelCluster.writeAttributes?.({ currentLevel: level }) },

        // Strategy 7: setOn + delay + moveToLevel
        {
          name: 'setOn + moveToLevel', fn: async () => {
            if (value > 0 && this._onOffCluster) {
              await this._onOffCluster.setOn();
              await new Promise(r => setTimeout(r, 200));
            }
            await this._levelCluster.moveToLevel?.({ level, transitionTime: 10 });
          }
        }
      ];

      let successStrategy = null;

      for (const strategy of strategies) {
        try {
          this.log(`[LED] 🔄 Trying: ${strategy.name}...`);
          const result = strategy.fn();
          if (result && typeof result.then === 'function') {
            await result;
          }
          this.log(`[LED] ✅ SUCCESS via ${strategy.name}`);
          successStrategy = strategy.name;
          break;
        } catch (err) {
          this.log(`[LED] ❌ ${strategy.name} failed: ${err.message}`);
        }
      }

      if (!successStrategy) {
        this.error('[LED] ❌ ALL 7 dimming strategies failed!');
        this.error('[LED] This device may not support standard levelControl commands.');
        this.error('[LED] Consider using a Tuya-specific approach or contact support.');
        throw new Error('All dimming strategies failed');
      }

      this.log('');
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
