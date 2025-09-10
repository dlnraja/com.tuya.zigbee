#!/usr/bin/env node
'use strict';

/**
 * 🔌 CLUSTER MAP - Gestionnaire de cluster Zigbee pour Tuya
 * Mapping des clusters et attributs Zigbee standard et spécifiques Tuya
 */

const CLUSTER_MAP = {
    // Clusters standard Zigbee
    'genBasic': 0x0000,
    'genPowerCfg': 0x0001,
    'genOnOff': 0x0006,
    'genLevelCtrl': 0x0008,
    'genTime': 0x000A,
    'genOta': 0x0019,
    
    // Clusters de mesure
    'msTemperatureMeasurement': 0x0402,
    'msRelativeHumidity': 0x0405,
    'msPressureMeasurement': 0x0403,
    'msIlluminanceMeasurement': 0x0400,
    
    // Clusters spécifiques à Tuya
    'tuyaSpecific': 0xEF00,
    'tuyaData': 0xE001
};

const ATTRIBUTE_MAP = {
    'onOff': 0x0000,
    'currentLevel': 0x0000,
    'measuredValue': 0x0000,
    'minMeasuredValue': 0x0001,
    'maxMeasuredValue': 0x0002,
    
    // Attributs spécifiques Tuya
    'tuyaData': 0x0000,
    'tuyaCommand': 0x0001
};

class ClusterManager {
    constructor() {
        this.clusters = CLUSTER_MAP;
        this.attributes = ATTRIBUTE_MAP;
    }

    getClusterId(clusterName) {
        return this.clusters[clusterName] || null;
    }

    getAttributeId(clusterName, attributeName) {
        const clusterId = this.getClusterId(clusterName);
        if (!clusterId) return null;
        
        return this.attributes[attributeName] || null;
    }

    // Méthodes pour gérer les données Tuya spécifiques
    encodeTuyaData(dp, data) {
        // Encodage des données Tuya selon le protocole
        const buffer = Buffer.alloc(data.length + 4);
        buffer.writeUInt8(0x55, 0); // Header
        buffer.writeUInt8(dp, 1);   // DP ID
        buffer.writeUInt8(0x00, 2); // Type
        buffer.writeUInt8(data.length, 3); // Length
        
        data.copy(buffer, 4);
        return buffer;
    }

    decodeTuyaData(buffer) {
        // Décodage des données Tuya
        if (buffer.length < 4 || buffer.readUInt8(0) !== 0x55) {
            return null;
        }

        return {
            dp: buffer.readUInt8(1),
            type: buffer.readUInt8(2),
            length: buffer.readUInt8(3),
            data: buffer.slice(4, 4 + buffer.readUInt8(3))
        };
    }
}

module.exports = ClusterManager;
console.log("✅ Cluster Map créé avec succès !");
