'use strict';

const { Driver } = require('homey');

/**
 * v5.5.356: Enhanced IR Blaster Driver with advanced features from SDK research
 * Inspired by Homey SDK documentation and GitHub sources
 */
class IrBlasterDriver extends Driver {

  async onInit() {
    this.log('Enhanced IR Blaster driver initializing...');

    // v5.5.356: Register enhanced flow card actions
    await this._registerEnhancedActions();

    // v5.5.356: Register enhanced flow card triggers
    await this._registerEnhancedTriggers();

    // v5.5.356: Register enhanced flow card conditions
    await this._registerEnhancedConditions();

    this.log('Enhanced IR Blaster flow cards registered successfully');
  }

  /**
   * v5.5.356: Register enhanced actions from SDK research
   */
  async _registerEnhancedActions() {
    // Enhanced learn IR code action
    this.irLearnCodeAction = this.homey.flow.getActionCard('ir_learn_code');
    this.irLearnCodeAction.registerRunListener(async (args, state) => {
      const device = args.device;
      if (!device || !device._enableAdvancedLearnMode) {
        throw new Error('Device not ready or missing enhanced learn method');
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

    // Enhanced send IR code action
    this.irSendCodeAction = this.homey.flow.getActionCard('ir_send_code');
    this.irSendCodeAction.registerRunListener(async (args, state) => {
      const device = args.device;
      if (!device || !device.sendEnhancedIRCode) {
        throw new Error('Device not ready or missing enhanced send method');
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

    // v5.5.360: Re-enabled send by category action
    this.irSendByCategoryAction = this.homey.flow.getActionCard('ir_send_by_category');
    if (this.irSendByCategoryAction) {
      this.irSendByCategoryAction.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device || !device.getCodesByCategory) {
          throw new Error('Device not ready or missing category method');
        }

        const { category, code_name } = args;
        this.log(`Sending IR code "${code_name}" from category "${category}"`);

        const codes = device.getCodesByCategory(category);
        if (!codes[code_name]) {
          throw new Error(`Code "${code_name}" not found in category "${category}"`);
        }

        await device.sendIRCode(codes[code_name]);
        return true;
      });
    }

    // Set protocol action - TEMPORARILY DISABLED due to SDK validation issues
    // Will be re-enabled after proper testing
    /*
    this.irSetProtocolAction = this.homey.flow.getActionCard('ir_set_protocol');
    this.irSetProtocolAction.registerRunListener(async (args, state) => {
      const device = args.device;
      if (!device || !device._setIRProtocol) {
        throw new Error('Device not ready or missing protocol method');
      }

      const { protocol, frequency } = args;
      this.log(`Setting IR protocol to "${protocol}" @ ${frequency}Hz`);

      await device._setIRProtocol(protocol);
      if (frequency) {
        await device._setCarrierFrequency(frequency);
      }

      return true;
    });
    */

    // Analyze code action - TEMPORARILY DISABLED due to SDK validation issues
    // Will be re-enabled after proper testing
    /*
    this.irAnalyzeCodeAction = this.homey.flow.getActionCard('ir_analyze_code');
    this.irAnalyzeCodeAction.registerRunListener(async (args, state) => {
      const device = args.device;
      if (!device || !device._analyzeIRProtocol) {
        throw new Error('Device not ready or missing analysis method');
      }

      const { ir_code } = args;
      this.log(`Analyzing IR code: "${ir_code}"`);

      // Get actual code
      let codeToAnalyze = ir_code;
      if (device._learnedCodes && device._learnedCodes[ir_code]) {
        codeToAnalyze = device._learnedCodes[ir_code];
      }

      const analysis = device._analyzeIRProtocol(codeToAnalyze);
      if (analysis) {
        // Trigger analysis result
        this.codeAnalyzedTrigger?.trigger(device, {
          code_name: ir_code,
          protocol: analysis.protocol,
          frequency: analysis.frequency,
          length: analysis.length
        }, {}).catch(() => { });
      }

      return true;
    });
    */

    this.log('Enhanced actions registered');
  }

  /**
   * v5.5.356: Register enhanced triggers from SDK patterns
   */
  async _registerEnhancedTriggers() {
    // Learning started trigger
    this.learningStartedTrigger = this.homey.flow.getDeviceTriggerCard('ir_learning_started');

    // Learning state changed trigger
    this.learningStateChangedTrigger = this.homey.flow.getDeviceTriggerCard('ir_learning_state_changed');

    // Code learned trigger (legacy compatibility)
    this.codeLearnedTrigger = this.homey.flow.getDeviceTriggerCard('ir_code_learned');

    // Code analyzed trigger
    this.codeAnalyzedTrigger = this.homey.flow.getDeviceTriggerCard('ir_code_analyzed');

    this.log('Enhanced triggers registered');
  }

  /**
   * v5.5.356: Register enhanced conditions from SDK research
   */
  async _registerEnhancedConditions() {
    // IR learning active condition
    this.irLearningActiveCondition = this.homey.flow.getConditionCard('ir_learning_active');
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

    // IR code exists condition
    this.irCodeExistsCondition = this.homey.flow.getConditionCard('ir_code_exists');
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

    // IR protocol detected condition
    this.irProtocolDetectedCondition = this.homey.flow.getConditionCard('ir_protocol_detected');
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

    this.log('Enhanced conditions registered');
  }

  async onPairListDevices() {
    // Devices are discovered by Zigbee
    return [];
  }
}

module.exports = IrBlasterDriver;
