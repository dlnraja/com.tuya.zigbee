const fs = require('fs');
const path = require('path');

class AIIntegration {
    constructor() {
        this.clusterMatrix = this.loadClusterMatrix();
        this.deviceTemplates = this.loadDeviceTemplates();
    }

    loadClusterMatrix() {
        try {
            const matrixPath = path.join(__dirname, '../../referentials/zigbee/matrix/cluster-matrix.json');
            return JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
        } catch (error) {
            console.error('Error loading cluster matrix:', error);
            return {};
        }
    }

    loadDeviceTemplates() {
        const templatesDir = path.join(__dirname, '../../templates');
        const templates = {};
        
        if (fs.existsSync(templatesDir)) {
            const files = fs.readdirSync(templatesDir);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const template = JSON.parse(fs.readFileSync(path.join(templatesDir, file), 'utf8'));
                    templates[file.replace('.json', '')] = template;
                }
            });
        }
        
        return templates;
    }

    analyzeDevice(deviceData) {
        const analysis = {
            deviceId: deviceData.deviceId,
            manufacturer: this.identifyManufacturer(deviceData),
            deviceType: this.identifyDeviceType(deviceData),
            clusters: this.analyzeClusters(deviceData.clusters),
            capabilities: this.identifyCapabilities(deviceData.clusters),
            template: this.generateTemplate(deviceData),
            confidence: this.calculateConfidence(deviceData)
        };

        return analysis;
    }

    identifyManufacturer(deviceData) {
        const manufacturerId = deviceData.manufacturerId;
        return this.clusterMatrix.manufacturers[manufacturerId] || 'Unknown';
    }

    identifyDeviceType(deviceData) {
        const deviceTypeId = deviceData.deviceTypeId;
        return this.clusterMatrix.deviceTypes[deviceTypeId] || 'Unknown';
    }

    analyzeClusters(clusters) {
        const analysis = {};
        
        for (const clusterId in clusters) {
            const cluster = this.clusterMatrix.clusters[clusterId];
            if (cluster) {
                analysis[clusterId] = {
                    name: cluster.name,
                    description: cluster.description
                };
            }
        }

        return analysis;
    }

    identifyCapabilities(clusters) {
        const capabilities = [];
        
        for (const clusterId in clusters) {
            const cluster = this.clusterMatrix.clusters[clusterId];
            if (cluster) {
                switch (clusterId) {
                    case '0x0006':
                        capabilities.push('onoff');
                        break;
                    case '0x0008':
                        capabilities.push('dim');
                        break;
                    case '0x0300':
                        capabilities.push('color');
                        break;
                    case '0xEF00':
                        capabilities.push('tuya');
                        break;
                }
            }
        }

        return capabilities;
    }

    generateTemplate(deviceData) {
        const capabilities = this.identifyCapabilities(deviceData.clusters);
        
        if (capabilities.includes('color')) {
            return 'color-light';
        } else if (capabilities.includes('dim')) {
            return 'dimmable-light';
        } else if (capabilities.includes('onoff')) {
            return 'basic-switch';
        } else {
            return 'generic-device';
        }
    }

    calculateConfidence(deviceData) {
        let confidence = 0;
        const totalClusters = Object.keys(deviceData.clusters).length;
        let recognizedClusters = 0;

        for (const clusterId in deviceData.clusters) {
            if (this.clusterMatrix.clusters[clusterId]) {
                recognizedClusters++;
            }
        }

        if (totalClusters > 0) {
            confidence = (recognizedClusters / totalClusters) * 100;
        }

        return Math.round(confidence);
    }
}

module.exports = AIIntegration;
