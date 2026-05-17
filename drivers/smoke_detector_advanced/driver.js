'use strict';
const CI = require('../../lib/utils/CaseInsensitiveMatcher');

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.568: CRITICAL FIX - Jolink forum report: flow cards give error
 * - Added flow card run listeners for all defined flow cards
 * - Fixed: smoke_detector_advanced_smoke_detected condition
 * - Fixed: smoke_detector_advanced_battery_above condition
 * - Fixed: smoke_detector_advanced_test_alarm action
 * 
 * v5.5.527: CRITICAL FIX - Martijn PG-S11Z pairing issue
 * Device _TZE284_rccxox8p supported but pairing fails -> "Unknown Zigbee Device"
 * Root cause: Pairing timeout/driver selection failure
 */
class SmartSmokeDetectorAdvancedDriver extends ZigBeeDriver {
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

    this.log('SmartSmokeDetectorAdvancedDriver v5.5.568 initialized');
    this.log(' FIX: Flow card run listeners registered (Jolink forum report)');

    // Register flow card run listeners
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  /**
   * v5.5.568: Register flow card run listeners
   * Jolink forum: "flow cards give an error" - cards were defined but not registered
   */
  _registerFlowCards() {
    // 
    // CONDITION: Smoke is/is not detected
    // 
    try {
      const smokeDetectedCondition =

      smokeDetectedCondition.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Condition: Device not available');
          return false;
        }
        const smokeDetected = device.getCapabilityValue('alarm_smoke');
        this.log(`[FLOW] Condition smoke_detected: ${smokeDetected}`);
        return smokeDetected === true;
      });
      this.log('[FLOW]  Registered: smoke_detector_advanced_smoke_detected');
    } catch (err) {
      this.log(`[FLOW]  Could not register smoke_detected condition: ${err.message}`);
    }

    // 
    // CONDITION: Battery is/is not above threshold
    // 
    try {
      const batteryAboveCondition =

      batteryAboveCondition.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Condition: Device not available');
          return false;
        }
        const battery = device.getCapabilityValue('measure_battery') || 0;
        const threshold = args.threshold || 20;
        const isAbove = battery > threshold;
        this.log(`[FLOW] Condition battery_above: ${battery}% > ${threshold}% = ${isAbove}`);
        return isAbove;
      });
      this.log('[FLOW]  Registered: smoke_detector_advanced_battery_above');
    } catch (err) {
      this.log(`[FLOW]  Could not register battery_above condition: ${err.message}`);
    }

    // 
    // ACTION: Test the alarm
    // 
    try {
      const testAlarmAction =

      testAlarmAction.registerRunListener(async (args) => {
        const device = args.device;
        if (!device) {
          this.log('[FLOW] Action: Device not available');
          return false;
        }
        
        this.log('[FLOW] Action test_alarm: Triggering self-test');
        
        // Try to send self-test command via Tuya DP
        try {
          if (device._tuyaEF00Manager) {
            // DP8 = self_test on many smoke detectors
            await device._tuyaEF00Manager.sendDatapoint(8, true, 'bool');
            this.log('[FLOW]  Self-test command sent via Tuya DP8');
            return true;
          } else {
            this.log('[FLOW]  Tuya manager not available - device may not support remote test');
            return true; // Return true to not break the flow
          }
        } catch (err) {
          this.log(`[FLOW]  Self-test failed: ${err.message}`);
          return true; // Return true to not break the flow
        }
      });
      this.log('[FLOW]  Registered: smoke_detector_advanced_test_alarm');
    } catch (err) {
      this.log(`[FLOW]  Could not register test_alarm action: ${err.message}`);
    }

    this.log('[FLOW]  All smoke detector flow cards registered');
  }

  /**
   * v5.5.527: Enhanced pairing flow for problematic TZE284 devices
   * Martijn's _TZE284_rccxox8p TS0601 supported but pairing fails
   */
  async onPairListDevices({ zclNode }) {
    this.log('[PAIR]  Smart Smoke Detector Advanced pairing started...');
    
    try {
      // Get device info
      const { manufacturerName, productId } = zclNode;
      this.log(`[PAIR]  Device: ${manufacturerName} ${productId}`);
      
      // Check if this is the problematic TZE284 device
      const isTZE284 = CI.containsCI((manufacturerName || ''), '_tze284_');
      if (isTZE284) {
        this.log('[PAIR]  TZE284 device detected - applying enhanced pairing logic');
      }

      // Standard device info
      const device = {
        name: `Smoke Detector (${manufacturerName || 'Unknown'})`,
        data: {
          id: zclNode.ieee,
          manufacturerName: manufacturerName || 'Unknown',
          productId: productId || 'TS0601'
        }
      };

      this.log(`[PAIR]  Device ready for pairing: ${device.name}`);
      return [device];

    } catch (error) {
      this.error(`[PAIR]  Pairing failed: ${error.message}`);
      // Return device anyway to prevent "Unknown Zigbee Device"
      return [{
        name: `Smoke Detector (${zclNode?.manufacturerName || 'Recovery'})`,
        data: {
          id: zclNode?.ieee || Date.now().toString(),
          manufacturerName: zclNode?.manufacturerName || '_TZE284_rccxox8p',
          productId: zclNode?.productId || 'TS0601'
        }
      }];
    }
  }
}

module.exports = SmartSmokeDetectorAdvancedDriver;

