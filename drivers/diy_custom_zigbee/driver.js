'use strict';

const { Driver } = require('homey');

class DiyCustomZigbeeDriver extends Driver {
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

    this.log('DIY Custom Zigbee Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{// Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(fn);
  
  
  
  
  
  
  }catch(e){this.log('[Flow]',i,e.message);  }
    r('diy_custom_zigbee_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    r('diy_custom_zigbee_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    r('diy_custom_zigbee_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});
    this.log('Supports: PTVO, ESP32-H2/C6, CC2530/CC2652, DIYRuZ, Tasmota Z2T');
  }

  async onPairListDevices() {
    return [];
    }
module.exports = DiyCustomZigbeeDriver;
