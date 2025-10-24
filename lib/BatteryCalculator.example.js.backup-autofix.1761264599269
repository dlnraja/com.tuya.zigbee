
/**
 * EXEMPLE UTILISATION DANS DEVICE.JS
 */

const BatteryCalculator = require('../../lib/BatteryCalculator');

class MultiBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit() {
    // ... autres inits
    
    // Register battery capability
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      reportParser: value => {
        const voltage = value / 10; // millivolts to volts
        
        // Get user's battery type choice from settings
        const batteryType = this.getSetting('battery_type') || 'CR2032';
        
        // Calculate percentage with adaptive calculation
        const percentage = BatteryCalculator.calculatePercentageWithCurve(
          voltage,
          batteryType
        );
        
        this.log(`Battery: ${voltage}V (${batteryType}) = ${percentage}%`);
        
        return percentage;
      }
    });
    
    // Listen for battery type changes
    this.registerSetting('battery_type', async (newValue, oldValue) => {
      this.log(`Battery type changed: ${oldValue} → ${newValue}`);
      
      // Re-read battery to recalculate with new type
      try {
        const { batteryVoltage } = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryVoltage']);
        const voltage = batteryVoltage / 10;
        const percentage = BatteryCalculator.calculatePercentageWithCurve(voltage, newValue);
        
        await this.setCapabilityValue('measure_battery', percentage);
      } catch (err) {
        this.error('Failed to recalculate battery:', err);
      }
    });
  }
}

module.exports = MultiBatteryDevice;
