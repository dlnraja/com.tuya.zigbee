'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// WHY(2026-10-10 publish hold): led_controller_spi_tuya is held out of the Athom payload (any new driver id
// fails Athom processing, see docs/knowledge/ATHOM_LIMITS.md). Its Gledopto GL-SPI-206P couples are folded
// here as a variant profile: same capabilities, but the device uses the SPI class (DP61 single coalesced frame).
// Contre quoi: SPI controllers paired here would otherwise get the generic RGB DP layout and not respond.
const SPI_MFRS = new Set(['_tze204_8fffc3kb', '_tze284_gt5al3bl', '_tze28c1000000_gt5al3bl']);

class LedControllerRgbDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  onMapDeviceClass(device) {
    try {
      const mfr = String((device.getSetting && device.getSetting('zb_manufacturer_name'))
        || (device.getStore && device.getStore() && device.getStore().manufacturerName) || '').toLowerCase();
      if (SPI_MFRS.has(mfr)) return require('../../lib/devices/LedControllerSpiTuyaDevice');
    } catch (_e) { /* fall back to the default device class */ }
    return require('./device');
  }

async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('led_controller_rgb_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] led_controller_rgb_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('led_controller_rgb_turn_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', true).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', true).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] led_controller_rgb_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('led_controller_rgb_turn_off');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', false).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', false).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] led_controller_rgb_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('led_controller_rgb_toggle');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !args.device.getCapabilityValue('onoff');
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] led_controller_rgb_toggle:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('led_controller_rgb_set_brightness');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.temperature ?? args.brightness ?? args.dim ?? args.value ?? args.speed;
          if (raw === undefined) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', raw).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', raw).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] led_controller_rgb_set_brightness:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('LedControllerRgbDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try {
      this.homey.flow.getActionCard(id).registerRunListener(fn) 
  
  
  
  
  
  
  } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('led_controller_rgb_turn_on', async ({ device }) => { await device['setCapabilityValue']('onoff', true); return true; });
    // v5.13.3: Condition handler



    reg('led_controller_rgb_turn_off', async ({ device }) => { await device['setCapabilityValue']('onoff', false); return true; });
    reg('led_controller_rgb_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device['setCapabilityValue']('onoff', !v); return true; });

  }

}

module.exports = LedControllerRgbDriver;
