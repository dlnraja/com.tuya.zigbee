/**
 * Structure Johan pour Drivers Zigbee Tuya
 * Template de base pour tous les drivers Zigbee
 */

const { ZigbeeDevice } = require('homey-meshdriver');

class TuyaZigbeeDevice extends ZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Structure Johan - Initialisation du device
        await super.onNodeInit({ zclNode });
        
        // Configuration Johan pour Zigbee
        this.enableDebug();
        this.printNode();
        
        // Capacités Johan pour Zigbee
        await this.registerCapabilities();
        
        // Listeners Johan pour Zigbee
        await this.registerListeners();
        
        // Polling Johan pour Zigbee
        await this.setupPolling();
    }

    async registerCapabilities() {
        // Structure Johan - Enregistrement des capacités
        const capabilities = this.getCapabilities();
        
        for (const capability of capabilities) {
            try {
                await this.registerCapability(capability, 'onoff');
                this.log(`Capacité Johan enregistrée: ${capability}`);
            } catch (error) {
                this.error(`Erreur Johan capacité ${capability}:`, error);
            }
        }
    }

    async registerListeners() {
        // Structure Johan - Listeners pour Zigbee
        const endpoints = this.getEndpoints();
        
        for (const endpoint of endpoints) {
            try {
                await this.registerReportListener(endpoint, 'genOnOff', 'onOff', this.onOffReport.bind(this));
                await this.registerReportListener(endpoint, 'genLevelCtrl', 'currentLevel', this.onLevelReport.bind(this));
                await this.registerReportListener(endpoint, 'genBasic', 'zclVersion', this.onBasicReport.bind(this));
                this.log(`Listeners Johan configurés pour endpoint: ${endpoint}`);
            } catch (error) {
                this.error(`Erreur Johan listeners endpoint ${endpoint}:`, error);
            }
        }
    }

    async setupPolling() {
        // Structure Johan - Polling intelligent
        const pollInterval = this.getSetting('poll_interval') || 30000;
        
        this.pollTimer = this.homey.setInterval(async () => {
            try {
                await this.poll();
                this.log('Polling Johan Zigbee réussi');
            } catch (error) {
                this.error('Erreur Johan polling:', error);
            }
        }, pollInterval);
    }

    async poll() {
        // Structure Johan - Polling des données
        const endpoints = this.getEndpoints();
        
        for (const endpoint of endpoints) {
            try {
                await this.node.endpoints[endpoint].clusters.genOnOff.read('onOff');
                await this.node.endpoints[endpoint].clusters.genLevelCtrl.read('currentLevel');
                this.log(`Polling Johan endpoint ${endpoint} réussi`);
            } catch (error) {
                this.error(`Erreur Johan polling endpoint ${endpoint}:`, error);
            }
        }
    }

    // Callbacks Johan pour Zigbee
    async onOffReport(value) {
        // Structure Johan - Callback onOff
        try {
            await this.setCapabilityValue('onoff', value === 1);
            this.log(`Johan onOff report: ${value}`);
        } catch (error) {
            this.error('Erreur Johan onOff callback:', error);
        }
    }

    async onLevelReport(value) {
        // Structure Johan - Callback level
        try {
            const level = value / 254 * 100;
            await this.setCapabilityValue('dim', level);
            this.log(`Johan level report: ${level}%`);
        } catch (error) {
            this.error('Erreur Johan level callback:', error);
        }
    }

    async onBasicReport(value) {
        // Structure Johan - Callback basic
        try {
            this.log(`Johan basic report: ${value}`);
        } catch (error) {
            this.error('Erreur Johan basic callback:', error);
        }
    }

    // Méthodes Johan pour Zigbee
    async onOffSet(onoff) {
        // Structure Johan - Set onOff
        try {
            const endpoints = this.getEndpoints();
            
            for (const endpoint of endpoints) {
                await this.node.endpoints[endpoint].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
            }
            
            this.log(`Johan onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Johan onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        // Structure Johan - Set dim
        try {
            const level = Math.round(dim * 254 / 100);
            const endpoints = this.getEndpoints();
            
            for (const endpoint of endpoints) {
                await this.node.endpoints[endpoint].clusters.genLevelCtrl.write('currentLevel', level);
            }
            
            this.log(`Johan dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur Johan dim set:', error);
            throw error;
        }
    }

    // Utilitaires Johan pour Zigbee
    getCapabilities() {
        // Structure Johan - Récupération des capacités
        return this.getCapabilities();
    }

    getEndpoints() {
        // Structure Johan - Récupération des endpoints
        return Object.keys(this.node.endpoints).filter(ep => ep !== '0');
    }

    enableDebug() {
        // Structure Johan - Debug activé
        this.enableDebug();
    }

    printNode() {
        // Structure Johan - Affichage du node
        this.printNode();
    }
}

module.exports = TuyaZigbeeDevice;