/**
 * Driver Zigbee Smart Plug - Zigbee
 * Prise intelligente Zigbee
 * Architecture conforme Homey SDK 3
 */

const TuyaZigbeeDevice = require('../../zigbee-structure-template');

class ZigbeeSmartPlug extends TuyaZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Initialisation Smart Plug Zigbee
        await super.onNodeInit({ zclNode });

        this.log('Driver Zigbee Smart Plug initialisé');

        // Capacités spécifiques Smart Plug
        await this.registerSmartPlugCapabilities();

        // Listeners spécifiques Smart Plug
        await this.registerSmartPlugListeners();
    }

    async registerSmartPlugCapabilities() {
        // Capacités Smart Plug selon Homey SDK
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
            if (this.node.endpoints[1].clusters.haElectricalMeasurement) {
                await this.registerCapability('measure_current', 'haElectricalMeasurement');
                await this.registerCapability('measure_voltage', 'haElectricalMeasurement');
            }
            this.log('Capacités Smart Plug Zigbee enregistrées');
        } catch (error) {
            this.error('Erreur capacités Smart Plug Zigbee:', error);
        }
    }

    async registerSmartPlugListeners() {
        // Listeners Smart Plug selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerReportListener(1, 'genOnOff', 'onOff', this.onSmartPlugOffReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerReportListener(1, 'genLevelCtrl', 'currentLevel', this.onSmartPlugLevelReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.genPowerCfg) {
                await this.registerReportListener(1, 'genPowerCfg', 'activePower', this.onSmartPlugPowerReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.haElectricalMeasurement) {
                await this.registerReportListener(1, 'haElectricalMeasurement', 'rmsCurrent', this.onSmartPlugCurrentReport.bind(this));
                await this.registerReportListener(1, 'haElectricalMeasurement', 'rmsVoltage', this.onSmartPlugVoltageReport.bind(this));
            }
            this.log('Listeners Smart Plug Zigbee configurés');
        } catch (error) {
            this.error('Erreur listeners Smart Plug Zigbee:', error);
        }
    }

    // Callbacks Smart Plug selon Homey SDK
    async onSmartPlugOffReport(value) {
        try {
            await this.setCapabilityValue('onoff', value === 1);
            this.log(`Smart Plug onOff: ${value}`);
        } catch (error) {
            this.error('Erreur Smart Plug onOff:', error);
        }
    }

    async onSmartPlugLevelReport(value) {
        try {
            const level = value / 254 * 100;
            await this.setCapabilityValue('dim', level);
            this.log(`Smart Plug level: ${level}%`);
        } catch (error) {
            this.error('Erreur Smart Plug level:', error);
        }
    }

    async onSmartPlugPowerReport(value) {
        try {
            await this.setCapabilityValue('measure_power', value);
            this.log(`Smart Plug power: ${value}W`);
        } catch (error) {
            this.error('Erreur Smart Plug power:', error);
        }
    }

    async onSmartPlugCurrentReport(value) {
        try {
            const current = value / 1000;
            await this.setCapabilityValue('measure_current', current);
            this.log(`Smart Plug current: ${current}A`);
        } catch (error) {
            this.error('Erreur Smart Plug current:', error);
        }
    }

    async onSmartPlugVoltageReport(value) {
        try {
            const voltage = value / 10;
            await this.setCapabilityValue('measure_voltage', voltage);
            this.log(`Smart Plug voltage: ${voltage}V`);
        } catch (error) {
            this.error('Erreur Smart Plug voltage:', error);
        }
    }

    // Méthodes Smart Plug selon Homey SDK
    async onOffSet(onoff) {
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.node.endpoints[1].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
            }
            this.log(`Smart Plug onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Smart Plug onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            const level = Math.round(dim * 254 / 100);
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.node.endpoints[1].clusters.genLevelCtrl.write('currentLevel', level);
            }
            this.log(`Smart Plug dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur Smart Plug dim set:', error);
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
        this.log('Smart Plug Zigbee device uninitialized');
    }
}

module.exports = ZigbeeSmartPlug;