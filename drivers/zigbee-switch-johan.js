/**
 * Driver Zigbee Switch avec Structure Johan
 * Compatible avec tous les switches Zigbee Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaZigbeeDevice = require('./johan-structure-template');

class ZigbeeSwitchJohan extends TuyaZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Structure Johan - Initialisation Switch Zigbee
        await super.onNodeInit({ zclNode });
        
        this.log('Driver Zigbee Switch Johan initialisé');
        
        // Capacités spécifiques Switch Johan
        await this.registerSwitchCapabilities();
        
        // Listeners spécifiques Switch Johan
        await this.registerSwitchListeners();
    }

    async registerSwitchCapabilities() {
        // Structure Johan - Capacités Switch selon Homey SDK
        try {
            // Enregistrement des capacités selon les clusters disponibles
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerCapability('onoff', 'genOnOff');
            }
            
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerCapability('dim', 'genLevelCtrl');
            }
            
            if (this.node.endpoints[1].clusters.genPowerCfg) {
                await this.registerCapability('measure_power', 'genPowerCfg');
            }
            
            this.log('Capacités Switch Johan enregistrées');
        } catch (error) {
            this.error('Erreur Johan capacités Switch:', error);
        }
    }

    async registerSwitchListeners() {
        // Structure Johan - Listeners Switch selon Homey SDK
        try {
            // Listeners selon les clusters disponibles
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerReportListener('genOnOff', 'onOff', this.onSwitchOffReport.bind(this));
            }
            
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerReportListener('genLevelCtrl', 'currentLevel', this.onSwitchLevelReport.bind(this));
            }
            
            if (this.node.endpoints[1].clusters.genPowerCfg) {
                await this.registerReportListener('genPowerCfg', 'activePower', this.onSwitchPowerReport.bind(this));
            }
            
            this.log('Listeners Switch Johan configurés');
        } catch (error) {
            this.error('Erreur Johan listeners Switch:', error);
        }
    }

    // Callbacks Johan Switch selon Homey SDK
    async onSwitchOffReport(value) {
        try {
            await this.setCapabilityValue('onoff', value === 1);
            this.log(`Johan Switch onOff: ${value}`);
        } catch (error) {
            this.error('Erreur Johan Switch onOff:', error);
        }
    }

    async onSwitchLevelReport(value) {
        try {
            const level = value / 254 * 100;
            await this.setCapabilityValue('dim', level);
            this.log(`Johan Switch level: ${level}%`);
        } catch (error) {
            this.error('Erreur Johan Switch level:', error);
        }
    }

    async onSwitchPowerReport(value) {
        try {
            await this.setCapabilityValue('measure_power', value);
            this.log(`Johan Switch power: ${value}W`);
        } catch (error) {
            this.error('Erreur Johan Switch power:', error);
        }
    }

    // Méthodes Johan Switch selon Homey SDK
    async onOffSet(onoff) {
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.node.endpoints[1].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
            }
            this.log(`Johan Switch onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Johan Switch onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            const level = Math.round(dim * 254 / 100);
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.node.endpoints[1].clusters.genLevelCtrl.write('currentLevel', level);
            }
            this.log(`Johan Switch dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur Johan Switch dim set:', error);
            throw error;
        }
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Structure Johan - Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        
        this.log('Johan Switch device uninitialized');
    }
}

module.exports = ZigbeeSwitchJohan;