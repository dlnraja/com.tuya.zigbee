/**
 * Driver Zigbee Wall Switch - Zigbee
 * Interrupteur mural Zigbee
 * Architecture conforme Homey SDK 3
 */

const TuyaZigbeeDevice = require('../../zigbee-structure-template');

class ZigbeeWallSwitch extends TuyaZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Initialisation Wall Switch Zigbee
        await super.onNodeInit({ zclNode });

        this.log('Driver Zigbee Wall Switch initialisé');

        // Capacités spécifiques Wall Switch
        await this.registerWallSwitchCapabilities();

        // Listeners spécifiques Wall Switch
        await this.registerWallSwitchListeners();
    }

    async registerWallSwitchCapabilities() {
        // Capacités Wall Switch selon Homey SDK
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
            this.log('Capacités Wall Switch Zigbee enregistrées');
        } catch (error) {
            this.error('Erreur capacités Wall Switch Zigbee:', error);
        }
    }

    async registerWallSwitchListeners() {
        // Listeners Wall Switch selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerReportListener(1, 'genOnOff', 'onOff', this.onWallSwitchOffReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerReportListener(1, 'genLevelCtrl', 'currentLevel', this.onWallSwitchLevelReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.genPowerCfg) {
                await this.registerReportListener(1, 'genPowerCfg', 'activePower', this.onWallSwitchPowerReport.bind(this));
            }
            this.log('Listeners Wall Switch Zigbee configurés');
        } catch (error) {
            this.error('Erreur listeners Wall Switch Zigbee:', error);
        }
    }

    // Callbacks Wall Switch selon Homey SDK
    async onWallSwitchOffReport(value) {
        try {
            await this.setCapabilityValue('onoff', value === 1);
            this.log(`Wall Switch onOff: ${value}`);
        } catch (error) {
            this.error('Erreur Wall Switch onOff:', error);
        }
    }

    async onWallSwitchLevelReport(value) {
        try {
            const level = value / 254 * 100;
            await this.setCapabilityValue('dim', level);
            this.log(`Wall Switch level: ${level}%`);
        } catch (error) {
            this.error('Erreur Wall Switch level:', error);
        }
    }

    async onWallSwitchPowerReport(value) {
        try {
            await this.setCapabilityValue('measure_power', value);
            this.log(`Wall Switch power: ${value}W`);
        } catch (error) {
            this.error('Erreur Wall Switch power:', error);
        }
    }

    // Méthodes Wall Switch selon Homey SDK
    async onOffSet(onoff) {
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.node.endpoints[1].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
            }
            this.log(`Wall Switch onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Wall Switch onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            const level = Math.round(dim * 254 / 100);
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.node.endpoints[1].clusters.genLevelCtrl.write('currentLevel', level);
            }
            this.log(`Wall Switch dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur Wall Switch dim set:', error);
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
        this.log('Wall Switch Zigbee device uninitialized');
    }
}

module.exports = ZigbeeWallSwitch;