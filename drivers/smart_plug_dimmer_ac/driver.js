'use strict';

const { Driver } = require('homey');

class SmartPlugDimmerAcDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
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

    this.log('SmartPlugDimmerAcDriver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   */
  async onPairListDevices() {
    return [];
  }

}

module.exports = SmartPlugDimmerAcDriver;
