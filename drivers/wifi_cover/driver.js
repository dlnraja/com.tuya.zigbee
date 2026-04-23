'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiCoverDriver extends TuyaLocalDriver {
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

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    this.log('[WIFI-COVER-DRV] Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{(() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(fn);
  
  
  
  
  
  
  }catch(e){this.log('[Flow]',i,e.message);}};
    r('wifi_cover_open',async({device})=>{await device.triggerCapabilityListener('windowcoverings_state','up');return true;});
    r('wifi_cover_close',async({device})=>{await device.triggerCapabilityListener('windowcoverings_state','down');return true;});
    r('wifi_cover_stop',async({device})=>{await device.triggerCapabilityListener('windowcoverings_state','idle');return true;});
  }
}

module.exports = WiFiCoverDriver;
