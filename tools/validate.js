#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DriverValidator {
    constructor() {
        this.results = {
            valid: 0,
            invalid: 0,
            errors: []
        };
    }
    
    async validateAllDrivers() {
        console.log('🔍 Validation de tous les drivers...');
        
        // Valider drivers Tuya
        await this.validateTuyaDrivers();
        
        // Valider drivers Zigbee
        await this.validateZigbeeDrivers();
        
        this.generateReport();
    }
    
    async validateTuyaDrivers() {
        const categories = ['controls', 'covers', 'historical', 'lights', 'locks', 'plugs', 'sensors', 'smart-life', 'switches', 'thermostats'];
        
        for (const category of categories) {
            await this.validateCategory('tuya', category);
        }
    }
    
    async validateZigbeeDrivers() {
        const categories = ['onoff', 'dimmers', 'sensors', 'switches', 'buttons'];
        
        for (const category of categories) {
            await this.validateCategory('zigbee', category);
        }
    }
    
    async validateCategory(type, category) {
        const categoryPath = `drivers/${type}/${category}`;
        
        if (!fs.existsSync(categoryPath)) {
            return;
        }
        
        const items = fs.readdirSync(categoryPath);
        
        for (const item of items) {
            await this.validateDriver(type, category, item);
        }
    }
    
    async validateDriver(type, category, driverName) {
        const driverPath = `drivers/${type}/${category}/${driverName}`;
        
        try {
            const requiredFiles = ['device.js', 'driver.compose.json'];
            let isValid = true;
            
            for (const file of requiredFiles) {
                if (!fs.existsSync(path.join(driverPath, file))) {
                    isValid = false;
                    break;
                }
            }
            
            if (isValid) {
                console.log(`✅ ${type}/${category}/${driverName}`);
                this.results.valid++;
            } else {
                console.log(`❌ ${type}/${category}/${driverName}`);
                this.results.invalid++;
            }
        } catch (error) {
            console.log(`❌ ${type}/${category}/${driverName}: ${error.message}`);
            this.results.invalid++;
        }
    }
    
    generateReport() {
        console.log('\n📊 RAPPORT DE VALIDATION');
        console.log(`✅ Drivers valides: ${this.results.valid}`);
        console.log(`❌ Drivers invalides: ${this.results.invalid}`);
        
        fs.writeFileSync('validation-report.json', JSON.stringify(this.results, null, 2));
    }
}

const validator = new DriverValidator();
validator.validateAllDrivers().catch(console.error);
