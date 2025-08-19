#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../..//lib/zb-verbose');

class GenericPlug extends ZigBeeDevice {
    
    async onNodeInit({ zclNode, node }) {
        await super.onNodeInit({ zclNode, node });
        
        // Mode générique : adaptation automatique à n'importe quel appareil
        await this.adaptToAnyDevice(zclNode);
    }
    
    async adaptToAnyDevice(zclNode) {
        try {
            // Découverte complète de l'appareil
            await this.discoverAllCapabilities(zclNode);
            
            // Adaptation intelligente
            await this.adaptIntelligently(zclNode);
            
        } catch (error) {
            this.log('⚠️ Erreur lors de l'adaptation:', error.message);
        }
    }
    
    async discoverAllCapabilities(zclNode) {
        try {
            const clusters = zclNode.clusters;
            this.log('🔍 Découverte complète des capacités...');
            
            // Analyser tous les clusters disponibles
            for (const [clusterId, cluster] of Object.entries(clusters)) {
                this.log(`📊 Cluster ${clusterId}:`, {
                    attributes: cluster.attributes ? Object.keys(cluster.attributes) : [],
                    commands: cluster.commands ? Object.keys(cluster.commands) : []
                });
            }
            
        } catch (error) {
            this.log('⚠️ Erreur lors de la découverte:', error.message);
        }
    }
    
    async adaptIntelligently(zclNode) {
        try {
            const clusters = zclNode.clusters;
            
            // Adaptation selon les clusters disponibles
            if (clusters.genOnOff) {
                await this.registerCapability('onoff', 'genOnOff', {
                    get: 'get',
                    set: 'set',
                    report: 'report'
                });
            }
            
            if (clusters.genLevelCtrl) {
                await this.registerCapability('dim', 'genLevelCtrl', {
                    get: 'get',
                    set: 'set',
                    report: 'report'
                });
            }
            
            if (clusters.msTemperatureMeasurement) {
                await this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
                    get: 'get',
                    report: 'report'
                });
            }
            
            if (clusters.msRelativeHumidity) {
                await this.registerCapability('measure_humidity', 'msRelativeHumidity', {
                    get: 'get',
                    report: 'report'
                });
            }
            
            if (clusters.msOccupancySensing) {
                await this.registerCapability('alarm_motion', 'msOccupancySensing', {
                    get: 'get',
                    report: 'report'
                });
            }
            
            this.log('✅ Adaptation intelligente terminée');
            
        } catch (error) {
            this.log('⚠️ Erreur lors de l'adaptation intelligente:', error.message);
        }
    }
}

module.exports = GenericPlug;
