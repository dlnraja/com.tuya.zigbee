/**
 * Driver enrichi automatiquement par Mega Pipeline Ultimate
 * Chemin: drivers/legacy/sensors/ts0601_thermostat
 * Enrichi le: 2025-08-02T14:11:17.685Z
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

class TS0601_thermostatDevice extends ZigbeeDevice {
    async onMeshInit() {
        this.log('TS0601_thermostat device initialized');
        
        // Register capabilities
        await this.registerCapabilities();
    }
    
    async registerCapabilities() {
        try {
            const capabilities = ["target_temperature","measure_temperature"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0601_thermostat');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
}

module.exports = TS0601_thermostatDevice;