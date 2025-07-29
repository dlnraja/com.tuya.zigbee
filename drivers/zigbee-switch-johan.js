/**
 * Driver Zigbee Switch avec Structure Johan
 * Compatible avec tous les switches Zigbee Tuya
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
        // Structure Johan - Capacités Switch
        try {
            await this.registerCapability('onoff', 'genOnOff');
            await this.registerCapability('dim', 'genLevelCtrl');
            await this.registerCapability('measure_power', 'genPowerCfg');
            this.log('Capacités Switch Johan enregistrées');
        } catch (error) {
            this.error('Erreur Johan capacités Switch:', error);
        }
    }

    async registerSwitchListeners() {
        // Structure Johan - Listeners Switch
        try {
            await this.registerReportListener('genOnOff', 'onOff', this.onSwitchOffReport.bind(this));
            await this.registerReportListener('genLevelCtrl', 'currentLevel', this.onSwitchLevelReport.bind(this));
            await this.registerReportListener('genPowerCfg', 'activePower', this.onSwitchPowerReport.bind(this));
            this.log('Listeners Switch Johan configurés');
        } catch (error) {
            this.error('Erreur Johan listeners Switch:', error);
        }
    }

    // Callbacks Johan Switch
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

    // Méthodes Johan Switch
    async onOffSet(onoff) {
        try {
            await this.node.endpoints[1].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
            this.log(`Johan Switch onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Johan Switch onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            const level = Math.round(dim * 254 / 100);
            await this.node.endpoints[1].clusters.genLevelCtrl.write('currentLevel', level);
            this.log(`Johan Switch dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur Johan Switch dim set:', error);
            throw error;
        }
    }
}

module.exports = ZigbeeSwitchJohan;