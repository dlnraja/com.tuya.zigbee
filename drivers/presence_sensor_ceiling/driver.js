'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CeilingPresenceSensorDriver extends ZigBeeDriver {
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
    await super// Sleepy device: Use Passive Mode (SLEEPY_TUYA_56_YEARS_BUG.md)
    .onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    this.log('Ceiling Presence Sensor Driver v5.13.3 initialized');

    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => {
      // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(fn) 
  
  
  
  
  
  
  }
      catch (e) { this.log('[Flow]', id, e.message);   }
    reg('presence_sensor_ceiling_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    reg('presence_sensor_ceiling_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('presence_sensor_ceiling_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

    // Condition cards
    const cond = (id, fn) => {
      // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(fn) }
      catch (e) { this.log('[Flow]', id, e.message);   }
    cond('presence_sensor_ceiling_is_on', async ({ device }) => device.getCapabilityValue('onoff') === true);
    cond('presence_sensor_ceiling_motion_active', async ({ device }) => device.getCapabilityValue('alarm_motion') === true);
    }
module.exports = CeilingPresenceSensorDriver;
