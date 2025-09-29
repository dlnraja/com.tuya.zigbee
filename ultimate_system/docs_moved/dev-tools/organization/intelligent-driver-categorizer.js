#!/usr/bin/env node

/**
 * Intelligent Driver Categorizer
 * Categorizes drivers by buttons (1-6+), power source (AC/DC/Battery)
 * Creates unbranded categories with proper naming conventions
 */

const fs = require('fs-extra');
const path = require('path');

class IntelligentDriverCategorizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.categories = new Map();
        
        console.log('🎯 Intelligent Driver Categorizer');
        console.log('📊 Categorizing by buttons/power source with unbranded naming');
    }

    async run() {
        console.log('\n🚀 Starting intelligent categorization...');
        
        try {
            await this.analyzeCurrentDrivers();
            await this.createIntelligentCategories();
            await this.reorganizeDrivers();
            await this.generateCategoryReport();
            
            console.log('✅ Intelligent categorization completed!');
            return this.categories;
            
        } catch (error) {
            console.error('❌ Error during categorization:', error);
            throw error;
        }
    }

    async analyzeCurrentDrivers() {
        console.log('📂 Analyzing current drivers...');
        
        const drivers = await fs.readdir(this.driversPath);
        
        for (const driverName of drivers) {
            const driverPath = path.join(this.driversPath, driverName);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                const category = this.categorizeDriver(driverName);
                if (!this.categories.has(category)) {
                    this.categories.set(category, []);
                }
                this.categories.get(category).push(driverName);
            }
        }
        
        console.log(`📊 Analyzed ${drivers.length} drivers into ${this.categories.size} categories`);
    }

    categorizeDriver(driverName) {
        const name = driverName.toLowerCase();
        
        // Switch categories by gang count and power
        if (name.includes('switch') || name.includes('relay')) {
            if (name.includes('1gang') || name.includes('_1_')) return 'wall_switch_1gang_ac';
            if (name.includes('2gang') || name.includes('_2_')) return 'wall_switch_2gang_ac';
            if (name.includes('3gang') || name.includes('_3_')) return 'wall_switch_3gang_ac';
            if (name.includes('4gang') || name.includes('_4_')) return 'wall_switch_4gang_ac';
            if (name.includes('5gang') || name.includes('_5_')) return 'wall_switch_5gang_ac';
            if (name.includes('6gang') || name.includes('_6_')) return 'wall_switch_6gang_ac';
            
            if (name.includes('dc')) return 'wall_switch_1gang_dc';
            if (name.includes('wireless') || name.includes('battery') || name.includes('cr2032')) {
                return 'wireless_switch_1gang_cr2032';
            }
            return 'smart_switch_generic';
        }
        
        // Remote/Scene controllers by button count
        if (name.includes('remote') || name.includes('scene') || name.includes('button')) {
            if (name.includes('2') || name.includes('two')) return 'scene_controller_2button';
            if (name.includes('4') || name.includes('four')) return 'scene_controller_4button';
            if (name.includes('6') || name.includes('six')) return 'scene_controller_6button';
            if (name.includes('8') || name.includes('eight')) return 'scene_controller_8button';
            if (name.includes('battery') || name.includes('cr2032')) return 'scene_controller_battery';
            return 'scene_controller_generic';
        }
        
        // Sensor categories by power source
        if (name.includes('sensor') || name.includes('detector')) {
            if (name.includes('motion') || name.includes('pir')) {
                if (name.includes('battery')) return 'motion_sensor_pir_battery';
                if (name.includes('ac')) return 'motion_sensor_pir_ac';
                if (name.includes('mmwave') || name.includes('radar')) return 'motion_sensor_radar_ac';
                return 'motion_sensor_generic';
            }
            
            if (name.includes('temperature') && name.includes('humidity')) return 'temperature_humidity_sensor';
            if (name.includes('temperature')) return 'temperature_sensor';
            if (name.includes('door') || name.includes('window')) return 'door_window_sensor';
            if (name.includes('water') || name.includes('leak')) return 'water_leak_sensor';
            if (name.includes('smoke')) return 'smoke_detector';
            if (name.includes('gas')) return 'gas_detector';
            if (name.includes('co2')) return 'co2_sensor';
            if (name.includes('air_quality') || name.includes('pm25')) return 'air_quality_sensor';
            return 'sensor_generic';
        }
        
        // Light categories
        if (name.includes('light') || name.includes('bulb') || name.includes('led')) {
            if (name.includes('rgb')) return 'smart_bulb_rgb';
            if (name.includes('tunable') || name.includes('temperature')) return 'smart_bulb_tunable';
            if (name.includes('white') || name.includes('dimmable')) return 'smart_bulb_white';
            if (name.includes('strip')) return 'led_strip_controller';
            if (name.includes('ceiling')) return 'ceiling_light_controller';
            if (name.includes('outdoor')) return 'outdoor_light_controller';
            if (name.includes('spot')) return 'smart_spot';
            return 'lighting_generic';
        }
        
        // Cover/Blind categories
        if (name.includes('curtain') || name.includes('blind') || name.includes('cover') || name.includes('shade')) {
            if (name.includes('roller')) return 'roller_blind_controller';
            if (name.includes('venetian')) return 'venetian_blind_controller';
            if (name.includes('curtain')) return 'curtain_motor';
            if (name.includes('shade')) return 'shade_controller';
            if (name.includes('projector')) return 'projector_screen_controller';
            return 'covers_generic';
        }
        
        // Climate categories
        if (name.includes('thermostat') || name.includes('climate') || name.includes('temperature_controller')) {
            if (name.includes('radiator') || name.includes('valve')) return 'radiator_valve';
            if (name.includes('hvac') || name.includes('air_conditioner')) return 'hvac_controller';
            if (name.includes('fan')) return 'fan_controller';
            return 'thermostat';
        }
        
        // Security categories
        if (name.includes('lock') || name.includes('door_controller')) {
            if (name.includes('keypad')) return 'keypad_lock';
            if (name.includes('fingerprint')) return 'fingerprint_lock';
            if (name.includes('door_controller')) return 'door_controller';
            return 'smart_lock';
        }
        
        // Power/Plug categories
        if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) {
            if (name.includes('energy') || name.includes('monitoring')) return 'energy_monitoring_plug';
            if (name.includes('extension')) return 'extension_plug';
            if (name.includes('usb')) return 'usb_outlet';
            return 'smart_plug';
        }
        
        // Generic fallback
        return 'uncategorized';
    }

    async createIntelligentCategories() {
        console.log('🎯 Creating intelligent category structure...');
        
        const categoryMap = new Map();
        
        // Define intelligent category mappings
        this.categories.forEach((drivers, category) => {
            const newCategoryName = this.getIntelligentCategoryName(category);
            if (!categoryMap.has(newCategoryName)) {
                categoryMap.set(newCategoryName, []);
            }
            categoryMap.get(newCategoryName).push(...drivers);
        });
        
        this.categories = categoryMap;
        console.log(`🎯 Created ${this.categories.size} intelligent categories`);
    }

    getIntelligentCategoryName(category) {
        // Map to proper unbranded naming
        const categoryMappings = {
            'smart_switch_generic': 'wall_switch_1gang_ac',
            'sensor_generic': 'multisensor',
            'lighting_generic': 'smart_bulb_white',
            'covers_generic': 'curtain_motor',
            'scene_controller_generic': 'scene_controller_4button',
            'uncategorized': 'generic_device'
        };
        
        return categoryMappings[category] || category;
    }

    async reorganizeDrivers() {
        console.log('📁 Reorganizing drivers by intelligent categories...');
        
        // This would reorganize actual files if needed
        // For now, just log the organization
        this.categories.forEach((drivers, categoryName) => {
            console.log(`  📂 ${categoryName}: ${drivers.length} drivers`);
            drivers.forEach(driver => console.log(`    - ${driver}`));
        });
    }

    async generateCategoryReport() {
        const reportPath = path.join(this.projectRoot, 'project-data', 'analysis-results', 'intelligent-categorization-report.json');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total_categories: this.categories.size,
                total_drivers: Array.from(this.categories.values()).flat().length,
                categorization_strategy: 'buttons_power_source_type'
            },
            categories: Object.fromEntries(this.categories),
            recommendations: this.generateRecommendations()
        };
        
        await fs.ensureDir(path.dirname(reportPath));
        await fs.writeJson(reportPath, report, { spaces: 2 });
        
        console.log(`📄 Category report saved: ${reportPath}`);
        return report;
    }

    generateRecommendations() {
        return [
            'Separate wireless switches by button count (1-6)',
            'Distinguish AC/DC power sources',
            'Group sensors by detection type and power',
            'Create specific categories for multi-gang switches',
            'Maintain unbranded naming for maximum compatibility'
        ];
    }
}

if (require.main === module) {
    const categorizer = new IntelligentDriverCategorizer();
    categorizer.run().catch(console.error);
}

module.exports = IntelligentDriverCategorizer;
