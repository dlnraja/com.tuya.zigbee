'use strict';

// A8: NaN Safety - use safeDivide/safeMultiply
  require('homey');

class SwitchTempSensorDriver extends Homey.Driver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Switch with Temperature Sensor Driver initialized');
    // v5.13.3: Flow card handlers
    const r=(i,fn)=>{try{(() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(fn);
  
  
  
  
  
  
  }catch(e){this.log('[Flow]',i,e.message);}};
    r('switch_temp_sensor_turn_on',async({device})=>{await device.triggerCapabilityListener('onoff',true);return true;});
    r('switch_temp_sensor_turn_off',async({device})=>{await device.triggerCapabilityListener('onoff',false);return true;});
    r('switch_temp_sensor_toggle',async({device})=>{const v=device.getCapabilityValue('onoff');await device.triggerCapabilityListener('onoff',!v);return true;});
  }
}

module.exports = SwitchTempSensorDriver;
