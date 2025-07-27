const fs = require('fs');
const path = require('path');

class TemplateGenerator {
    constructor() {
        this.templates = this.loadTemplates();
    }

    loadTemplates() {
        return {
            'basic-switch': {
                name: 'Basic Switch',
                template: `
class BasicSwitch extends HomeyDevice {
    async onInit() {
        this.registerCapability('onoff', 'CLUSTER_ON_OFF');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        // Handle settings changes
    }
}`
            },
            'dimmable-light': {
                name: 'Dimmable Light',
                template: `
class DimmableLight extends HomeyDevice {
    async onInit() {
        this.registerCapability('onoff', 'CLUSTER_ON_OFF');
        this.registerCapability('dim', 'CLUSTER_LEVEL_CONTROL');
    }
}`
            },
            'color-light': {
                name: 'Color Light',
                template: `
class ColorLight extends HomeyDevice {
    async onInit() {
        this.registerCapability('onoff', 'CLUSTER_ON_OFF');
        this.registerCapability('dim', 'CLUSTER_LEVEL_CONTROL');
        this.registerCapability('light_hue', 'CLUSTER_COLOR_CONTROL');
        this.registerCapability('light_saturation', 'CLUSTER_COLOR_CONTROL');
    }
}`
            }
        };
    }

    generateTemplate(deviceType, deviceData) {
        const template = this.templates[deviceType];
        if (!template) {
            throw new Error(`Unknown device type: ${deviceType}`);
        }

        const fileName = `${deviceData.modelId || 'unknown'}.js`;
        const filePath = path.join(__dirname, '../drivers', fileName);
        
        fs.writeFileSync(filePath, template.template);
        console.log(`Generated template: ${fileName}`);
        
        return filePath;
    }
}

module.exports = TemplateGenerator;
