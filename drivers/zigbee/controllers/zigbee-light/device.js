/**
 * Driver Zigbee Light - Tuya Zigbee
 * Compatible avec tous les lights Zigbee Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaZigbeeDevice = require('../../../zigbee-structure-template');

class ZigbeeLight extends TuyaZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Initialisation Light Zigbee
        await super.onNodeInit({ zclNode });

        this.log('Driver Zigbee Light initialisé');

        // Capacités spécifiques Light
        await this.registerLightCapabilities();

        // Listeners spécifiques Light
        await this.registerLightListeners();
    }

    async registerLightCapabilities() {
        // Capacités Light selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerCapability('onoff', 'genOnOff');
            }
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerCapability('dim', 'genLevelCtrl');
            }
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.registerCapability('light_hue', 'lightingColorCtrl');
                await this.registerCapability('light_saturation', 'lightingColorCtrl');
                await this.registerCapability('light_temperature', 'lightingColorCtrl');
            }
            this.log('Capacités Light enregistrées');
        } catch (error) {
            this.error('Erreur capacités Light:', error);
        }
    }

    async registerLightListeners() {
        // Listeners Light selon Homey SDK
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerReportListener(1, 'genOnOff', 'onOff', this.onLightOffReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerReportListener(1, 'genLevelCtrl', 'currentLevel', this.onLightLevelReport.bind(this));
            }
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.registerReportListener(1, 'lightingColorCtrl', 'currentHue', this.onLightHueReport.bind(this));
                await this.registerReportListener(1, 'lightingColorCtrl', 'currentSaturation', this.onLightSaturationReport.bind(this));
                await this.registerReportListener(1, 'lightingColorCtrl', 'colorTemperature', this.onLightTemperatureReport.bind(this));
            }
            this.log('Listeners Light configurés');
        } catch (error) {
            this.error('Erreur listeners Light:', error);
        }
    }

    // Callbacks Light selon Homey SDK
    async onLightOffReport(value) {
        try {
            await this.setCapabilityValue('onoff', value === 1);
            this.log(`Light onOff: ${value}`);
        } catch (error) {
            this.error('Erreur Light onOff:', error);
        }
    }

    async onLightLevelReport(value) {
        try {
            const level = value / 254 * 100;
            await this.setCapabilityValue('dim', level);
            this.log(`Light level: ${level}%`);
        } catch (error) {
            this.error('Erreur Light level:', error);
        }
    }

    async onLightHueReport(value) {
        try {
            const hue = value / 254 * 360;
            await this.setCapabilityValue('light_hue', hue);
            this.log(`Light hue: ${hue}°`);
        } catch (error) {
            this.error('Erreur Light hue:', error);
        }
    }

    async onLightSaturationReport(value) {
        try {
            const saturation = value / 254 * 100;
            await this.setCapabilityValue('light_saturation', saturation);
            this.log(`Light saturation: ${saturation}%`);
        } catch (error) {
            this.error('Erreur Light saturation:', error);
        }
    }

    async onLightTemperatureReport(value) {
        try {
            await this.setCapabilityValue('light_temperature', value);
            this.log(`Light temperature: ${value}K`);
        } catch (error) {
            this.error('Erreur Light temperature:', error);
        }
    }

    // Méthodes Light selon Homey SDK
    async onOffSet(onoff) {
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.node.endpoints[1].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
            }
            this.log(`Light onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Light onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            const level = Math.round(dim * 254 / 100);
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.node.endpoints[1].clusters.genLevelCtrl.write('currentLevel', level);
            }
            this.log(`Light dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur Light dim set:', error);
            throw error;
        }
    }

    async lightHueSet(hue) {
        try {
            const value = Math.round(hue * 254 / 360);
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.node.endpoints[1].clusters.lightingColorCtrl.write('currentHue', value);
            }
            this.log(`Light hue set: ${hue}°`);
        } catch (error) {
            this.error('Erreur Light hue set:', error);
            throw error;
        }
    }

    async lightSaturationSet(saturation) {
        try {
            const value = Math.round(saturation * 254 / 100);
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.node.endpoints[1].clusters.lightingColorCtrl.write('currentSaturation', value);
            }
            this.log(`Light saturation set: ${saturation}%`);
        } catch (error) {
            this.error('Erreur Light saturation set:', error);
            throw error;
        }
    }

    async lightTemperatureSet(temperature) {
        try {
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.node.endpoints[1].clusters.lightingColorCtrl.write('colorTemperature', temperature);
            }
            this.log(`Light temperature set: ${temperature}K`);
        } catch (error) {
            this.error('Erreur Light temperature set:', error);
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
        this.log('Light device uninitialized');
    }
}

module.exports = ZigbeeLight;