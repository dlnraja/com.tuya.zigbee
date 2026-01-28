'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.565: Enhanced IR Blaster Driver - FIXED flow cards to return gracefully
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 * v5.5.362: Original - used Driver instead of ZigBeeDriver (caused FrankP issue #950)
 * CRITICAL FIX: All getActionCard/getTriggerCard/getConditionCard calls wrapped in try-catch
 * to prevent driver crash when flow cards are missing (diagnostic reports #7cb5ca58 #5dc85d82)
 */
class IrBlasterDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit(); // v5.5.534: SDK3 CRITICAL - must call super first!
    this.log('Enhanced IR Blaster driver v5.5.565 initializing...');

    // v5.5.362: Register flow cards with robust error handling
    try {
      await this._registerEnhancedActions();
    } catch (err) {
      this.error('Failed to register actions (non-fatal):', err.message);
    }

    try {
      await this._registerEnhancedTriggers();
    } catch (err) {
      this.error('Failed to register triggers (non-fatal):', err.message);
    }

    try {
      await this._registerEnhancedConditions();
    } catch (err) {
      this.error('Failed to register conditions (non-fatal):', err.message);
    }

    this.log('IR Blaster driver initialized (some flow cards may be unavailable)');
  }

  /**
   * v5.5.362: Register enhanced actions with individual try-catch for each card
   * CRITICAL FIX: Each getActionCard wrapped to prevent driver crash
   */
  async _registerEnhancedActions() {
    // Enhanced learn IR code action
    try {
      this.irLearnCodeAction = this.homey.flow.getActionCard('ir_blaster_learn_code');
      this.irLearnCodeAction.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device || typeof device._enableAdvancedLearnMode !== 'function') {
          this.log('[FLOW] Action: Device not ready or missing enhanced learn method');
          return false;
        }

        const { code_name, duration, protocol, frequency, category } = args;
        this.log(`Enhanced IR learning: "${code_name}" - ${protocol}@${frequency}Hz for ${duration}s`);

        await device._enableAdvancedLearnMode(duration || 30, {
          protocol: protocol || 'auto',
          frequency: frequency || 38000,
          codeName: code_name,
          category: category || 'uncategorized'
        });

        return true;
      });
      this.log('✅ ir_blaster_learn_code registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_learn_code not available:', err.message);
    }

    // Enhanced send IR code action
    try {
      this.irSendCodeAction = this.homey.flow.getActionCard('ir_blaster_send_code');
      this.irSendCodeAction.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device || typeof device.sendEnhancedIRCode !== 'function') {
          this.log('[FLOW] Action: Device not ready or missing enhanced send method');
          return false;
        }

        const { ir_code, protocol, frequency, repeat } = args;
        this.log(`Enhanced IR send: "${ir_code}" with options`);

        await device.sendEnhancedIRCode(ir_code, {
          protocol: protocol || null,
          frequency: frequency || null,
          repeat: repeat || 1
        });

        return true;
      });
      this.log('✅ ir_blaster_send_code registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_send_code not available:', err.message);
    }

    // v5.5.362: Send by category action with proper error handling
    try {
      this.irSendByCategoryAction = this.homey.flow.getActionCard('ir_blaster_send_by_category');
      this.irSendByCategoryAction.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device || typeof device.getCodesByCategory !== 'function') {
          this.log('[FLOW] Action: Device not ready or missing category method');
          return false;
        }

        const { category, code_name } = args;
        this.log(`Sending IR code "${code_name}" from category "${category}"`);

        const codes = device.getCodesByCategory(category);
        if (!codes || !codes[code_name]) {
          this.log(`[FLOW] Code "${code_name}" not found in category "${category}"`);
          return false;
        }

        await device.sendIRCode(codes[code_name]);
        return true;
      });
      this.log('✅ ir_blaster_send_by_category registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_send_by_category not available:', err.message);
    }

    // v5.5.606: AC command action (SmartIR compatible)
    try {
      this.irSendACAction = this.homey.flow.getActionCard('ir_blaster_send_ac_command');
      this.irSendACAction.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device || typeof device.sendACCommand !== 'function') {
          return false;
        }
        const { mode, temperature, fan_speed } = args;
        return await device.sendACCommand(mode, temperature, fan_speed);
      });
      this.log('✅ ir_blaster_send_ac_command registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_send_ac_command not available:', err.message);
    }

    this.log('Action registration complete');
  }

  /**
   * v5.5.362: Register enhanced triggers with individual try-catch
   */
  async _registerEnhancedTriggers() {
    // Learning started trigger
    try {
      this.learningStartedTrigger = this.homey.flow.getDeviceTriggerCard('ir_blaster_learning_started');
      this.log('✅ ir_blaster_learning_started trigger registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_learning_started not available:', err.message);
    }

    // Learning state changed trigger
    try {
      this.learningStateChangedTrigger = this.homey.flow.getDeviceTriggerCard('ir_blaster_learning_state_changed');
      this.log('✅ ir_blaster_learning_state_changed trigger registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_learning_state_changed not available:', err.message);
    }

    // Code learned trigger (legacy compatibility)
    try {
      this.codeLearnedTrigger = this.homey.flow.getDeviceTriggerCard('ir_blaster_code_learned');
      this.log('✅ ir_blaster_code_learned trigger registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_code_learned not available:', err.message);
    }

    // Code analyzed trigger
    try {
      this.codeAnalyzedTrigger = this.homey.flow.getDeviceTriggerCard('ir_blaster_code_analyzed');
      this.log('✅ ir_blaster_code_analyzed trigger registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_code_analyzed not available:', err.message);
    }

    this.log('Trigger registration complete');
  }

  /**
   * v5.5.362: Register enhanced conditions with individual try-catch
   */
  async _registerEnhancedConditions() {
    // IR learning active condition
    try {
      this.irLearningActiveCondition = this.homey.flow.getConditionCard('ir_blaster_learning_active');
      this.irLearningActiveCondition.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device || device._learningState === undefined) {
          return false;
        }

        // Check if learning state is LEARNING (1)
        const isLearning = device._learningState === 1;
        this.log(`IR learning active check: ${isLearning}`);
        return isLearning;
      });
      this.log('✅ ir_blaster_learning_active condition registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_learning_active not available:', err.message);
    }

    // IR code exists condition
    try {
      this.irCodeExistsCondition = this.homey.flow.getConditionCard('ir_blaster_code_exists');
      this.irCodeExistsCondition.registerRunListener(async (args, state) => {
        const device = args.device;
        const { code_name } = args;

        if (!device || !device._learnedCodes) {
          return false;
        }

        const exists = !!device._learnedCodes[code_name];
        this.log(`IR code "${code_name}" exists: ${exists}`);
        return exists;
      });
      this.log('✅ ir_blaster_code_exists condition registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_code_exists not available:', err.message);
    }

    // IR protocol detected condition
    try {
      this.irProtocolDetectedCondition = this.homey.flow.getConditionCard('ir_blaster_protocol_detected');
      this.irProtocolDetectedCondition.registerRunListener(async (args, state) => {
        const device = args.device;
        const { code_name, protocol } = args;

        if (!device || !device._learnedCodes || !device._protocolAnalysis) {
          return false;
        }

        const code = device._learnedCodes[code_name];
        if (!code) return false;

        const analysis = device._protocolAnalysis[code];
        if (!analysis) return false;

        const matches = analysis.protocol === protocol;
        this.log(`Protocol "${protocol}" detected for "${code_name}": ${matches}`);
        return matches;
      });
      this.log('✅ ir_blaster_protocol_detected condition registered');
    } catch (err) {
      this.log('⚠️ ir_blaster_protocol_detected not available:', err.message);
    }

    this.log('Condition registration complete');
  }

  async onPairListDevices() {
    // Devices are discovered by Zigbee
    return [];
  }
}

module.exports = IrBlasterDriver;

