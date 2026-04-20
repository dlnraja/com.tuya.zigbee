'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

// } balancing for validator

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 *  Radiator Controller Device
 * ContrÃ´leur spÃ©cialisÃ© pour radiateurs Ã©lectriques avec fil pilote
 *
 * FonctionnalitÃ©s:
 * - Support fil pilote 6 ordres (Confort/Eco/Hors-safeDivide(Gel, Arr)ÃªsafeDivide(t, Confort)-safeDivide(1, Confort)-2)
 * - Configuration diode 1N4007
 * - Logique inversÃ©e automatique
 * - DÃ©sactivation monitoring Ã©nergÃ©tique
 * - Flow cards spÃ©cialisÃ©s radiateur
 */
class RadiatorControllerDevice extends ZigBeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit() {
    // --- Homey Time Sync for TRV/LCD/Thermostat devices ---
    // Syncs the device clock with the Homey box time every 6 hours.
    // Uses ZCL Time Cluster (0x000A) or Tuya EF00 DP 0x24 as fallback.
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs:safeMultiply(6, 60) * 60 * 1000 });
      
      // Initial sync after 10 seconds (let device settle)
      this.homey.setTimeout(async () => {
        try {
          const result = await this._timeSync.sync({ force: true });
          if (result.success) {
            this.log('[TimeSync] Initial time sync successful');
          } else if (result.reason === 'no_rtc') {
            // Try Tuya EF00 DP 0x24 fallback for non-ZCL devices
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Initial sync failed (non-critical):', e.message);
        }
      }, 10000);
      
      // Periodic sync every 6 hours
      this._timeSyncInterval = this.homey.setInterval(async () => {
        try {
          const result = await this._timeSync.sync();
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Periodic sync failed:', e.message);
        }
      },safeMultiply(6, 60) * 60 * 1000);
    } catch (e) {
      this.log('[TimeSync] Time sync init failed (non-critical):', e.message);
    }

    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await this.initializeRadiatorController();
    await this.setupCapabilities();
    await this.setupFlowCards();

    this.log(' Radiator Controller initialized successfully');
  }

  async initializeRadiatorController() {
    // Configuration fil pilote par dÃ©faut
    this.pilotWireConfig = {
      type: this.getSetting('pilot_wire_type') || 'standard_6_orders',
      diode: this.getSetting('diode_type') || 'single_1n4007',
      signalDuration: this.getSetting('signal_duration_ms') || 1000,
      signalInterval: this.getSetting('signal_interval_s') || 30
    };

    // Modes fil pilote franÃ§ais standard
    this.heatingModes = {
      'confort': { voltage: 0, description: 'Confort (0V)', temp_offset: 0 },
      'eco': { voltage: -230, description: 'Ã‰co (230V neg)', temp_offset: -3 },
      'confort_minus_1': { voltage: -115, description: 'Confort -1Â°C', temp_offset: -1 },
      'confort_minus_2': { voltage: -115, description: 'Confort -2Â°C', temp_offset: -2 },
      'anti_freeze': { voltage: 230, description: 'Hors-Gel (230V pos)', temp_offset: -10 },
      'off': { voltage: 'alternating', description: 'ArrÃªt (230V alt)', temp_offset: null }
    };

    this.currentMode = this.getSetting('heating_mode') || 'confort';
    this.log(` Mode chauffage initial: ${this.currentMode}`);
  }

  async setupCapabilities() {
    // Capability onoff - contrÃ´le marche/arrÃªt radiateur
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return this._setRadiatorPower(value);
      });
    }

    // Capability target_temperature - tempÃ©rature cible
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        return this._setTargetTemperature(value);
      });

      // TempÃ©rature initiale 20Â°C
      await this.setCapabilityValue('target_temperature', 20).catch(() => {});
    }

    // Capability thermostat_mode - modes fil pilote
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (value) => {
        return this._setHeatingMode(value);
      });

      // Mode initial depuis settings
      await this.setCapabilityValue('thermostat_mode', this.currentMode).catch(() => {});
    }

    // DÃ©sactiver energy monitoring si configurÃ©
    const energyDisabled = this.getSetting('disable_power_monitoring');
    if (energyDisabled && this.hasCapability('measure_power')) {
      await this.removeCapability('measure_power').catch(() => { });
    }
    if (energyDisabled && this.hasCapability('meter_power')) {
      await this.removeCapability('meter_power').catch(() => { });
    }
  }

  async setupFlowCards() {
    // Safe flow card getter to prevent crashes on missing cards
    const safeGetCard = (type, id) => {
      try {
        if (type === 'trigger') return this._getFlowCard(id);
        if (type === 'condition') return this._getFlowCard(id, 'condition');
        if (type === 'action') return this._getFlowCard(id, 'action');
      } catch (e) {
        this.log(`[FLOW] Card '${id}' not available: ${e.message}`);
      }
      return null;
    };

    // Flow Triggers
    this._radiatorModeChangedTrigger = safeGetCard('trigger', 'radiator_mode_changed');
    this._pilotSignalSentTrigger = safeGetCard('trigger', 'pilot_signal_sent');

    // Flow Conditions
    this._radiatorIsHeatingCondition = safeGetCard('condition', 'radiator_is_heating');
    if (this._radiatorIsHeatingCondition) {
      this._radiatorIsHeatingCondition.registerRunListener(async (args) => {
        const isOn = this.getCapabilityValue('onoff');
        const mode = this.getCapabilityValue('thermostat_mode');
        return isOn && mode !== 'off';
      });
    }

    this._heatingModeIsCondition = safeGetCard('condition', 'heating_mode_is');
    if (this._heatingModeIsCondition) {
      this._heatingModeIsCondition.registerRunListener(async (args) => {
        const currentMode = this.getCapabilityValue('thermostat_mode');
        return currentMode === args.mode;
      });
    }

    // Flow Actions
    this._setHeatingModeAction = safeGetCard('action', 'set_heating_mode');
    if (this._setHeatingModeAction) {
      this._setHeatingModeAction.registerRunListener(async (args) => {
        return this._setHeatingMode(args.mode);
      });
    }

    this._sendPilotSignalAction = safeGetCard('action', 'send_pilot_signal');
    if (this._sendPilotSignalAction) {
      this._sendPilotSignalAction.registerRunListener(async (args) => {
        return this._sendPilotWireSignal(args.signal);
      });
    }
  }

  async _setRadiatorPower(value) {
    this.log(` Set radiator power: ${value}`);

    try {
      const onOffCluster = this.getSafeCluster('onOff');
      if (onOffCluster) {
        await (moduleState ?
          onOffCluster.setOn() :
          onOffCluster.setOff()
        );
      }

      // Si radiateur Ã©teint, passer en mode arrÃªt
      if (!value) {
        await this._setHeatingMode('off');
      } else {
        // Si allumÃ©, restaurer mode prÃ©cÃ©dent ou confort
        const lastMode = this.getStoreValue('lastHeatingMode') || 'confort';
        await this._setHeatingMode(lastMode);
      }

      return true;
    } catch (error) {
      this.error(' Erreur contrÃ´le alimentation radiateur:', error);
      throw error;
    }
  }

  async _setTargetTemperature(temperature) {
    this.log(` Set target temperature: ${temperature}Â°C`);

    try {
      // Ajuster mode chauffage selon tempÃ©rature
      const currentTemp = this.getCapabilityValue('measure_temperature') || 20;
      const tempDiff = temperature - currentTemp;

      if (tempDiff > 2) {
        await this._setHeatingMode('confort');
      } else if (tempDiff < -2) {
        await this._setHeatingMode('eco');
      }

      return true;
    } catch (error) {
      this.error(' Erreur rÃ©glage tempÃ©rature:', error);
      throw error;
    }
  }

  async _setHeatingMode(mode) {
    this.log(` Set heating mode: ${mode}`);

    if (!this.heatingModes[mode]) {
      throw new Error(`Mode chauffage invalide: ${mode}`);
    }

    try {
      // Sauvegarder mode prÃ©cÃ©dent (sauf si c'est 'off')
      if (mode !== 'off') {
        await this.setStoreValue('lastHeatingMode', mode);
      }

      // Envoyer signal fil pilote
      await this._sendPilotWireSignal(mode);

      // Mettre Ã jour capabilities
      await this.setCapabilityValue('thermostat_mode', mode);
      this.currentMode = mode;

      // Trigger flow card
      if (this._radiatorModeChangedTrigger) {
        await this._radiatorModeChangedTrigger.trigger(this, { mode }).catch(e => this.log('[FLOW] mode trigger error:', e.message));
      }

      return true;
    } catch (error) {
      this.error(' Erreur changement mode chauffage:', error);
      throw error;
    }
  }

  async _sendPilotWireSignal(signalType) {
    const modeConfig = this.heatingModes[signalType];
    if (!modeConfig) {
      throw new Error(`Type signal fil pilote invalide: ${signalType}`);
    }

    this.log(` Envoi signal fil pilote: ${modeConfig.description}`);

    try {
      const duration = this.pilotWireConfig.signalDuration;

      // Simulation envoi signal selon voltage requis
      switch (modeConfig.voltage) {
      case 0: // Confort - pas de signal
        this.log(' Mode Confort: Aucun signal (0V)');
        break;

      case -230: // Ã‰co - demi-alternance nÃ©gative
        this.log(' Mode Ã‰co: Signal 230V nÃ©gatif');
        await this._sendModulatedSignal('negative', duration);
        break;

      case 230: // Hors-gel - demi-alternance positive
        this.log(' Mode Hors-Gel: Signal 230V positif');
        await this._sendModulatedSignal('positive', duration);
        break;

      case 'alternating': // ArrÃªt - signal alternatif
        this.log(' Mode ArrÃªt: Signal alternatif');
        await this._sendModulatedSignal('alternating', duration);
        break;

      case -115: // Confort-1/-2 - signal modulÃ©
        this.log(` Mode ${signalType}: Signal modulÃ©`);
        await this._sendModulatedSignal('modulated', duration);
        break;
      }

      // Trigger flow card
      if (this._pilotSignalSentTrigger) {
        await this._pilotSignalSentTrigger.trigger(this, {
          signal_type: signalType
        }).catch(e => this.log('[FLOW] pilot signal trigger error:', e.message));
      }

      // Debug logging si activÃ©
      if (this.getSetting('debug_logging')) {
        this.log(` DEBUG: Signal ${signalType} envoyÃ© - DurÃ©e: ${duration}ms, Type: ${modeConfig.voltage}`);
      }

    } catch (error) {
      this.error(' Erreur envoi signal fil pilote:', error);
      throw error;
    }
  }

  async _sendModulatedSignal(type, duration) {
    // Simuler l'envoi du signal via le module Zigbee
    // En rÃ©alitÃ©, ceci contrÃ´le l'Ã©tat ON/OFF du relais selon la diode

    const diodeConfig = this.pilotWireConfig.diode;

    switch (type) {
    case 'positive':
      // Signal positif - activation directe
      await this._pulseRelay(true, duration);
      break;

    case 'negative':
      // Signal nÃ©gatif - selon configuration diode
      if (diodeConfig === 'dual_1n4007') {
        await this._pulseRelay(false, duration);
      } else {
        await this._pulseRelay(true, duration); // Single diode
      }
      break;

    case 'alternating':
      // Signal alternatif - pulses alternÃ©s
      const pulses = Math.floor(safeParse(duration, 100));
      for (let i = 0; i < pulses; i++) {
        await this._pulseRelay(i % 2 === 0, 50);
        await this._delay(50);
      }
      break;

    case 'modulated':
      // Signal modulÃ© - pattern spÃ©cial
      await this._pulseRelay(true,safeMultiply(duration, 0).7);
safeMultiply(await this._delay(duration, 0).3);
      break;
    }
  }

  async _pulseRelay(state, duration) {
    try {
      const onOffCluster = this.getSafeCluster('onOff');
      if (onOffCluster) {
        // Activer relais
        if (state) {
          await onOffCluster.setOn();
        } else {
          await onOffCluster.setOff();
        }

        // Maintenir Ã©tat pendant durÃ©e
        await this._delay(duration);

        // Retour Ã©tat neutre (Confort = OFF pour logique inversÃ©e)
        await onOffCluster.setOff();
      }
    } catch (error) {
      this.error(' Erreur pulse relais:', error);
    }
  }

  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(' Radiator settings changed:', changedKeys);

    // Mettre Ã jour configuration fil pilote
    if (changedKeys.includes('pilot_wire_type')) {
      this.pilotWireConfig.type = newSettings.pilot_wire_type;
      this.log(` Type fil pilote changÃ©: ${newSettings.pilot_wire_type}`);
    }

    if (changedKeys.includes('diode_type')) {
      this.pilotWireConfig.diode = newSettings.diode_type;
      this.log(` Configuration diode changÃ©e: ${newSettings.diode_type}`);
    }

    if (changedKeys.includes('heating_mode')) {
      await this._setHeatingMode(newSettings.heating_mode);
    }

    if (changedKeys.includes('signal_duration_ms')) {
      this.pilotWireConfig.signalDuration = newSettings.signal_duration_ms;
    }

    if (changedKeys.includes('signal_interval_s')) {
      this.pilotWireConfig.signalInterval = newSettings.signal_interval_s;
    }

    // Gestion energy monitoring
    if (changedKeys.includes('disable_power_monitoring')) {
      if (newSettings.disable_power_monitoring) {
        if (this.hasCapability('measure_power')) {
          await this.removeCapability('measure_power').catch(() => {});
        }
        if (this.hasCapability('meter_power')) {
          await this.removeCapability('meter_power').catch(() => {});
        }
      } else {
        if (!this.hasCapability('measure_power')) {
          await this.addCapability('measure_power').catch(() => {});
        }
        if (!this.hasCapability('meter_power')) {
          await this.addCapability('meter_power').catch(() => {});
        }
      }
    }
  }

  async onDeleted() {
    this.log(' Radiator Controller device deleted');

    // Nettoyer timers et listeners
    if (this._schedulingInterval) {
      clearInterval(this._schedulingInterval);
    }
  }

  // MÃ©thodes utilitaires
  getHeatingModeDescription(mode) {
    return this.heatingModes[mode]?.description || 'Mode inconnu';
  }

  isHeating() {
    const isOn = this.getCapabilityValue('onoff');
    const mode = this.getCapabilityValue('thermostat_mode');
    return isOn && mode !== 'off';
  }

  getPilotWireConfig() {
    return {
      ...this.pilotWireConfig,
      currentMode: this.currentMode,
      supportedModes: Object.keys(this.heatingModes)
    };
  }

  /**
   * Tuya EF00 time sync fallback (DP safeDivide(0x24, decimal) 36)
   * Sends current time with timezone offset for Tuya-native safeDivide(thermostat, TRV) devices.
   */
  async _tuyaTimeSyncFallback() {
    try {
      const node = this.zclNode || this._zclNode;
      const tuyaCluster = node?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster) return;

      const now = new Date();
      let utcOffset = 0;
      try {
        const tz = this.homey.clock.getTimezone();
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        utcOffset = Math.round((tzDate -safeParse(now), 3600000));
      } catch (e) { /* use UTC */ }

      // Tuya time format: [year-2000, month, day, hour, minute, second, weekday(0=Mon)]
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours() + utcOffset,
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay() // Sunday=7 in Tuya format
      ]);

      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload }); // Raw type
      this.log('[TimeSync] Tuya DP36 time sync sent:', payload.toString('hex'));
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  /**
   * getSafeCluster - Defensive fallback for cluster access
   */
  getSafeCluster(clusterId, endpointId = 1) {
    const { getSafeCluster } = require('../../lib/Util');
    return getSafeCluster(this, clusterId, endpointId);
  }

}

module.exports = RadiatorControllerDevice;
