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

    async init() {
        const appId = this.homey.manifest.id;
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
        (() => { try { return this.homey.flow.getActionCard('force_refresh_pids'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
            if (args.device.id !== this.device.id) return false;
            this.device.log(' [FLOW] Forced PID Refresh triggered');
            await this.device.runIntelligentAdaptation();
            return true;
        });

        // 4. ACTION: Set Sub-Sensing Threshold
        (() => { try { return this.homey.flow.getActionCard('set_sensing_threshold'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
            if (args.device.id !== this.device.id) return false;
            await this.device.setSettings({ sensing_threshold: args.threshold });
            return true;
        });
        
        // v7.2.6: Algorithmic Parity Bridge
        (() => { try { return this.homey.flow.getActionCard('calibrate_virtual_energy'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
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


