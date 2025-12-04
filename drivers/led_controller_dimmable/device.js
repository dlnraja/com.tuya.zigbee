'use strict';

const { HybridLightBase } = require('../../lib/devices');

/**
 * LED Controller Dimmable (Single Channel) - v5.3.65
 *
 * For single-channel 24V/12V LED dimmers like:
 * - TS0501B / _TZB210_ngnt8kni (WoodUpp)
 * - Other mono-channel LED drivers
 *
 * Fixes Issue #83: xSondreBx - WoodUpp LED Driver
 *
 * IMPORTANT: These devices advertise ColorControl cluster (768)
 * but it's NOT functional! We IGNORE it and only use:
 * - onOff (cluster 6)
 * - levelControl (cluster 8)
 * - moveToLevelWithOnOff command for proper dimming
 */
class LEDControllerDimmableDevice extends HybridLightBase {

  /** Only on/off and dim - NO color temperature! */
  get lightCapabilities() {
    return ['onoff', 'dim'];
  }

  /** Override to ensure moveToLevelWithOnOff is used */
  async _setDim(value) {
    this.log(`[LED-DIM] Setting brightness: ${Math.round(value * 100)}%`);

    const endpoint = this.zclNode?.endpoints?.[1];
    const levelCluster = endpoint?.clusters?.levelControl || endpoint?.clusters?.genLevelCtrl;

    if (!levelCluster) {
      this.error('[LED-DIM] No levelControl cluster found!');
      return;
    }

    const level = Math.max(1, Math.round(value * 254)); // Minimum level 1 to prevent turning off

    // CRITICAL: Use moveToLevelWithOnOff for Tuya LED controllers
    // This ensures the light turns ON when dimming from 0
    if (typeof levelCluster.moveToLevelWithOnOff === 'function') {
      this.log(`[LED-DIM] Using moveToLevelWithOnOff(${level})`);
      await levelCluster.moveToLevelWithOnOff({
        level: level,
        transitionTime: 0
      });
    } else {
      // Fallback: separate commands
      this.log(`[LED-DIM] Fallback: moveToLevel(${level}) + setOn()`);
      await levelCluster.moveToLevel({ level, transitionTime: 0 });

      // Also turn on if dimming up
      if (value > 0) {
        const onOffCluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff;
        if (onOffCluster) {
          await onOffCluster.setOn();
        }
      }
    }
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║    LED CONTROLLER DIMMABLE (Single Channel) - v5.3.65       ║');
    this.log('║    Fixes Issue #83: WoodUpp 24V LED Driver                  ║');
    this.log('╠══════════════════════════════════════════════════════════════╣');
    this.log('║ ✅ onoff + dim ONLY (no CCT/RGB)                            ║');
    this.log('║ ✅ Uses moveToLevelWithOnOff for proper Tuya dimming        ║');
    this.log('║ ✅ Ignores non-functional ColorControl cluster              ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');
    this.log('');
  }
}

module.exports = LEDControllerDimmableDevice;
