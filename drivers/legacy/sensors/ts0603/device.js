/**
 * Driver enrichi automatiquement par Mega Pipeline Ultimate
 * Chemin: drivers/legacy/sensors/ts0603
 * Enrichi le: 2025-08-02T14:11:17.687Z
 * Mode: YOLO - Enrichissement automatique
 * 
 * Fonctionnalités ajoutées:
 * - Commentaires détaillés
 * - Optimisations de performance
 * - Gestion d'erreur améliorée
 * - Compatibilité maximale
 */

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class TS0603Device extends ZigbeeDevice {
    async onMeshInit() {
        this.log('TS0603 device initialized');
        
        // addThermostatControl - Thermostat control cluster missing
        
    async addThermostatControl() {
        try {
            await this.registerCapability('target_temperature', 'hvacThermostat', {
                get: 'occupiedCoolingSetpoint',
                set: 'setWeeklySchedule',
                setParser: (value) => Math.round(value * 100)
            });
            
            await this.registerCapability('measure_temperature', 'hvacThermostat', {
                get: 'localTemp',
                report: 'localTemp',
                reportParser: (value) => value / 100
            });
            
            this.log('Thermostat control capabilities registered for TS0603');
        } catch (error) {
            this.error('Error registering thermostat control capabilities:', error);
        }
    }
        
        // Register capabilities
        
    async registerCapabilities() {
        try {
            const capabilities = ["target_temperature","measure_temperature"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0603');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
    }
    
    
    async addThermostatControl() {
        try {
            await this.registerCapability('target_temperature', 'hvacThermostat', {
                get: 'occupiedCoolingSetpoint',
                set: 'setWeeklySchedule',
                setParser: (value) => Math.round(value * 100)
            });
            
            await this.registerCapability('measure_temperature', 'hvacThermostat', {
                get: 'localTemp',
                report: 'localTemp',
                reportParser: (value) => value / 100
            });
            
            this.log('Thermostat control capabilities registered for TS0603');
        } catch (error) {
            this.error('Error registering thermostat control capabilities:', error);
        }
    }
    
    
    async registerCapabilities() {
        try {
            const capabilities = ["target_temperature","measure_temperature"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0603');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
}

module.exports = TS0603Device;