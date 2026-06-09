'use strict';
const UniversalZigbeeDevice = require('../../lib/UniversalZigbeeDevice');

class tuya_generic_dpid extends UniversalZigbeeDevice {
  async onNodeInit() {
    this.log('Tuya Generic DPID Device Initializing...');
    await super.onNodeInit();

    this.initCapabilityListeners();

    if (this._universalBridge) {
      this._universalBridge.on('dp', (event) => {
        this.log(`[GENERIC DPID] Received DP ${event.dp} = ${event.value} (${event.typeName})`);
        this.triggerDpReceivedFlow(event.dp, event.value);
        this.processDynamicCapabilityUpdate(event.dp, event.value);
      });
    } else {
      this.log('Warning: Universal Bridge not initialized.');
    }
  }

  processDynamicCapabilityUpdate(dpId, value) {
    const mappings = {
      'dp_onoff_1': 'onoff.1',
      'dp_onoff_2': 'onoff.2',
      'dp_onoff_3': 'onoff.3',
      'dp_dim_1': 'dim.1',
      'dp_dim_2': 'dim.2',
      'dp_temperature': 'measure_temperature',
      'dp_humidity': 'measure_humidity',
      'dp_power': 'measure_power',
      'dp_battery': 'measure_battery'
    };

    for (const [settingId, capabilityId] of Object.entries(mappings)) {
      const mappedDp = this.getSetting(settingId);
      if (mappedDp && Number(mappedDp) === Number(dpId)) {
        let parsedValue = value;
        // Normalize value based on capability
        if (capabilityId.startsWith('dim')) {
          // Tuya dimming is typically 0-1000 or 10-1000, Homey is 0.0-1.0
          parsedValue = Number(value) / 1000;
          if (parsedValue > 1) parsedValue = 1;
        } else if (capabilityId.startsWith('measure_temperature')) {
          // Typically 1 decimal place (e.g. 215 = 21.5)
          parsedValue = Number(value) / 10;
        } else if (capabilityId.startsWith('measure_power')) {
          parsedValue = Number(value) / 10;
        }
        
        this.log(`[GENERIC DPID] Mapping DP ${dpId} to capability ${capabilityId} with value ${parsedValue}`);
        this.setCapabilityValue(capabilityId, parsedValue).catch(e => this.error('Capability Set Error:', e.message));
      }
    }
  }

  initCapabilityListeners() {
    const capabilities = [
      'onoff.1', 'onoff.2', 'onoff.3',
      'dim.1', 'dim.2'
    ];

    capabilities.forEach(cap => {
      if (this.hasCapability(cap)) {
        this.registerCapabilityListener(cap, async (value) => {
          this.log(`[GENERIC DPID] User triggered capability ${cap} with value ${value}`);
          
          let settingId = '';
          if (cap.startsWith('onoff')) {
            settingId = `dp_onoff_${cap.split('.')[1]}`;
          } else if (cap.startsWith('dim')) {
            settingId = `dp_dim_${cap.split('.')[1]}`;
          }

          const targetDp = this.getSetting(settingId);
          if (targetDp && targetDp > 0) {
            let dpType = 'bool';
            let dpValue = value;
            
            if (cap.startsWith('dim')) {
              dpType = 'value';
              dpValue = Math.round(value * 1000);
            }

            await this.sendRawDataPoint(targetDp, dpType, dpValue);
          } else {
            this.log(`[GENERIC DPID] Cannot trigger ${cap}: No DP mapped in settings.`);
          }
        });
      }
    });
  }

  async sendRawDataPoint(dpId, type, value) {
    this.log(`[GENERIC DPID] Sending DP ${dpId} of type ${type} with value ${value}`);
    try {
      if (this._universalBridge && typeof this._universalBridge.sendDP === 'function') {
        let parsedValue = value;
        if (type === 'bool') parsedValue = value === 'true' || value === '1' || value === true;
        else if (type === 'value' || type === 'enum' || type === 'bitmap') parsedValue = parseInt(value, 10);
        else if (type === 'raw') parsedValue = Buffer.from(String(value).replace(/[^0-9A-Fa-f]/g, ''), 'hex');
        
        await this._universalBridge.sendDP(Number(dpId), parsedValue, type);
        this.log(`[GENERIC DPID] DP sent successfully`);
        return true;
      } else {
        throw new Error('Universal Bridge not ready');
      }
    } catch (e) {
      this.error(`Failed to send DP: ${e.message}`);
      throw e;
    }
  }

  async triggerDpReceivedFlow(dpId, value) {
    try {
      const trigger = this.homey.flow.getDeviceTriggerCard('tuya_generic_receive_dp');
      if (trigger) {
        await trigger.trigger(this, { dp: Number(dpId), value: String(value) }).catch(() => {});
      }
    } catch (err) {
      this.error('Failed to trigger flow:', err.message);
    }
  }
}

module.exports = tuya_generic_dpid;
