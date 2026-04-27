'use strict';

const { Driver } = require('homey');

class FingerprintLockDriver extends Driver {
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

    this.log('Fingerprint Lock driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{// Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(fn);
  
  
  
  
  
  
  }catch(e){this.log('[Flow]',i,e.message);  }
    r('fingerprint_lock_lock',async({device})=>{await device.triggerCapabilityListener('locked',true);return true;});
    r('fingerprint_lock_unlock',async({device})=>{await device.triggerCapabilityListener('locked',false);return true;});
    }
module.exports = FingerprintLockDriver;
