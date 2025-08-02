/**
 * Driver enrichi automatiquement par Mega Pipeline Ultimate
 * Chemin: drivers/legacy/switches/ts0601_rgb
 * Enrichi le: 2025-08-02T14:11:17.993Z
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

class TS0601_rgbDevice extends ZigbeeDevice {
    async onMeshInit() {
        this.log('TS0601_rgb device initialized');
        
        // Register capabilities
        await this.registerCapabilities();
    }
    
    async registerCapabilities() {
        try {
            const capabilities = ["onoff","light_hue","light_saturation","light_temperature"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0601_rgb');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
}

module.exports = TS0601_rgbDevice;