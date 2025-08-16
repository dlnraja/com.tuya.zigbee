#!/usr/bin/env node
'use strict';

/**
 * Driver Tuya Light - Tuya
 * Compatible avec tous les lights Tuya
 * Architecture conforme Homey SDK 3
 */

const TuyaDeviceTemplate = require('../../tuya-structure-template');

class TuyaLight extends TuyaDeviceTemplate {

    async onNodeInit() {
        // Initialisation Light Tuya
        await super.onNodeInit();

        this.log('Driver Tuya Light initialisé');

        // Capacités spécifiques Light
        await this.registerLightCapabilities();

        // Listeners spécifiques Light
        await this.registerLightListeners();
    }

    async registerLightCapabilities() {
        // Capacités Light selon Homey SDK
        try {
            await this.registerCapability('onoff', 'switch');
            if (this.hasCapability('dim')) {
                await this.registerCapability('dim', 'dimmer');
            }
            if (this.hasCapability('light_hue')) {
                await this.registerCapability('light_hue', 'light');
            }
            if (this.hasCapability('light_saturation')) {
                await this.registerCapability('light_saturation', 'light');
            }
            if (this.hasCapability('light_temperature')) {
                await this.registerCapability('light_temperature', 'light');
            }
            this.log('Capacités Light Tuya enregistrées');
        } catch (error) {
            this.error('Erreur capacités Light Tuya:', error);
        }
    }

    async registerLightListeners() {
        // Listeners Light selon Homey SDK
        try {
            // Listeners spécifiques pour Light Tuya
            this.on('data', this.onLightData.bind(this));
            this.on('dp_refresh', this.onLightDpRefresh.bind(this));
            
            this.log('Listeners Light Tuya configurés');
        } catch (error) {
            this.error('Erreur listeners Light Tuya:', error);
        }
    }

    // Callbacks Light selon Homey SDK
    async onLightData(data) {
        try {
            this.log('Données Light Tuya reçues:', data);
            
            // Traitement des données Light
            if (data['1'] !== undefined) {
                await this.setCapabilityValue('onoff', data['1'] === true);
            }
            if (data['2'] !== undefined && this.hasCapability('dim')) {
                await this.setCapabilityValue('dim', data['2']);
            }
            if (data['3'] !== undefined && this.hasCapability('light_hue')) {
                await this.setCapabilityValue('light_hue', data['3']);
            }
            if (data['4'] !== undefined && this.hasCapability('light_saturation')) {
                await this.setCapabilityValue('light_saturation', data['4']);
            }
            if (data['5'] !== undefined && this.hasCapability('light_temperature')) {
                await this.setCapabilityValue('light_temperature', data['5']);
            }
        } catch (error) {
            this.error('Erreur données Light Tuya:', error);
        }
    }

    async onLightDpRefresh(dp) {
        try {
            this.log('DP refresh Light Tuya:', dp);
            // Traitement spécifique pour Light
        } catch (error) {
            this.error('Erreur DP refresh Light Tuya:', error);
        }
    }

    // Méthodes Light selon Homey SDK
    async onOffSet(onoff) {
        try {
            await this.setData({
                '1': onoff
            });
            this.log(`Light Tuya onOff set: ${onoff}`);
        } catch (error) {
            this.error('Erreur Light Tuya onOff set:', error);
            throw error;
        }
    }

    async dimSet(dim) {
        try {
            if (this.hasCapability('dim')) {
                const level = Math.round(dim);
                await this.setData({
                    '2': level
                });
                this.log(`Light Tuya dim set: ${dim}%`);
            }
        } catch (error) {
            this.error('Erreur Light Tuya dim set:', error);
            throw error;
        }
    }

    async lightHueSet(hue) {
        try {
            if (this.hasCapability('light_hue')) {
                await this.setData({
                    '3': hue
                });
                this.log(`Light Tuya hue set: ${hue}°`);
            }
        } catch (error) {
            this.error('Erreur Light Tuya hue set:', error);
            throw error;
        }
    }

    async lightSaturationSet(saturation) {
        try {
            if (this.hasCapability('light_saturation')) {
                await this.setData({
                    '4': saturation
                });
                this.log(`Light Tuya saturation set: ${saturation}%`);
            }
        } catch (error) {
            this.error('Erreur Light Tuya saturation set:', error);
            throw error;
        }
    }

    async lightTemperatureSet(temperature) {
        try {
            if (this.hasCapability('light_temperature')) {
                await this.setData({
                    '5': temperature
                });
                this.log(`Light Tuya temperature set: ${temperature}K`);
            }
        } catch (error) {
            this.error('Erreur Light Tuya temperature set:', error);
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
        this.log('Light Tuya device uninitialized');
    }
}

module.exports = TuyaLight;