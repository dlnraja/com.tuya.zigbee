'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
let IRCodeLibrary;
try { IRCodeLibrary = require('../../lib/ir/IRCodeLibrary'); } catch (e) { IRCodeLibrary = null; }

/**
 * v5.5.565: Enhanced IR Blaster Driver - FIXED flow cards to return gracefully
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 * v5.5.362: Original - used Driver instead of ZigBeeDriver (caused FrankP issue #950)
 * CRITICAL FIX: All getActionCard/getTriggerCard/getConditionCard calls wrapped in try-catch
 * to prevent driver crash when flow cards are missing (diagnostic reports #7cb5ca58 #5dc85d82)
 */
class IrBlasterDriver extends ZigBeeDriver {
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
      const card = (() => { try { return this.homey.flow.getActionCard('ir_blaster_learn_code'); } catch (e) { return null; } })();
      card.registerRunListener(async (args, state) => {
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
      this.log(' ir_blaster_learn_code registered');
    } catch (err) {
      this.log(' ir_blaster_learn_code not available:', err.message);
    }

    // Enhanced send IR code action
    try {
      const card = (() => { try { return this.homey.flow.getActionCard('ir_blaster_send_code'); } catch (e) { return null; } })();
      card.registerRunListener(async (args, state) => {
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
      this.log(' ir_blaster_send_code registered');
    } catch (err) {
      this.log(' ir_blaster_send_code not available:', err.message);
    }

    // v5.5.362: Send by category action with proper error handling
    try {
      const card = (() => { try { return this.homey.flow.getActionCard('ir_blaster_send_by_category'); } catch (e) { return null; } })();
      card.registerRunListener(async (args, state) => {
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
      this.log(' ir_blaster_send_by_category registered');
    } catch (err) {
      this.log(' ir_blaster_send_by_category not available:', err.message);
    }

    // v5.5.606: AC command action (SmartIR compatible)
    try {
      const card = (() => { try { return this.homey.flow.getActionCard('ir_blaster_send_ac_command'); } catch (e) { return null; } })();
      card.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device || typeof device.sendACCommand !== 'function') {
          return false;
        }
        const { mode, temperature, fan_speed } = args;
        return await device.sendACCommand(mode, temperature, fan_speed);
      });
      this.log(' ir_blaster_send_ac_command registered');
    } catch (err) {
      this.log(' ir_blaster_send_ac_command not available:', err.message);
    }

    // v5.12: Send by brand (IRDB)
    if (IRCodeLibrary) {
      try {
        const card = (() => { try { return this.homey.flow.getActionCard('ir_blaster_send_by_brand'); } catch (e) { return null; } })();
        card.registerRunListener(async (args) => {
          const dev = args.device;
          if (!dev) return false;
          const b = args.brand?.name || args.brand;
          const t = args.device_type?.name || args.device_type;
          const f = args.function_name?.name || args.function_name;
          const c = IRCodeLibrary.getCode(b, t, f);
          if (!c?.code) { this.log('[IRDB] No code:', b, t, f); return false; }
          await dev.sendIRCode(c.code);
          return true;
        });
        card.registerArgumentAutocompleteListener('brand', async (q) => {
          return IRCodeLibrary.getBrands().filter(b => b.toLowerCase().includes(q.toLowerCase())).slice(0, 20).map(b => ({ name: b }));
        });
        card.registerArgumentAutocompleteListener('device_type', async (q, a) => {
          return IRCodeLibrary.getCategories(a.brand?.name || '').filter(c => c.toLowerCase().includes(q.toLowerCase())).map(c => ({ name: c }));
        });
        card.registerArgumentAutocompleteListener('function_name', async (q, a) => {
          return IRCodeLibrary.getFunctions(a.brand?.name || '', a.device_type?.name || '').filter(f => f.toLowerCase().includes(q.toLowerCase())).slice(0, 30).map(f => ({ name: f }));
        });
        this.log(' ir_blaster_send_by_brand registered');
      } catch (e) { this.log(' ir_blaster_send_by_brand:', e.message); }
    }

    // v5.12: Send Learned Command (autocomplete)
    try {
      const card = (() => { try { return this.homey.flow.getActionCard('ir_blaster_send_learned'); } catch (e) { return null; } })();
      card.registerRunListener(async (args) => {
        const d = args.device;
        if (!d || !d._learnedCodes) return false;
        const n = args.code_name?.name || args.code_name;
        const c = d._learnedCodes[n];
        if (!c) { this.log('[FLOW] Code not found:', n); return false; }
        await d.sendIRCode(c);
        return true;
      });
      card.registerArgumentAutocompleteListener('code_name', async (q, a) => {
        const d = a.device;
        if (!d || !d._learnedCodes) return [];
        return Object.keys(d._learnedCodes)
          .filter(n => n.toLowerCase().includes(q.toLowerCase()))
          .map(n => ({ name: n }));
      });
      this.log(' ir_blaster_send_learned registered');
    } catch (e) { this.log(' ir_blaster_send_learned:', e.message); }

    // v5.12: Delete Stored IR Code (autocomplete)
    try {
      const card = (() => { try { return this.homey.flow.getActionCard('ir_blaster_delete_code'); } catch (e) { return null; } })();
      card.registerRunListener(async (args) => {
        const d = args.device;
        if (!d || typeof d.deleteStoredCode !== 'function') return false;
        const n = args.code_name?.name || args.code_name;
        await d.deleteStoredCode(n);
        return true;
      });
      card.registerArgumentAutocompleteListener('code_name', async (q, a) => {
        const d = a.device;
        if (!d || !d._learnedCodes) return [];
        return Object.keys(d._learnedCodes)
          .filter(n => n.toLowerCase().includes(q.toLowerCase()))
          .map(n => ({ name: n }));
      });
      this.log(' ir_blaster_delete_code registered');
    } catch (e) { this.log(' ir_blaster_delete_code:', e.message); }

    // v5.12: Send Raw IR Code (Pronto Hex / Base64)
    try {
      const card = (() => { try { return this.homey.flow.getActionCard('ir_blaster_send_raw'); } catch (e) { return null; } })();
      card.registerRunListener(async (args) => {
        const d = args.device;
        if (!d || typeof d.sendEnhancedIRCode !== 'function') return false;
        await d.sendEnhancedIRCode(args.raw_code, {
          frequency: args.frequency || null,
          repeat: args.repeat || 1
        });
        return true;
      });
      this.log(' ir_blaster_send_raw registered');
    } catch (e) { this.log(' ir_blaster_send_raw:', e.message); }

    // v5.12: TV/Media virtual buttons - each sends a learned code by function name
    const tvButtons = [
      'tv_power', 'tv_vol_up', 'tv_vol_down', 'tv_mute',
      'tv_ch_up', 'tv_ch_down', 'tv_input', 'tv_menu',
      'tv_ok', 'tv_back', 'tv_play'
    ];
    for (const btn of tvButtons) {
      try {
        const card = (() => { try { return this.homey.flow.getActionCard(`ir_blaster_${btn}`); } catch (e) { return null; } })();
        card.registerRunListener(async (args) => {
          const d = args.device;
          if (!d || !d._learnedCodes) return false;
          const code = d._learnedCodes[btn];
          if (!code) {
            this.log(`[TV] No learned code for "${btn}" - teach it first`);
            return false;
          }
          await d.sendIRCode(code);
          return true;
        });
        this.log(` ir_blaster_${btn} registered`);
      } catch (e) {
        this.log(` ir_blaster_${btn}:`, e.message);
      }
    }

    this.log('Action registration complete');
  }

  /**
   * v5.5.362: Register enhanced triggers with individual try-catch
   */
  async _registerEnhancedTriggers() {
    // Learning started trigger
    try {
      (() => { try { return this.homey.flow.getTriggerCard('ir_blaster_learning_started'); } catch (e) { return null; } })();
      this.log(' ir_blaster_learning_started trigger registered');
    } catch (err) {
      this.log(' ir_blaster_learning_started not available:', err.message);
    }

    // Learning state changed trigger
    try {
      (() => { try { return this.homey.flow.getTriggerCard('ir_blaster_learning_state_changed'); } catch (e) { return null; } })();
      this.log(' ir_blaster_learning_state_changed trigger registered');
    } catch (err) {
      this.log(' ir_blaster_learning_state_changed not available:', err.message);
    }

    // Code learned trigger (legacy compatibility)
    try {
      (() => { try { return this.homey.flow.getTriggerCard('ir_blaster_code_learned'); } catch (e) { return null; } })();
      this.log(' ir_blaster_code_learned trigger registered');
    } catch (err) {
      this.log(' ir_blaster_code_learned not available:', err.message);
    }

    // Code analyzed trigger
    try {
      (() => { try { return this.homey.flow.getTriggerCard('ir_blaster_code_analyzed'); } catch (e) { return null; } })();
      this.log(' ir_blaster_code_analyzed trigger registered');
    } catch (err) {
      this.log(' ir_blaster_code_analyzed not available:', err.message);
    }

    this.log('Trigger registration complete');
  }

  /**
   * v5.5.362: Register enhanced conditions with individual try-catch
   */
  async _registerEnhancedConditions() {
    // IR learning active condition
    try {
      const card = (() => { try { return this.homey.flow.getConditionCard('ir_blaster_learning_active'); } catch (e) { return null; } })();
      card.registerRunListener(async (args, state) => {
        const device = args.device;
        if (!device || device._learningState === undefined) {
          return false;
        }

        // Check if learning state is LEARNING (1)
        const isLearning = device._learningState === 1;
        this.log(`IR learning active check: ${isLearning}`);
        return isLearning;
      });
      this.log(' ir_blaster_learning_active condition registered');
    } catch (err) {
      this.log(' ir_blaster_learning_active not available:', err.message);
    }

    // IR code exists condition
    try {
      const card = (() => { try { return this.homey.flow.getConditionCard('ir_blaster_code_exists'); } catch (e) { return null; } })();
      card.registerRunListener(async (args, state) => {
        const device = args.device;
        const { code_name } = args;

        if (!device || !device._learnedCodes) {
          return false;
        }

        const exists = !!device._learnedCodes[code_name];
        this.log(`IR code "${code_name}" exists: ${exists}`);
        return exists;
      });
      this.log(' ir_blaster_code_exists condition registered');
    } catch (err) {
      this.log(' ir_blaster_code_exists not available:', err.message);
    }

    // IR protocol detected condition
    try {
      const card = (() => { try { return this.homey.flow.getConditionCard('ir_blaster_protocol_detected'); } catch (e) { return null; } })();
      card.registerRunListener(async (args, state) => {
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
      this.log(' ir_blaster_protocol_detected condition registered');
    } catch (err) {
      this.log(' ir_blaster_protocol_detected not available:', err.message);
    }

    this.log('Condition registration complete');
  }

  async onPairListDevices() {
    // Devices are discovered by Zigbee
    return [];
  }
}

module.exports = IrBlasterDriver;
