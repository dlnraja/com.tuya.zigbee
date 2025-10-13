'use strict';

const { Driver } = require('homey');

/**
 * Wireless Scene Controller 4-Button (Battery) Driver
 */
class WirelessSceneController4buttonBatteryDriver extends Driver {

  async onInit() {
    // ========================================
    // FLOW CARD REGISTRATION - Auto-generated
    // ========================================
    
    // Register condition cards (if any exist in app.json)
    try {
      // Safety conditions
      if (this.homey.flow.getConditionCard) {
        const conditionCards = [
          'any_safety_alarm_active',
          'is_armed',
          'anyone_home',
          'room_occupied',
          'air_quality_good',
          'climate_optimal',
          'all_entries_secured',
          'is_consuming_power',
          'natural_light_sufficient'
        ];
        
        conditionCards.forEach(cardId => {
          try {
            this.homey.flow.getConditionCard(cardId)
              .registerRunListener(async (args) => {
                return args.device.checkAnyAlarm ? args.device.checkAnyAlarm() : false;
              });
          } catch (err) {
            // Card doesn't exist, skip
          }
        });
      }
      
      this.log('✅ Flow cards registered');
    } catch (err) {
      this.error('⚠️ Flow registration error:', err);
    }

    this.log('wireless_scene_controller_4button_battery driver initialized');
  }

  async onPair(session) {
    this.log('Pairing wireless_scene_controller_4button_battery...');
    
    session.setHandler('list_devices', async () => {
      return [];
    });
  }

}

module.exports = WirelessSceneController4buttonBatteryDriver;
