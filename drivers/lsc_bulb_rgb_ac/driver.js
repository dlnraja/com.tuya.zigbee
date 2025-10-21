'use strict';

const { Driver } = require('homey');

/**
 * Smart Bulb Color RGB+CCT (AC) Driver
 */
class BulbColorRgbcctAcDriver extends Driver {

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

    this.log('bulb_color_rgbcct_ac driver initialized');
  }

  async onPair(session) {
    this.log('Pairing bulb_color_rgbcct_ac...');
    
    session.setHandler('list_devices', async () => {
      return [];
    });
  }

}

module.exports = BulbColorRgbcctAcDriver;
