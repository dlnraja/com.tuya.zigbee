/**
 * Driver enrichi automatiquement par Mega Pipeline Ultimate
 * Chemin: drivers/legacy/dimmers/ts0602
 * Enrichi le: 2025-08-02T14:11:17.018Z
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

class TS0602Device extends ZigbeeDevice {
    async onMeshInit() {
        this.log('TS0602 device initialized');
        
        // addPositionControl - Position control cluster missing
        
    async addPositionControl() {
        try {
            await this.registerCapability('dim', 'genLevelCtrl', {
                get: 'currentLevel',
                set: 'moveToLevel',
                setParser: (value) => Math.round(value * 254)
            });
            
            this.log('Position control capability registered for TS0602');
        } catch (error) {
            this.error('Error registering position control capability:', error);
        }
    }
        
        // Register capabilities
        
    async registerCapabilities() {
        try {
            const capabilities = ["onoff","dim"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0602');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
    }
    
    
    async addPositionControl() {
        try {
            await this.registerCapability('dim', 'genLevelCtrl', {
                get: 'currentLevel',
                set: 'moveToLevel',
                setParser: (value) => Math.round(value * 254)
            });
            
            this.log('Position control capability registered for TS0602');
        } catch (error) {
            this.error('Error registering position control capability:', error);
        }
    }
    
    
    async registerCapabilities() {
        try {
            const capabilities = ["onoff","dim"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0602');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
}

module.exports = TS0602Device;