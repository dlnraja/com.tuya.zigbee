#!/usr/bin/env node
/**
 * Comprehensive Driver Generator - Creates SDK3 compliant drivers with forum data
 */
const fs = require('fs-extra');
const path = require('path');

class ComprehensiveDriverGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        this.forumData = this.loadForumData();
        this.generatedDrivers = [];
    }

    loadForumData() {
        // Community-sourced manufacturer IDs from forum analysis
        return {
            motion_sensor: {
                manufacturerName: ["TZ3000_mmtwjmaq", "TZ3000_kmh5qpmb", "TZ3000_6ygjfyll", "TZ3000_bsvqrxru"],
                productId: ["TS0202", "PIR-M"],
                clusters: [0, 1, 3, 1280]
            },
            contact_sensor: {
                manufacturerName: ["TZ3000_ebar6ljy", "TZ3000_2mbfxlzr", "TZ3000_4uf3d0ax"],
                productId: ["TS0203", "MC500A"],
                clusters: [0, 1, 3, 1280]
            },
            temperature_humidity_sensor: {
                manufacturerName: ["TZ3000_fllyghyj", "TZ3000_dowj6gyi", "TZ3000_xr3htd96"],
                productId: ["TS0201", "TH02"],
                clusters: [0, 1, 3, 1026, 1029]
            },
            smart_plug: {
                manufacturerName: ["TZ3000_3ooaz3ng", "TZ3000_g5xawfcq", "TZ3000_typdpbpg"],
                productId: ["TS0121", "SP600"],
                clusters: [0, 3, 6, 2820]
            },
            smart_bulb: {
                manufacturerName: ["TZ3000_dbou1ap4", "TZ3000_49qchf10", "TZ3000_g1glzzfk"],
                productId: ["TS0505B", "TS0502B"],
                clusters: [0, 3, 6, 8, 768]
            }
        };
    }

    async generateAllDrivers() {
        console.log('🔧 Generating comprehensive SDK3 drivers...');
        
        const driversDir = path.join(this.projectRoot, 'drivers');
        const categories = await fs.readdir(driversDir);
        
        for (const category of categories) {
            const categoryPath = path.join(driversDir, category);
            const stat = await fs.stat(categoryPath);
            if (!stat.isDirectory()) continue;
            
            const drivers = await fs.readdir(categoryPath);
            for (const driver of drivers) {
                const driverPath = path.join(categoryPath, driver);
                const driverStat = await fs.stat(driverPath);
                if (!driverStat.isDirectory()) continue;
                
                await this.generateDriverFiles(category, driver, driverPath);
            }
        }
        
        console.log(`✅ Generated ${this.generatedDrivers.length} drivers`);
        return this.generatedDrivers;
    }

    async generateDriverFiles(category, driverName, driverPath) {
        await this.generateDriverCompose(category, driverName, driverPath);
        await this.generateDeviceJS(category, driverName, driverPath);
        
        this.generatedDrivers.push({
            category,
            name: driverName,
            path: driverPath
        });
        
        console.log(`   ✅ Generated ${category}/${driverName}`);
    }

    async generateDriverCompose(category, driverName, driverPath) {
        const forumData = this.forumData[driverName] || this.getDefaultDriverData(category, driverName);
        
        const compose = {
            name: {
                en: driverName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            },
            class: this.getDriverClass(category, driverName),
            capabilities: this.getDriverCapabilities(category, driverName),
            zigbee: {
                manufacturerName: forumData.manufacturerName,
                productId: forumData.productId,
                endpoints: {
                    "1": {
                        clusters: forumData.clusters
                    }
                }
            },
            images: {
                small: `/drivers/${category}/${driverName}/assets/small.png`,
                large: `/drivers/${category}/${driverName}/assets/large.png`,
                xlarge: `/drivers/${category}/${driverName}/assets/xlarge.png`
            }
        };

        if (this.needsBatteryConfig(category, driverName)) {
            compose.energy = { batteries: ["CR2032", "AA"] };
        }

        await fs.writeJson(path.join(driverPath, 'driver.compose.json'), compose, { spaces: 2 });
    }

    async generateDeviceJS(category, driverName, driverPath) {
        const deviceJS = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${this.toPascalCase(driverName)}Device extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

        ${this.generateCapabilityRegistrations(category, driverName)}

        this.log('${driverName} device initialized');
    }

    ${this.generateCapabilityMethods(category, driverName)}
}

module.exports = ${this.toPascalCase(driverName)}Device;
`;

        await fs.writeFile(path.join(driverPath, 'device.js'), deviceJS);
    }

    getDefaultDriverData(category, driverName) {
        const baseClusters = [0, 3]; // basic, identify
        
        if (category === 'sensors') {
            return {
                manufacturerName: ["TZ3000_generic", "TZ3000_sensor"],
                productId: ["TS0001", "SENSOR"],
                clusters: [...baseClusters, 1, 1280] // powerConfiguration, iasZone
            };
        } else if (category === 'lights') {
            return {
                manufacturerName: ["TZ3000_light", "TZ3000_bulb"],
                productId: ["TS0505", "LIGHT"],
                clusters: [...baseClusters, 6, 8, 768] // onOff, levelControl, colorControl
            };
        } else if (category === 'switches') {
            return {
                manufacturerName: ["TZ3000_switch", "TZ3000_button"],
                productId: ["TS0043", "SWITCH"],
                clusters: [...baseClusters, 6] // onOff
            };
        } else if (category === 'plugs') {
            return {
                manufacturerName: ["TZ3000_plug", "TZ3000_outlet"],
                productId: ["TS0121", "PLUG"],
                clusters: [...baseClusters, 6, 2820] // onOff, electricalMeasurement
            };
        }
        
        return {
            manufacturerName: ["TZ3000_generic"],
            productId: ["TS0001"],
            clusters: baseClusters
        };
    }

    getDriverClass(category, driverName) {
        if (category === 'lights') return 'light';
        if (category === 'plugs') return 'socket';
        if (category === 'switches' && driverName.includes('button')) return 'button';
        return 'sensor';
    }

    getDriverCapabilities(category, driverName) {
        const capabilities = [];
        
        if (category === 'sensors') {
            if (driverName.includes('motion') || driverName.includes('pir')) capabilities.push('alarm_motion');
            if (driverName.includes('contact') || driverName.includes('door') || driverName.includes('window')) capabilities.push('alarm_contact');
            if (driverName.includes('temperature')) capabilities.push('measure_temperature');
            if (driverName.includes('humidity')) capabilities.push('measure_humidity');
            capabilities.push('measure_battery');
        } else if (category === 'lights') {
            capabilities.push('onoff', 'dim');
            if (driverName.includes('rgb') || driverName.includes('color')) capabilities.push('light_hue', 'light_saturation');
        } else if (category === 'switches') {
            capabilities.push('onoff');
            if (driverName.includes('button')) capabilities.push('measure_battery');
        } else if (category === 'plugs') {
            capabilities.push('onoff', 'measure_power');
        }
        
        return capabilities;
    }

    needsBatteryConfig(category, driverName) {
        return category === 'sensors' || 
               (category === 'switches' && driverName.includes('button')) ||
               category === 'safety' ||
               category === 'access';
    }

    generateCapabilityRegistrations(category, driverName) {
        const capabilities = this.getDriverCapabilities(category, driverName);
        return capabilities.map(cap => {
            if (cap === 'alarm_motion') return `        this.registerCapability('alarm_motion', 1280);`;
            if (cap === 'alarm_contact') return `        this.registerCapability('alarm_contact', 1280);`;
            if (cap === 'measure_temperature') return `        this.registerCapability('measure_temperature', 1026);`;
            if (cap === 'measure_humidity') return `        this.registerCapability('measure_humidity', 1029);`;
            if (cap === 'measure_battery') return `        this.registerCapability('measure_battery', 1);`;
            if (cap === 'onoff') return `        this.registerCapability('onoff', 6);`;
            if (cap === 'dim') return `        this.registerCapability('dim', 8);`;
            if (cap === 'measure_power') return `        this.registerCapability('measure_power', 2820);`;
            return `        // ${cap} capability registration`;
        }).join('\n');
    }

    generateCapabilityMethods(category, driverName) {
        // Generate basic capability methods
        return `
    onCapabilityOnOff(value) {
        return this.zclNode.endpoints[1].clusters.onOff.setOn(value);
    }

    onCapabilityDim(value) {
        return this.zclNode.endpoints[1].clusters.levelControl.moveToLevel({
            level: Math.round(value * 254),
            transitionTime: 1
        });
    }`;
    }

    toPascalCase(str) {
        return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/\s/g, '');
    }
}

if (require.main === module) {
    const generator = new ComprehensiveDriverGenerator();
    generator.generateAllDrivers().catch(console.error);
}

module.exports = ComprehensiveDriverGenerator;
