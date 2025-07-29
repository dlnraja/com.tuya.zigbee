/**
 * Driver Zigbee Switch - Tuya Zigbee
 * Compatible avec tous les switches Zigbee Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaZigbeeDevice = require('../../../zigbee-structure-template');

class ZigbeeSwitch extends TuyaZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Initialisation Switch Zigbee
        await super.onNodeInit({ zclNode });

        this.log('Driver Zigbee Switch initialisé');

        // Capacités spécifiques Switch
        await this.registerSwitchCapabilities();

        // Listeners spécifiques Switch
        await this.registerSwitchListeners();
    }

    async registerSwitchCapabilities() {
        // Capacités Switch selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerCapability('onoff', 'genOnOff');
            }
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerCapability('dim', 'genLevelCtrl');
            }
            if (this.node.endpoints[1].clusters.genPowerCfg) {
                await this.registerCapability('measure_power', 'genPowerCfg');
            }
            this.log('Capacités Switch enregistrées');
        } catch (error) {
            this.error('Erreur capacités Switch:', error);
        }
    }

    async registerSwitchListeners() {
        // Listeners Switch selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerReportListener(1, 'genOnOff', 'onOff', this.onSwitchOffReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerReportListener(1, 'genLevelCtrl', 'currentLevel', this.onSwitchLevelReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.genPowerCfg) {
                await this.registerReportListener(1, 'genPowerCfg', 'activePower', this.onSwitchPowerReport.bind(this));
            }
            this.log('Listeners Switch configurés');
        } catch (error) {
            this.error('Erreur listeners Switch:', error);
        }
    }

    // Callbacks Switch selon Homey SDK
    async onSwitchOffReport(value) {
        try {
            await this.setCapabilityValue('onoff', value === 1);
            this.log(`Switch onOff: ${value}`);
        } catch (error) {
            this.error('Erreur Switch onOff:', error);
        }
    }

    async onSwitchLevelReport(value) {
        try {
            const level = value / 254 * 100;
            await this.setCapabilityValue('dim', level);
            this.log(`Switch level: ${level}%`);
        } catch (error) {
            this.error('Erreur Switch level:', error);
        }
    }

    async onSwitchPowerReport(value) {
        try {
            await this.setCapabilityValue('measure_power', value);
            this.log(`Switch power: ${value}W`);
        } catch (error) {
            this.error('Erreur Switch power:', error);
        }
    }

    // Méthodes Switch selon Homey SDK
    async onOffSet(onoff) {
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.node.endpoints[1].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
            }
            this.log(`Switch onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Switch onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            const level = Math.round(dim * 254 / 100);
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.node.endpoints[1].clusters.genLevelCtrl.write('currentLevel', level);
            }
            this.log(`Switch dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur dim set:', error);
            throw error;
        }
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.log('Switch device uninitialized');
    }
}

module.exports = ZigbeeSwitch;