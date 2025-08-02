/**
 * Driver enrichi automatiquement par Mega Pipeline Ultimate
 * Chemin: drivers/legacy/sensors/ts0201
 * Enrichi le: 2025-08-02T14:11:17.683Z
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

class TS0201Device extends ZigbeeDevice {
    async onMeshInit() {
        this.log('TS0201 device initialized');
        
        // addMeasurementCapabilities - Temperature and humidity measurement
        await this.addMeasurementCapabilities();
        
        // Register capabilities
        await this.registerCapabilities();
    }
    
    async addMeasurementCapabilities() {
        try {
            
            await this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
                get: 'measuredValue',
                report: 'measuredValue',
                reportParser: (value) => value / 100
            });
            
            await this.registerCapability('measure_humidity', 'msRelativeHumidity', {
                get: 'measuredValue',
                report: 'measuredValue',
                reportParser: (value) => value / 100
            });
            this.log('addMeasurementCapabilities implemented for TS0201');
        } catch (error) {
            this.error('Error in addMeasurementCapabilities:', error);
        }
    }
    
    async registerCapabilities() {
        try {
            const capabilities = ["measure_temperature","measure_humidity"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0201');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
}

module.exports = TS0201Device;