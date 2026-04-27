'use strict';

const { Driver } = require('homey');

class UsbDongleTripleDriver extends Driver {
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

    this.log('USB Dongle Triple driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{// Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(fn);
  
  
  
  
  
  
  }catch(e){this.log('[Flow]',i,e.message);  }
    r('usb_dongle_triple_all_on',async({device})=>{for(const c of['onoff','onoff.gang2','onoff.gang3'])if(device.hasCapability(c))await device.triggerCapabilityListener(c,true);return true;});
    r('usb_dongle_triple_all_off',async({device})=>{for(const c of['onoff','onoff.gang2','onoff.gang3'])if(device.hasCapability(c))await device.triggerCapabilityListener(c,false);return true;});
    }
module.exports = UsbDongleTripleDriver;
