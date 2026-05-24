'use strict';

/**
 * UniversalFlowCardManager - Centralized registration for all Algorithmic/Smart flow cards.
 * Prevents code duplication across 500+ drivers.
 */
class UniversalFlowCardManager {
    constructor(device) {
        this.device = device;
        this.homey = device.homey;
    }

    _getCard(type, id) {
        try {
            if (type === 'action') return this.homey.flow.getActionCard(id);
            if (type === 'trigger') return this.homey.flow.getTriggerCard(id);
            if (type === 'condition') return this.homey.flow.getConditionCard(id);
        } catch (err) {
            this.device.error(`[FLOW-MANAGER] Failed to get ${type} card ${id}:`, err.message);
        }
        return null;
    }

    async init() {
        this.device.log('[FLOW-MANAGER] Initializing Smart Flow Cards...');

        // 1. ADAPTIVE LIGHTING CARDS
        this.device.registerCapabilityListener('onoff_adaptive_lighting', async (value) => {
            if (this.device.adaptiveLighting) {
                if (value) this.device.adaptiveLighting.start();
                else this.device.adaptiveLighting.stop();
            }
        });

        // 2. RADIO SENSING CARDS
        // Triggered via _processRadioSensing in UniversalZigbeeDevice

        // 3. ACTION: Force Refresh
        this._getCard('action', 'force_pid_refresh')?.registerRunListener(async (args) => {
            if (args.device.id !== this.device.id) return false;
            this.device.log(' [FLOW] Forced PID Refresh triggered');
            await this.device.runIntelligentAdaptation();
            return true;
        });

        // 4. ACTION: Set Sub-Sensing Threshold
        this._getCard('action', 'set_sensing_threshold')?.registerRunListener(async (args) => {
            if (args.device.id !== this.device.id) return false;
            await this.device.setSettings({ sensing_threshold: args.threshold });
            return true;
        });
        
        // v7.2.6: Algorithmic Parity Bridge
        this._getCard('action', 'virtual_energy_calibrate')?.registerRunListener(async (args) => {
             if (args.device.id !== this.device.id) return false;
             await this.device.setSettings({ 
                 virtual_energy_enabled: true,
                 virtual_energy_nominal_power: args.watts
             });
             this.device.log(` [FLOW] Virtual Energy Calibrated: ${args.watts}W`);
             return true;
        });
    }
}

module.exports = UniversalFlowCardManager;
