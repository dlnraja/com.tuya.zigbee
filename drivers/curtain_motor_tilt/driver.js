'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CurtainMotorTiltDriver extends ZigBeeDriver {
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
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;








    this.log('CurtainMotorTiltDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(fn) 
  
  
  
  
  
  
  } catch (e) { this.log('[Flow]', id, e.message);   }
    reg('curtain_motor_tilt_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    reg('curtain_motor_tilt_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('curtain_motor_tilt_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

    }
module.exports = CurtainMotorTiltDriver;
