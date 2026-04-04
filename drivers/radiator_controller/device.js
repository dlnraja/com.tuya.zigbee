'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * 🔥 Radiator Controller Device
 * Contrôleur spécialisé pour radiateurs électriques avec fil pilote
 *
 * Fonctionnalités:
 * - Support fil pilote 6 ordres (Confort/Eco/Hors-Gel/Arrêt/Confort-1/Confort-2)
 * - Configuration diode 1N4007
 * - Logique inversée automatique
 * - Désactivation monitoring énergétique
 * - Flow cards spécialisés radiateur
 */
class RadiatorControllerDevice extends ZigBeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit() {
    await this.initializeRadiatorController();
    await this.setupCapabilities();
    await this.setupFlowCards();

    this.log('🔥 Radiator Controller initialized successfully');
  }

  async initializeRadiatorController() {
    // Configuration fil pilote par défaut
    this.pilotWireConfig = {
      type: this.getSetting('pilot_wire_type') || 'standard_6_orders',
      diode: this.getSetting('diode_type') || 'single_1n4007',
      signalDuration: this.getSetting('signal_duration_ms') || 1000,
      signalInterval: this.getSetting('signal_interval_s') || 30
    };

    // Modes fil pilote français standard
    this.heatingModes = {
      'confort': { voltage: 0, description: 'Confort (0V)', temp_offset: 0 },
      'eco': { voltage: -230, description: 'Éco (230V neg)', temp_offset: -3 },
      'confort_minus_1': { voltage: -115, description: 'Confort -1°C', temp_offset: -1 },
      'confort_minus_2': { voltage: -115, description: 'Confort -2°C', temp_offset: -2 },
      'anti_freeze': { voltage: 230, description: 'Hors-Gel (230V pos)', temp_offset: -10 },
      'off': { voltage: 'alternating', description: 'Arrêt (230V alt)', temp_offset: null }
    };

    this.currentMode = this.getSetting('heating_mode') || 'confort';
    this.log(`🏠 Mode chauffage initial: ${this.currentMode}`);
  }

  async setupCapabilities() {
    // Capability onoff - contrôle marche/arrêt radiateur
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return this._setRadiatorPower(value);
      });
    }

    // Capability target_temperature - température cible
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        return this._setTargetTemperature(value);
      });

      // Température initiale 20°C
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

    // Désactiver energy monitoring si configuré
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
        if (type === 'trigger') return this.homey.flow.getDeviceTriggerCard(id);
        if (type === 'condition') return this.homey.flow.getDeviceConditionCard(id);
        if (type === 'action') return this.homey.flow.getActionCard(id);
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
    this.log(`🔥 Set radiator power: ${value}`);

    try {
      // Logique inversée pour radiateurs fil pilote
      // ON = Arrêt signal, OFF = Signal actif
      const moduleState = !value; // Inversion automatique

      if (this.zclNode?.endpoints?.[1]?.clusters?.onOff) {
        await (moduleState ?
          this.zclNode.endpoints[1].clusters.onOff.setOn() :
          this.zclNode.endpoints[1].clusters.onOff.setOff()
        );
      }

      // Si radiateur éteint, passer en mode arrêt
      if (!value) {
        await this._setHeatingMode('off');
      } else {
        // Si allumé, restaurer mode précédent ou confort
        const lastMode = this.getStoreValue('lastHeatingMode') || 'confort';
        await this._setHeatingMode(lastMode);
      }

      return true;
    } catch (error) {
      this.error('🚨 Erreur contrôle alimentation radiateur:', error);
      throw error;
    }
  }

  async _setTargetTemperature(temperature) {
    this.log(`🌡️ Set target temperature: ${temperature}°C`);

    try {
      // Ajuster mode chauffage selon température
      const currentTemp = this.getCapabilityValue('measure_temperature') || 20;
      const tempDiff = temperature - currentTemp;

      if (tempDiff > 2) {
        await this._setHeatingMode('confort');
      } else if (tempDiff < -2) {
        await this._setHeatingMode('eco');
      }

      return true;
    } catch (error) {
      this.error('🚨 Erreur réglage température:', error);
      throw error;
    }
  }

  async _setHeatingMode(mode) {
    this.log(`🏠 Set heating mode: ${mode}`);

    if (!this.heatingModes[mode]) {
      throw new Error(`Mode chauffage invalide: ${mode}`);
    }

    try {
      // Sauvegarder mode précédent (sauf si c'est 'off')
      if (mode !== 'off') {
        await this.setStoreValue('lastHeatingMode', mode);
      }

      // Envoyer signal fil pilote
      await this._sendPilotWireSignal(mode);

      // Mettre à jour capabilities
      await this.setCapabilityValue('thermostat_mode', mode);
      this.currentMode = mode;

      // Trigger flow card
      if (this._radiatorModeChangedTrigger) {
        await this._radiatorModeChangedTrigger.trigger(this, { mode }).catch(e => this.log('[FLOW] mode trigger error:', e.message));
      }

      return true;
    } catch (error) {
      this.error('🚨 Erreur changement mode chauffage:', error);
      throw error;
    }
  }

  async _sendPilotWireSignal(signalType) {
    const modeConfig = this.heatingModes[signalType];
    if (!modeConfig) {
      throw new Error(`Type signal fil pilote invalide: ${signalType}`);
    }

    this.log(`📡 Envoi signal fil pilote: ${modeConfig.description}`);

    try {
      const duration = this.pilotWireConfig.signalDuration;

      // Simulation envoi signal selon voltage requis
      switch (modeConfig.voltage) {
      case 0: // Confort - pas de signal
        this.log('🏠 Mode Confort: Aucun signal (0V)');
        break;

      case -230: // Éco - demi-alternance négative
        this.log('🌱 Mode Éco: Signal 230V négatif');
        await this._sendModulatedSignal('negative', duration);
        break;

      case 230: // Hors-gel - demi-alternance positive
        this.log('🧊 Mode Hors-Gel: Signal 230V positif');
        await this._sendModulatedSignal('positive', duration);
        break;

      case 'alternating': // Arrêt - signal alternatif
        this.log('⛔ Mode Arrêt: Signal alternatif');
        await this._sendModulatedSignal('alternating', duration);
        break;

      case -115: // Confort-1/-2 - signal modulé
        this.log(`🌡️ Mode ${signalType}: Signal modulé`);
        await this._sendModulatedSignal('modulated', duration);
        break;
      }

      // Trigger flow card
      if (this._pilotSignalSentTrigger) {
        await this._pilotSignalSentTrigger.trigger(this, {
          signal_type: signalType
        }).catch(e => this.log('[FLOW] pilot signal trigger error:', e.message));
      }

      // Debug logging si activé
      if (this.getSetting('debug_logging')) {
        this.log(`🔍 DEBUG: Signal ${signalType} envoyé - Durée: ${duration}ms, Type: ${modeConfig.voltage}`);
      }

    } catch (error) {
      this.error('🚨 Erreur envoi signal fil pilote:', error);
      throw error;
    }
  }

  async _sendModulatedSignal(type, duration) {
    // Simuler l'envoi du signal via le module Zigbee
    // En réalité, ceci contrôle l'état ON/OFF du relais selon la diode

    const diodeConfig = this.pilotWireConfig.diode;

    switch (type) {
    case 'positive':
      // Signal positif - activation directe
      await this._pulseRelay(true, duration);
      break;

    case 'negative':
      // Signal négatif - selon configuration diode
      if (diodeConfig === 'dual_1n4007') {
        await this._pulseRelay(false, duration);
      } else {
        await this._pulseRelay(true, duration); // Single diode
      }
      break;

    case 'alternating':
      // Signal alternatif - pulses alternés
      const pulses = Math.floor(duration / 100);
      for (let i = 0; i < pulses; i++) {
        await this._pulseRelay(i % 2 === 0, 50);
        await this._delay(50);
      }
      break;

    case 'modulated':
      // Signal modulé - pattern spécial
      await this._pulseRelay(true, duration * 0.7);
      await this._delay(duration * 0.3);
      break;
    }
  }

  async _pulseRelay(state, duration) {
    try {
      if (this.zclNode?.endpoints?.[1]?.clusters?.onOff) {
        // Activer relais
        if (state) {
          await this.zclNode.endpoints[1].clusters.onOff.setOn();
        } else {
          await this.zclNode.endpoints[1].clusters.onOff.setOff();
        }

        // Maintenir état pendant durée
        await this._delay(duration);

        // Retour état neutre (Confort = OFF pour logique inversée)
        await this.zclNode.endpoints[1].clusters.onOff.setOff();
      }
    } catch (error) {
      this.error('🚨 Erreur pulse relais:', error);
    }
  }

  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('🔧 Radiator settings changed:', changedKeys);

    // Mettre à jour configuration fil pilote
    if (changedKeys.includes('pilot_wire_type')) {
      this.pilotWireConfig.type = newSettings.pilot_wire_type;
      this.log(`📡 Type fil pilote changé: ${newSettings.pilot_wire_type}`);
    }

    if (changedKeys.includes('diode_type')) {
      this.pilotWireConfig.diode = newSettings.diode_type;
      this.log(`🔴 Configuration diode changée: ${newSettings.diode_type}`);
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
    this.log('🗑️ Radiator Controller device deleted');

    // Nettoyer timers et listeners
    if (this._schedulingInterval) {
      clearInterval(this._schedulingInterval);
    }
  }

  // Méthodes utilitaires
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
}

module.exports = RadiatorControllerDevice;
