/**
 * Structure Johan pour Drivers Zigbee Tuya
 * Template de base pour tous les drivers Zigbee
 * Architecture conforme Homey SDK 3
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
        // Structure Johan - Enregistrement des capacités selon Homey SDK
        const deviceCapabilities = this.getCapabilities();
        
        for (const capability of deviceCapabilities) {
            try {
                // Enregistrement selon le type de capacité
                switch (capability) {
                    case 'onoff':
                        await this.registerCapability('onoff', 'genOnOff');
                        break;
                    case 'dim':
                        await this.registerCapability('dim', 'genLevelCtrl');
                        break;
                    case 'light_hue':
                        await this.registerCapability('light_hue', 'lightingColorCtrl');
                        break;
                    case 'light_saturation':
                        await this.registerCapability('light_saturation', 'lightingColorCtrl');
                        break;
                    case 'light_temperature':
                        await this.registerCapability('light_temperature', 'lightingColorCtrl');
                        break;
                    case 'measure_power':
                        await this.registerCapability('measure_power', 'genPowerCfg');
                        break;
                    case 'measure_temperature':
                        await this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
                        break;
                    case 'measure_humidity':
                        await this.registerCapability('measure_humidity', 'msRelativeHumidity');
                        break;
                    case 'alarm_motion':
                        await this.registerCapability('alarm_motion', 'ssIasZone');
                        break;
                    case 'alarm_contact':
                        await this.registerCapability('alarm_contact', 'ssIasZone');
                        break;
                    case 'lock_set':
                        await this.registerCapability('lock_set', 'closuresDoorLock');
                        break;
                    case 'lock_get':
                        await this.registerCapability('lock_get', 'closuresDoorLock');
                        break;
                    default:
                        this.log(`Capacité non reconnue: ${capability}`);
                        break;
                }
                this.log(`Capacité Johan enregistrée: ${capability}`);
            } catch (error) {
                this.error(`Erreur Johan capacité ${capability}:`, error);
            }
        }
    }

    async registerListeners() {
        // Structure Johan - Listeners pour Zigbee selon Homey SDK
        const endpoints = this.getEndpoints();
        
        for (const endpoint of endpoints) {
            try {
                // Listeners selon les clusters disponibles
                if (this.node.endpoints[endpoint].clusters.genOnOff) {
                    await this.registerReportListener(endpoint, 'genOnOff', 'onOff', this.onOffReport.bind(this));
                }
                
                if (this.node.endpoints[endpoint].clusters.genLevelCtrl) {
                    await this.registerReportListener(endpoint, 'genLevelCtrl', 'currentLevel', this.onLevelReport.bind(this));
                }
                
                if (this.node.endpoints[endpoint].clusters.lightingColorCtrl) {
                    await this.registerReportListener(endpoint, 'lightingColorCtrl', 'currentHue', this.onHueReport.bind(this));
                    await this.registerReportListener(endpoint, 'lightingColorCtrl', 'currentSaturation', this.onSaturationReport.bind(this));
                    await this.registerReportListener(endpoint, 'lightingColorCtrl', 'colorTemperature', this.onTemperatureReport.bind(this));
                }
                
                if (this.node.endpoints[endpoint].clusters.genPowerCfg) {
                    await this.registerReportListener(endpoint, 'genPowerCfg', 'activePower', this.onPowerReport.bind(this));
                }
                
                if (this.node.endpoints[endpoint].clusters.msTemperatureMeasurement) {
                    await this.registerReportListener(endpoint, 'msTemperatureMeasurement', 'measuredValue', this.onTemperatureMeasurementReport.bind(this));
                }
                
                if (this.node.endpoints[endpoint].clusters.msRelativeHumidity) {
                    await this.registerReportListener(endpoint, 'msRelativeHumidity', 'measuredValue', this.onHumidityReport.bind(this));
                }
                
                if (this.node.endpoints[endpoint].clusters.ssIasZone) {
                    await this.registerReportListener(endpoint, 'ssIasZone', 'zoneStatus', this.onZoneStatusReport.bind(this));
                }
                
                if (this.node.endpoints[endpoint].clusters.closuresDoorLock) {
                    await this.registerReportListener(endpoint, 'closuresDoorLock', 'lockState', this.onLockStateReport.bind(this));
                }
                
                this.log(`Listeners Johan configurés pour endpoint: ${endpoint}`);
            } catch (error) {
                this.error(`Erreur Johan listeners endpoint ${endpoint}:`, error);
            }
        }
    }

    async setupPolling() {
        // Structure Johan - Polling intelligent selon Homey SDK
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
        // Structure Johan - Polling des données selon Homey SDK
        const endpoints = this.getEndpoints();
        
        for (const endpoint of endpoints) {
            try {
                // Polling selon les clusters disponibles
                if (this.node.endpoints[endpoint].clusters.genOnOff) {
                    await this.node.endpoints[endpoint].clusters.genOnOff.read('onOff');
                }
                
                if (this.node.endpoints[endpoint].clusters.genLevelCtrl) {
                    await this.node.endpoints[endpoint].clusters.genLevelCtrl.read('currentLevel');
                }
                
                if (this.node.endpoints[endpoint].clusters.genPowerCfg) {
                    await this.node.endpoints[endpoint].clusters.genPowerCfg.read('activePower');
                }
                
                if (this.node.endpoints[endpoint].clusters.msTemperatureMeasurement) {
                    await this.node.endpoints[endpoint].clusters.msTemperatureMeasurement.read('measuredValue');
                }
                
                if (this.node.endpoints[endpoint].clusters.msRelativeHumidity) {
                    await this.node.endpoints[endpoint].clusters.msRelativeHumidity.read('measuredValue');
                }
                
                this.log(`Polling Johan endpoint ${endpoint} réussi`);
            } catch (error) {
                this.error(`Erreur Johan polling endpoint ${endpoint}:`, error);
            }
        }
    }

    // Callbacks Johan pour Zigbee selon Homey SDK
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

    async onHueReport(value) {
        // Structure Johan - Callback hue
        try {
            const hue = value / 254 * 360;
            await this.setCapabilityValue('light_hue', hue);
            this.log(`Johan hue report: ${hue}°`);
        } catch (error) {
            this.error('Erreur Johan hue callback:', error);
        }
    }

    async onSaturationReport(value) {
        // Structure Johan - Callback saturation
        try {
            const saturation = value / 254 * 100;
            await this.setCapabilityValue('light_saturation', saturation);
            this.log(`Johan saturation report: ${saturation}%`);
        } catch (error) {
            this.error('Erreur Johan saturation callback:', error);
        }
    }

    async onTemperatureReport(value) {
        // Structure Johan - Callback temperature
        try {
            await this.setCapabilityValue('light_temperature', value);
            this.log(`Johan temperature report: ${value}K`);
        } catch (error) {
            this.error('Erreur Johan temperature callback:', error);
        }
    }

    async onPowerReport(value) {
        // Structure Johan - Callback power
        try {
            await this.setCapabilityValue('measure_power', value);
            this.log(`Johan power report: ${value}W`);
        } catch (error) {
            this.error('Erreur Johan power callback:', error);
        }
    }

    async onTemperatureMeasurementReport(value) {
        // Structure Johan - Callback temperature measurement
        try {
            const temperature = value / 100;
            await this.setCapabilityValue('measure_temperature', temperature);
            this.log(`Johan temperature measurement report: ${temperature}°C`);
        } catch (error) {
            this.error('Erreur Johan temperature measurement callback:', error);
        }
    }

    async onHumidityReport(value) {
        // Structure Johan - Callback humidity
        try {
            const humidity = value / 100;
            await this.setCapabilityValue('measure_humidity', humidity);
            this.log(`Johan humidity report: ${humidity}%`);
        } catch (error) {
            this.error('Erreur Johan humidity callback:', error);
        }
    }

    async onZoneStatusReport(value) {
        // Structure Johan - Callback zone status
        try {
            const alarmMotion = (value & 0x0001) !== 0;
            const alarmContact = (value & 0x0002) !== 0;
            
            await this.setCapabilityValue('alarm_motion', alarmMotion);
            await this.setCapabilityValue('alarm_contact', alarmContact);
            
            this.log(`Johan zone status report: motion=${alarmMotion}, contact=${alarmContact}`);
        } catch (error) {
            this.error('Erreur Johan zone status callback:', error);
        }
    }

    async onLockStateReport(value) {
        // Structure Johan - Callback lock state
        try {
            const isLocked = value === 1;
            await this.setCapabilityValue('lock_get', isLocked);
            this.log(`Johan lock state report: ${isLocked}`);
        } catch (error) {
            this.error('Erreur Johan lock state callback:', error);
        }
    }

    // Méthodes Johan pour Zigbee selon Homey SDK
    async onOffSet(onoff) {
        // Structure Johan - Set onOff
        try {
            const endpoints = this.getEndpoints();
            
            for (const endpoint of endpoints) {
                if (this.node.endpoints[endpoint].clusters.genOnOff) {
                    await this.node.endpoints[endpoint].clusters.genOnOff.write('onOff', onoff ? 1 : 0);
                }
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
                if (this.node.endpoints[endpoint].clusters.genLevelCtrl) {
                    await this.node.endpoints[endpoint].clusters.genLevelCtrl.write('currentLevel', level);
                }
            }
            
            this.log(`Johan dim set: ${dim}%`);
        } catch (error) {
            this.error('Erreur Johan dim set:', error);
            throw error;
        }
    }

    async lightHueSet(hue) {
        // Structure Johan - Set light hue
        try {
            const value = Math.round(hue * 254 / 360);
            const endpoints = this.getEndpoints();
            
            for (const endpoint of endpoints) {
                if (this.node.endpoints[endpoint].clusters.lightingColorCtrl) {
                    await this.node.endpoints[endpoint].clusters.lightingColorCtrl.write('currentHue', value);
                }
            }
            
            this.log(`Johan light hue set: ${hue}°`);
        } catch (error) {
            this.error('Erreur Johan light hue set:', error);
            throw error;
        }
    }

    async lightSaturationSet(saturation) {
        // Structure Johan - Set light saturation
        try {
            const value = Math.round(saturation * 254 / 100);
            const endpoints = this.getEndpoints();
            
            for (const endpoint of endpoints) {
                if (this.node.endpoints[endpoint].clusters.lightingColorCtrl) {
                    await this.node.endpoints[endpoint].clusters.lightingColorCtrl.write('currentSaturation', value);
                }
            }
            
            this.log(`Johan light saturation set: ${saturation}%`);
        } catch (error) {
            this.error('Erreur Johan light saturation set:', error);
            throw error;
        }
    }

    async lightTemperatureSet(temperature) {
        // Structure Johan - Set light temperature
        try {
            const endpoints = this.getEndpoints();
            
            for (const endpoint of endpoints) {
                if (this.node.endpoints[endpoint].clusters.lightingColorCtrl) {
                    await this.node.endpoints[endpoint].clusters.lightingColorCtrl.write('colorTemperature', temperature);
                }
            }
            
            this.log(`Johan light temperature set: ${temperature}K`);
        } catch (error) {
            this.error('Erreur Johan light temperature set:', error);
            throw error;
        }
    }

    async lockSet(locked) {
        // Structure Johan - Set lock
        try {
            const endpoints = this.getEndpoints();
            
            for (const endpoint of endpoints) {
                if (this.node.endpoints[endpoint].clusters.closuresDoorLock) {
                    await this.node.endpoints[endpoint].clusters.closuresDoorLock.write('lockState', locked ? 1 : 2);
                }
            }
            
            this.log(`Johan lock set: ${locked}`);
        } catch (error) {
            this.error('Erreur Johan lock set:', error);
            throw error;
        }
    }

    // Utilitaires Johan pour Zigbee selon Homey SDK
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

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        // Structure Johan - Nettoyage lors de la déconnexion
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        
        this.log('Johan device uninitialized');
    }
}

module.exports = TuyaZigbeeDevice;