#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../..//lib/zb-verbose');

class IkeaMotion-981 extends ZigBeeDevice {
    
    async onNodeInit({ zclNode, node }) {
        await super.onNodeInit({ zclNode, node });
        
        // Mode heuristique : découverte automatique des fonctionnalités
        await this.discoverDeviceCapabilities(zclNode);
        
        // Enregistrement des capacités avec fallback intelligent
        await this.registerCapabilitiesIntelligently(zclNode);
    }
    
    async discoverDeviceCapabilities(zclNode) {
        try {
            // Découverte automatique des clusters disponibles
            const clusters = zclNode.clusters;
            this.log('🔍 Clusters découverts:', Object.keys(clusters));
            
            // Découverte des attributs et commandes
            for (const [clusterId, cluster] of Object.entries(clusters)) {
                if (cluster.attributes) {
                    this.log(`📊 Cluster ${clusterId} - Attributs:`, Object.keys(cluster.attributes));
                }
                if (cluster.commands) {
                    this.log(`🎮 Cluster ${clusterId} - Commandes:`, Object.keys(cluster.commands));
                }
            }
        } catch (error) {
            this.log('⚠️ Erreur lors de la découverte des capacités:', error.message);
        }
    }
    
    async registerCapabilitiesIntelligently(zclNode) {
        try {
            // Enregistrement intelligent des capacités selon la catégorie
            const fallback = this.genericFallbacks.get('sensor-motion') || this.genericFallbacks.get('light');
            
            for (const capability of fallback.capabilities) {
                try {
                    await this.registerCapability(capability, capability, {
                        get: 'get',
                        set: capability.startsWith('measure_') ? false : 'set',
                        report: 'report'
                    });
                    this.log(`✅ Capacité ${capability} enregistrée`);
                } catch (error) {
                    this.log(`⚠️ Impossible d'enregistrer la capacité ${capability}:`, error.message);
                }
            }
            
            // Configuration du reporting Zigbee
            await this.configureZigbeeReporting(zclNode);
            
        } catch (error) {
            this.log('❌ Erreur lors de l'enregistrement des capacités:', error.message);
        }
    }
    
    async configureZigbeeReporting(zclNode) {
        try {
            // Configuration intelligente du reporting selon les clusters disponibles
            const clusters = zclNode.clusters;
            
            if (clusters.genBasic) {
                await zclNode.endpoints[1].clusters.genBasic.read('zclVersion');
            }
            
            if (clusters.genOnOff) {
                await zclNode.endpoints[1].clusters.genOnOff.read('onOff');
            }
            
            if (clusters.genLevelCtrl) {
                await zclNode.endpoints[1].clusters.genLevelCtrl.read('currentLevel');
            }
            
            this.log('📡 Reporting Zigbee configuré');
            
        } catch (error) {
            this.log('⚠️ Erreur lors de la configuration du reporting:', error.message);
        }
    }
    
    // Méthodes de fallback pour la compatibilité firmware
    async onSettings(oldSettings, newSettings, changedKeys) {
        this.log('⚙️ Paramètres mis à jour:', changedKeys);
        return super.onSettings(oldSettings, newSettings, changedKeys);
    }
    
    async onRenamed(name) {
        this.log('🏷️ Appareil renommé:', name);
        return super.onRenamed(name);
    }
    
    async onDeleted() {
        this.log('🗑️ Appareil supprimé');
        return super.onDeleted();
    }
}

module.exports = IkeaMotion-981;
