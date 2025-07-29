/**
 * Device.js - Structure Homey SDK 3
 * Gestion centralisée des devices Tuya Zigbee
 * Architecture conforme Homey SDK 3
 */

const { ZigbeeDevice } = require('homey-meshdriver');

class TuyaZigbeeDevice extends ZigbeeDevice {

    async onNodeInit({ zclNode }) {
        // Initialisation selon Homey SDK 3
        await super.onNodeInit({ zclNode });
        
        // Configuration de base
        this.enableDebug();
        this.printNode();
        
        // Enregistrement des capacités
        await this.registerCapabilities();
        
        // Configuration des listeners
        await this.registerListeners();
        
        // Configuration du polling
        await this.setupPolling();
    }

    async registerCapabilities() {
        // Enregistrement des capacités selon les clusters disponibles
        const deviceCapabilities = this.getCapabilities();
        
        for (const capability of deviceCapabilities) {
            try {
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
                this.log(`Capacité enregistrée: ${capability}`);
            } catch (error) {
                this.error(`Erreur capacité ${capability}:`, error);
            }
        }
    }

    async registerListeners() {
        // Listeners selon les clusters disponibles
        const endpoints = this.getEndpoints();
        
        for (const endpoint of endpoints) {
            try {
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
                
                this.log(`Listeners configurés pour endpoint: ${endpoint}`);
            } catch (error) {
                this.error(`Erreur listeners endpoint ${endpoint}:`, error);
            }
        }
    }

    async setupPolling() {
        // Polling intelligent selon Homey SDK
        const pollInterval = this.getSetting('poll_interval') || 30000;
        
        this.pollTimer = this.homey.setInterval(async () => {
            try {
                await this.poll();
                this.log('Polling réussi');
            } catch (error) {
                this.error('Erreur polling:', error);
            }
        }, pollInterval);
    }

    async poll() {
        // Polling des données selon les clusters disponibles
        const endpoints = this.getEndpoints();
        
        for (const endpoint of endpoints) {
            try {
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
                
                this.log(`Polling endpoint ${endpoint} réussi`);
            } catch (error) {
                this.error(`Erreur polling endpoint ${endpoint}:`, error);
            }
        }
    }

    // Callbacks pour les rapports
    async onOffReport(value) {
        try {
            await this.setCapabilityValue('onoff', value === 1);
            this.log(`onOff report: ${value}`);
        } catch (error) {
            this.error('Erreur onOff callback:', error);
        }
    }

    async onLevelReport(value) {
        try {
            const level = value / 254 * 100;
            await this.setCapabilityValue('dim', level);
            this.log(`level report: ${level}%`);
        } catch (error) {
            this.error('Erreur level callback:', error);
        }
    }

    async onHueReport(value) {
        try {
            const hue = value / 254 * 360;
            await this.setCapabilityValue('light_hue', hue);
            this.log(`hue report: ${hue}°`);
        } catch (error) {
            this.error('Erreur hue callback:', error);
        }
    }

    async onSaturationReport(value) {
        try {
            const saturation = value / 254 * 100;
            await this.setCapabilityValue('light_saturation', saturation);
            this.log(`saturation report: ${saturation}%`);
        } catch (error) {
            this.error('Erreur saturation callback:', error);
        }
    }

    async onTemperatureReport(value) {
        try {
            await this.setCapabilityValue('light_temperature', value);
            this.log(`temperature report: ${value}K`);
        } catch (error) {
            this.error('Erreur temperature callback:', error);
        }
    }

    async onPowerReport(value) {
        try {
            await this.setCapabilityValue('measure_power', value);
            this.log(`power report: ${value}W`);
        } catch (error) {
            this.error('Erreur power callback:', error);
        }
    }

    async onTemperatureMeasurementReport(value) {
        try {
            const temperature = value / 100;
            await this.setCapabilityValue('measure_temperature', temperature);
            this.log(`temperature measurement report: ${temperature}°C`);
        } catch (error) {
            this.error('Erreur temperature measurement callback:', error);
        }
    }

    async onHumidityReport(value) {
        try {
            const humidity = value / 100;
            await this.setCapabilityValue('measure_humidity', humidity);
            this.log(`humidity report: ${humidity}%`);
        } catch (error) {
            this.error('Erreur humidity callback:', error);
        }
    }

    async onZoneStatusReport(value) {
        try {
            const alarmMotion = (value & 0x0001) !== 0;
            const alarmContact = (value & 0x0002) !== 0;
            
            await this.setCapabilityValue('alarm_motion', alarmMotion);
            await this.setCapabilityValue('alarm_contact', alarmContact);
            
            this.log(`zone status report: motion=${alarmMotion}, contact=${alarmContact}`);
        } catch (error) {
            this.error('Erreur zone status callback:', error);
        }
    }

    async onLockStateReport(value) {
        try {
            const isLocked = value === 1;
            await this.setCapabilityValue('lock_get', isLocked);
            this.log(`lock state report: ${isLocked}`);
        } catch (error) {
            this.error('Erreur lock state callback:', error);
        }
    }

    // Méthodes utilitaires
    getCapabilities() {
        return this.getCapabilities();
    }

    getEndpoints() {
        return Object.keys(this.node.endpoints).filter(ep => ep !== '0');
    }

    enableDebug() {
        this.enableDebug();
    }

    printNode() {
        this.printNode();
    }

    // Méthode de nettoyage selon Homey SDK
    async onUninit() {
        if (this.pollTimer) {
            this.homey.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        
        this.log('Device uninitialized');
    }
}

module.exports = TuyaZigbeeDevice;