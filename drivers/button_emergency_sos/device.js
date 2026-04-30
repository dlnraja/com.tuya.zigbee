'use strict';

const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants');

class SosEmergencyButtonDevice extends BaseUnifiedDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SOS] Initializing...');

    // Standard capability check
    if (!this.hasCapability('alarm_generic')) await this.addCapability('alarm_generic').catch(() => {});
    if (!this.hasCapability('measure_battery')) await this.addCapability('measure_battery').catch(() => {});

    // Setup protocols
    await this._setupIasAce();
    await this._setupIasZone();
    await this._setupTuyaDP();
    
    // v7.1.0: Register capability listeners to satisfy self-heal script injection
    this._registerCapabilityListeners();

    this.log('[SOS] Device ready');
  }

  // v7.1.0: Define specific listeners or use fallback from mixin
  _registerCapabilityListeners() {
    this.log('[SOS] Registering capability listeners...');
    // No specific listeners needed for alarm_generic (read-only)
  }

  async _setupIasAce() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const iasAce = ep1?.clusters?.iasAce || ep1?.clusters?.ssIasAce || ep1?.clusters?.[1281];
    if (iasAce) {
       iasAce.onEmergency = () => this._handleAlarm({ source: 'iasAce' });
       this.log('[SOS] IAS ACE enabled');
    }
  }

  async _setupIasZone() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const iasZone = ep1?.clusters?.iasZone || ep1?.clusters?.ssIasZone || ep1?.clusters?.[1280];
    if (iasZone) {
      iasZone.onZoneStatusChangeNotification = (payload) => this._handleAlarm(payload);
      this.log('[SOS] IAS Zone enabled' );
    }
  }

  async _setupTuyaDP() {
    const ep1 = this.zclNode?.endpoints?.[1];
    const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
    if (tuya) {
      tuya.on('datapoint', (dp, value) => {
        if (dp === 1 || dp === 14) this._handleAlarm({ source: 'tuya', dp, value });
        if (dp === 4 || dp === 15 || dp === 101) {
             const battery = typeof value === 'number' ? value : parseInt(value);
             if (!isNaN(battery)) this.setCapabilityValue('measure_battery', battery).catch(() => {});
        }
        if (dp === 13) {
           // v7.1.0: Safe flow trigger for double press
           const doubleCard = this.homey.flow.getTriggerCard('button_emergency_sos_double_pressed');
           if (doubleCard) {
             doubleCard.trigger(this, {}, {}).catch(this.error);
           }
           
           // v7.1.0: Safe flow trigger for long press
           const longCard = this.homey.flow.getTriggerCard('button_emergency_sos_long_pressed');
           if (longCard) {
             longCard.trigger(this, {}, {}).catch(this.error);
           }

           this._handleAlarm({ source: 'tuya-dp13', value });
        }
      });
      this.log('[SOS] Tuya DP enabled');
    }
  }

  _handleAlarm(payload) {
    this.log('[SOS] ALARM DETECTED!', payload);
    this.setCapabilityValue('alarm_generic', true).catch(() => {});
    
    // v7.1.0: Safe flow trigger for generic press
    const pressCard = this.homey.flow.getTriggerCard('button_emergency_sos_pressed', 'trigger');
    if (pressCard) {
      pressCard.trigger(this, {}, {}).catch(this.error);
    }
    
    // Auto reset
    this.homey.setTimeout(() => {
      this.setCapabilityValue('alarm_generic', false).catch(() => {});
    }, 5000);
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = SosEmergencyButtonDevice;


