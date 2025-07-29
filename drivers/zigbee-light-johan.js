/**
 * Driver Zigbee Light avec Structure Johan
 * Compatible avec tous les lights Zigbee Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaZigbeeDevice = require('./johan-structure-template');

class ZigbeeLightJohan extends TuyaZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Structure Johan - Initialisation Light Zigbee
        await super.onNodeInit({ zclNode });
        
        this.log('Driver Zigbee Light Johan initialisé');
        
        // Capacités spécifiques Light Johan
        await this.registerLightCapabilities();
        
        // Listeners spécifiques Light Johan
        await this.registerLightListeners();
    }

    async registerLightCapabilities() {
        // Structure Johan - Capacités Light selon Homey SDK
        try {
            // Enregistrement des capacités selon les clusters disponibles
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
            
            this.log('Capacités Light Johan enregistrées');
        } catch (error) {
            this.error('Erreur Johan capacités Light:', error);
        }
    }

    async registerLightListeners() {
        // Structure Johan - Listeners Light selon Homey SDK
        try {
            // Listeners selon les clusters disponibles
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.registerReportListener('genOnOff', 'onOff', this.onLightOffReport.bind(this));
            }
            
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.registerReportListener('genLevelCtrl', 'currentLevel', this.onLightLevelReport.bind(this));
            }
            
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.registerReportListener('lightingColorCtrl', 'currentHue', this.onLightHueReport.bind(this));
                await this.registerReportListener('lightingColorCtrl', 'currentSaturation', this.onLightSaturationReport.bind(this));
                await this.registerReportListener('lightingColorCtrl', 'colorTemperature', this.onLightTemperatureReport.bind(this));
            }
            
            this.log('Listeners Light Johan configurés');
        } catch (error) {
            this.error('Erreur Johan listeners Light:', error);
        }
    }

    // Callbacks Johan Light selon Homey SDK
    async onLightOffReport(value) {
        try {
            await this.setCapabilityValue('onoff', value === 1);
            this.log(`Johan Light onOff: ${value}`);
        } catch (error) {
            this.error('Erreur Johan Light onOff:', error);
        }
    }

    async onLightLevelReport(value) {
        try {
            const level = value / 254 * 100;
            await this.setCapabilityValue('dim', level);
            this.log(`Johan Light level: ${level}%`);
        } catch (error) {
            this.error('Erreur Johan Light level:', error);
        }
    }

    async onLightHueReport(value) {
        try {
            const hue = value / 254 * 360;
            await this.setCapabilityValue('light_hue', hue);
            this.log(`Johan Light hue: ${hue}°`);
        } catch (error) {
            this.error('Erreur Johan Light hue:', error);
        }
    }

    async onLightSaturationReport(value) {
        try {
            const saturation = value / 254 * 100;
            await this.setCapabilityValue('light_saturation', saturation);
            this.log(`Johan Light saturation: ${saturation}%`);
        } catch (error) {
            this.error('Erreur Johan Light saturation:', error);
        }
    }

    async onLightTemperatureReport(value) {
        try {
            await this.setCapabilityValue('light_temperature', value);
            this.log(`Johan Light temperature: ${value}K`);
        } catch (error) {
            this.error('Erreur Johan Light temperature:', error);
        }
    }

    // Méthodes Johan Light selon Homey SDK
    async onOffSet(onoff) {
        try {
            if (this.node.endpoints[1].clusters.genOnOff) {
                await this.node.endpoints[1].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
            }
            this.log(`Johan Light onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Johan Light onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            const level = Math.round(dim * 254 / 100);
            if (this.node.endpoints[1].clusters.genLevelCtrl) {
                await this.node.endpoints[1].clusters.genLevelCtrl.write('currentLevel', level);
            }
            this.log(`Johan Light dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur Johan Light dim set:', error);
            throw error;
        }
    }

    async lightHueSet(hue) {
        try {
            const value = Math.round(hue * 254 / 360);
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.node.endpoints[1].clusters.lightingColorCtrl.write('currentHue', value);
            }
            this.log(`Johan Light hue set: ${hue}°`);
        } catch (error) {
            this.error('Erreur Johan Light hue set:', error);
            throw error;
        }
    }

    async lightSaturationSet(saturation) {
        try {
            const value = Math.round(saturation * 254 / 100);
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.node.endpoints[1].clusters.lightingColorCtrl.write('currentSaturation', value);
            }
            this.log(`Johan Light saturation set: ${saturation}%`);
        } catch (error) {
            this.error('Erreur Johan Light saturation set:', error);
            throw error;
        }
    }

    async lightTemperatureSet(temperature) {
        try {
            if (this.node.endpoints[1].clusters.lightingColorCtrl) {
                await this.node.endpoints[1].clusters.lightingColorCtrl.write('colorTemperature', temperature);
            }
            this.log(`Johan Light temperature set: ${temperature}K`);
        } catch (error) {
            this.error('Erreur Johan Light temperature set:', error);
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
        
        this.log('Johan Light device uninitialized');
    }
}

module.exports = ZigbeeLightJohan;