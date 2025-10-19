'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {

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

        this.log('Tuya Zigbee Driver has been initialized');
        await super.onInit();
        
        // Register global intelligent flow cards (shared across all drivers)
        try {
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
                  return args.device.checkCondition ? args.device.checkCondition(cardId) : false;
                });
            } catch (err) {
              // Card doesn't exist, skip
            }
          });
          
          this.log('✅ Intelligent flow cards registered');
        } catch (err) {
          this.error('⚠️ Flow registration error:', err);
        }
    }

}

module.exports = TuyaZigbeeDriver;
