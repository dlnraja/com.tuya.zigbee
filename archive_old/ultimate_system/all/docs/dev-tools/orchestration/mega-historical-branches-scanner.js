const fs = require('fs');
const path = require('path');
const https = require('https');

class MegaHistoricalBranchesScanner {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..', '..');
        this.repositories = [
            { owner: 'jbendz', repo: 'com.tuya.zigbee', type: 'johan_bendz' },
            { owner: 'dlnraja', repo: 'com.tuya.zigbee', type: 'dlnraja' }
        ];
        this.historicalData = {
            branches: [],
            commits: [],
            drivers: [],
            devices: [],
            manufacturerIds: new Set(),
            productIds: new Set()
        };
        this.categoryEnhancements = {};
    }

    async scanAllBranches() {
        console.log('🔍 Scanning ALL historical branches and versions...');
        
        for (const repo of this.repositories) {
            console.log(`\n📂 Analyzing ${repo.owner}/${repo.repo}...`);
            
            try {
                // Get all branches
                const branches = await this.fetchGitHubBranches(repo.owner, repo.repo);
                console.log(`📊 Found ${branches.length} branches`);
                
                for (const branch of branches) {
                    console.log(`  🌿 Analyzing branch: ${branch.name}`);
                    
                    // Get drivers from this branch
                    const drivers = await this.fetchBranchDrivers(repo.owner, repo.repo, branch.name);
                    
                    // Get commits for this branch
                    const commits = await this.fetchBranchCommits(repo.owner, repo.repo, branch.name);
                    
                    this.historicalData.branches.push({
                        repo: `${repo.owner}/${repo.repo}`,
                        branch: branch.name,
                        drivers: drivers,
                        commits: commits?.slice(0, 50) || [] // Latest 50 commits
                    });
                }
                
                // Wait between repos to avoid rate limiting
                await this.sleep(2000);
                
            } catch (error) {
                console.error(`❌ Error scanning ${repo.owner}/${repo.repo}:`, error.message);
            }
        }
        
        return this.historicalData;
    }
    
    async fetchGitHubBranches(owner, repo) {
        return this.makeGitHubRequest(`/repos/${owner}/${repo}/branches`) || [];
    }
    
    async fetchBranchDrivers(owner, repo, branch) {
        const driversPath = await this.makeGitHubRequest(`/repos/${owner}/${repo}/contents/drivers?ref=${branch}`);
        
        if (!Array.isArray(driversPath)) return [];
        
        const drivers = [];
        
        for (const driver of driversPath) {
            if (driver.type === 'dir') {
                // Get driver configuration
                const driverConfig = await this.makeGitHubRequest(`/repos/${owner}/${repo}/contents/drivers/${driver.name}/driver.compose.json?ref=${branch}`);
                
                if (driverConfig && driverConfig.content) {
                    try {
                        const content = Buffer.from(driverConfig.content, 'base64').toString('utf8');
                        const config = JSON.parse(content);
                        
                        // Extract manufacturer and product IDs
                        if (config.manufacturerId) {
                            config.manufacturerId.forEach(id => this.historicalData.manufacturerIds.add(id));
                        }
                        if (config.productId) {
                            config.productId.forEach(id => this.historicalData.productIds.add(id));
                        }
                        
                        drivers.push({
                            name: driver.name,
                            config: config,
                            branch: branch,
                            repo: `${owner}/${repo}`
                        });
                        
                    } catch (e) {
                        console.log(`    ⚠️  Could not parse ${driver.name}/driver.compose.json`);
                    }
                }
            }
        }
        
        return drivers;
    }
    
    async fetchBranchCommits(owner, repo, branch) {
        return this.makeGitHubRequest(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=50`) || [];
    }
    
    async makeGitHubRequest(path) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'api.github.com',
                path: path,
                headers: { 
                    'User-Agent': 'Ultimate-Zigbee-Hub-Historical-Scanner',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };
            
            const req = https.get(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(null);
                    }
                });
            });
            
            req.on('error', () => resolve(null));
        });
    }
    
    analyzeDriverPatterns() {
        console.log('\n🔍 Analyzing driver patterns across all branches...');
        
        const allDrivers = this.historicalData.branches.flatMap(b => b.drivers);
        const driverStats = {};
        
        allDrivers.forEach(driver => {
            const name = driver.name;
            if (!driverStats[name]) {
                driverStats[name] = {
                    occurrences: 0,
                    branches: new Set(),
                    configs: [],
                    manufacturerIds: new Set(),
                    productIds: new Set()
                };
            }
            
            driverStats[name].occurrences++;
            driverStats[name].branches.add(`${driver.repo}:${driver.branch}`);
            driverStats[name].configs.push(driver.config);
            
            if (driver.config.manufacturerId) {
                driver.config.manufacturerId.forEach(id => driverStats[name].manufacturerIds.add(id));
            }
            if (driver.config.productId) {
                driver.config.productId.forEach(id => driverStats[name].productIds.add(id));
            }
        });
        
        console.log(`📊 Analyzed ${Object.keys(driverStats).length} unique drivers across all branches`);
        return driverStats;
    }
    
    generateEnhancedCategorization() {
        console.log('\n🏗️ Generating enhanced categorization with power type and button count...');
        
        this.categoryEnhancements = {
            // Battery-powered switches by button count
            battery_switches: {
                'wireless_switch_1gang_battery': { buttons: 1, power: 'battery', type: 'CR2032' },
                'wireless_switch_2gang_battery': { buttons: 2, power: 'battery', type: 'CR2032' },
                'wireless_switch_3gang_battery': { buttons: 3, power: 'battery', type: 'CR2032' },
                'wireless_switch_4gang_battery': { buttons: 4, power: 'battery', type: 'CR2032' },
                'wireless_switch_5gang_battery': { buttons: 5, power: 'battery', type: 'CR2032' },
                'wireless_switch_6gang_battery': { buttons: 6, power: 'battery', type: 'CR2032' }
            },
            
            // AC-powered wall switches by button count
            ac_wall_switches: {
                'wall_switch_1gang_ac': { buttons: 1, power: 'ac', voltage: '110-240V' },
                'wall_switch_2gang_ac': { buttons: 2, power: 'ac', voltage: '110-240V' },
                'wall_switch_3gang_ac': { buttons: 3, power: 'ac', voltage: '110-240V' },
                'wall_switch_4gang_ac': { buttons: 4, power: 'ac', voltage: '110-240V' },
                'wall_switch_5gang_ac': { buttons: 5, power: 'ac', voltage: '110-240V' },
                'wall_switch_6gang_ac': { buttons: 6, power: 'ac', voltage: '110-240V' }
            },
            
            // DC-powered switches
            dc_switches: {
                'wall_switch_1gang_dc': { buttons: 1, power: 'dc', voltage: '12-24V' },
                'wall_switch_2gang_dc': { buttons: 2, power: 'dc', voltage: '12-24V' },
                'wall_switch_3gang_dc': { buttons: 3, power: 'dc', voltage: '12-24V' },
                'wall_switch_4gang_dc': { buttons: 4, power: 'dc', voltage: '12-24V' }
            },
            
            // Hybrid/flexible switches
            hybrid_switches: {
                'smart_switch_1gang_hybrid': { buttons: 1, power: 'hybrid', voltage: 'AC/DC/Battery' },
                'smart_switch_2gang_hybrid': { buttons: 2, power: 'hybrid', voltage: 'AC/DC/Battery' },
                'smart_switch_3gang_hybrid': { buttons: 3, power: 'hybrid', voltage: 'AC/DC/Battery' },
                'smart_switch_4gang_hybrid': { buttons: 4, power: 'hybrid', voltage: 'AC/DC/Battery' }
            },
            
            // Scene controllers by button count
            scene_controllers: {
                'scene_controller_2button': { buttons: 2, power: 'battery', type: 'CR2032' },
                'scene_controller_4button': { buttons: 4, power: 'battery', type: 'CR2032' },
                'scene_controller_6button': { buttons: 6, power: 'battery', type: 'CR2032' },
                'scene_controller_8button': { buttons: 8, power: 'battery', type: 'CR2032' }
            },
            
            // Touch switches by gang count
            touch_switches: {
                'touch_switch_1gang': { buttons: 1, power: 'ac', interface: 'capacitive' },
                'touch_switch_2gang': { buttons: 2, power: 'ac', interface: 'capacitive' },
                'touch_switch_3gang': { buttons: 3, power: 'ac', interface: 'capacitive' },
                'touch_switch_4gang': { buttons: 4, power: 'ac', interface: 'capacitive' }
            },
            
            // Motion sensors by detection type
            motion_sensors: {
                'motion_sensor_pir_battery': { type: 'PIR', power: 'battery', range: '8m' },
                'motion_sensor_radar_battery': { type: 'radar', power: 'battery', range: '12m' },
                'motion_sensor_mmwave_battery': { type: 'mmWave', power: 'battery', range: '15m' },
                'motion_sensor_pir_ac': { type: 'PIR', power: 'ac', range: '12m' },
                'motion_sensor_radar_ac': { type: 'radar', power: 'ac', range: '20m' }
            }
        };
        
        return this.categoryEnhancements;
    }
    
    async createMissingDrivers() {
        console.log('\n🔧 Creating missing drivers based on enhanced categorization...');
        
        const createdDrivers = [];
        
        for (const [category, drivers] of Object.entries(this.categoryEnhancements)) {
            console.log(`\n📁 Creating ${category} drivers...`);
            
            for (const [driverName, specs] of Object.entries(drivers)) {
                const driverPath = path.join(this.projectRoot, 'drivers', driverName);
                
                if (!fs.existsSync(driverPath)) {
                    try {
                        await this.createEnhancedDriver(driverName, specs, category);
                        createdDrivers.push({ name: driverName, specs, category });
                        console.log(`  ✅ Created: ${driverName}`);
                    } catch (error) {
                        console.error(`  ❌ Failed: ${driverName} - ${error.message}`);
                    }
                } else {
                    console.log(`  ⚡ Exists: ${driverName}`);
                }
            }
        }
        
        return createdDrivers;
    }
    
    async createEnhancedDriver(driverName, specs, category) {
        const driverPath = path.join(this.projectRoot, 'drivers', driverName);
        
        fs.mkdirSync(driverPath, { recursive: true });
        fs.mkdirSync(path.join(driverPath, 'assets'), { recursive: true });
        fs.mkdirSync(path.join(driverPath, 'pair'), { recursive: true });
        
        // Generate enhanced driver configuration
        const driverConfig = {
            id: driverName,
            class: this.getDriverClass(category, specs),
            capabilities: this.getEnhancedCapabilities(specs),
            energy: this.getEnhancedEnergyConfig(specs),
            zigbee: {
                manufacturerId: [],
                productId: [],
                endpoints: {
                    "1": {
                        clusters: this.getEnhancedClusters(specs, category),
                        bindings: this.getEnhancedBindings(specs, category)
                    }
                },
                learnmode: {
                    image: `/drivers/${driverName}/assets/learn.svg`,
                    instruction: this.getLearnInstructions(specs)
                }
            },
            images: {
                small: `/drivers/${driverName}/assets/small.png`,
                large: `/drivers/${driverName}/assets/large.png`
            },
            settings: this.getEnhancedSettings(specs)
        };
        
        // Write driver configuration
        fs.writeFileSync(
            path.join(driverPath, 'driver.compose.json'),
            JSON.stringify(driverConfig, null, 2)
        );
        
        // Generate enhanced device.js
        const deviceJs = this.generateEnhancedDeviceJs(driverName, specs, category);
        fs.writeFileSync(path.join(driverPath, 'device.js'), deviceJs);
    }
    
    getDriverClass(category, specs) {
        if (category.includes('switches') || category.includes('controllers')) {
            return specs.power === 'battery' ? 'button' : 'light';
        }
        if (category.includes('motion')) return 'sensor';
        return 'sensor';
    }
    
    getEnhancedCapabilities(specs) {
        const caps = [];
        
        if (specs.buttons) {
            caps.push('onoff');
            if (specs.buttons > 1) {
                for (let i = 2; i <= specs.buttons; i++) {
                    caps.push(`button.${i}`);
                }
            }
        }
        
        if (specs.power === 'battery') {
            caps.push('measure_battery', 'alarm_battery');
        }
        
        if (specs.type === 'PIR' || specs.type === 'radar' || specs.type === 'mmWave') {
            caps.push('alarm_motion');
        }
        
        return caps;
    }
    
    getEnhancedEnergyConfig(specs) {
        if (specs.power === 'battery') {
            const batteryTypes = specs.type === 'CR2032' ? ['CR2032'] : ['CR2032', 'CR2450', 'AA'];
            return { batteries: batteryTypes };
        }
        return undefined;
    }
    
    getEnhancedClusters(specs, category) {
        const clusters = [0, 3]; // Basic, Identify
        
        if (specs.power === 'battery') clusters.push(1); // Power Configuration
        if (specs.buttons) clusters.push(6); // OnOff
        if (specs.buttons && specs.power !== 'battery') clusters.push(8); // Level Control
        if (specs.type === 'PIR' || specs.type === 'radar' || specs.type === 'mmWave') {
            clusters.push(1030); // Occupancy Sensing
        }
        
        return clusters;
    }
    
    getEnhancedBindings(specs, category) {
        const bindings = [];
        
        if (specs.power === 'battery') bindings.push(1); // Power Configuration
        if (specs.buttons) bindings.push(6); // OnOff
        if (specs.buttons && specs.power !== 'battery') bindings.push(8); // Level Control
        
        return bindings;
    }
    
    getLearnInstructions(specs) {
        const batteryInstr = {
            en: `Press and hold the button for 5 seconds until LED flashes`,
            fr: `Appuyez et maintenez le bouton pendant 5 secondes jusqu'à ce que la LED clignote`,
            nl: `Houd de knop 5 seconden ingedrukt totdat de LED knippert`,
            de: `Halten Sie die Taste 5 Sekunden lang gedrückt, bis die LED blinkt`
        };
        
        const acInstr = {
            en: `Turn the switch on/off 3 times quickly`,
            fr: `Allumez/éteignez l'interrupteur 3 fois rapidement`,
            nl: `Schakel de schakelaar 3 keer snel aan/uit`,
            de: `Schalten Sie den Schalter 3 Mal schnell ein/aus`
        };
        
        return specs.power === 'battery' ? batteryInstr : acInstr;
    }
    
    getEnhancedSettings(specs) {
        const settings = [];
        
        if (specs.power === 'battery') {
            settings.push({
                id: 'battery_threshold',
                type: 'number',
                label: { en: 'Low Battery Threshold (%)', fr: 'Seuil de batterie faible (%)' },
                value: 20,
                min: 5,
                max: 50
            });
        }
        
        if (specs.type === 'PIR' || specs.type === 'radar' || specs.type === 'mmWave') {
            settings.push({
                id: 'motion_sensitivity',
                type: 'dropdown',
                label: { en: 'Motion Sensitivity', fr: 'Sensibilité de mouvement' },
                value: 'medium',
                values: [
                    { id: 'low', label: { en: 'Low', fr: 'Faible' } },
                    { id: 'medium', label: { en: 'Medium', fr: 'Moyen' } },
                    { id: 'high', label: { en: 'High', fr: 'Élevé' } }
                ]
            });
        }
        
        return settings;
    }
    
    generateEnhancedDeviceJs(driverName, specs, category) {
        const className = this.toPascalCase(driverName);
        
        return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className}Device extends ZigBeeDevice {
    
    async onNodeInit() {
        this.log('${driverName} device initialized - ${specs.buttons || 1} button(s), ${specs.power} powered');
        
        await this.registerEnhancedCapabilities();
        await this.setupEnhancedListeners();
        
        // Device specifications
        this.specs = ${JSON.stringify(specs, null, 8)};
    }
    
    async registerEnhancedCapabilities() {
        // OnOff capability for main button
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 'genOnOff');
        }
        
        // Additional buttons for multi-gang switches
        ${specs.buttons > 1 ? `
        for (let i = 2; i <= ${specs.buttons}; i++) {
            if (this.hasCapability(\`button.\${i}\`)) {
                this.registerCapability(\`button.\${i}\`, 'genOnOff', {
                    endpoint: i
                });
            }
        }` : ''}
        
        // Battery capabilities for battery-powered devices
        ${specs.power === 'battery' ? `
        if (this.hasCapability('measure_battery')) {
            this.registerCapability('measure_battery', 'genPowerCfg', {
                reportOpts: {
                    configureAttributeReporting: {
                        minInterval: 0,
                        maxInterval: 3600,
                        minChange: 1
                    }
                }
            });
        }
        
        if (this.hasCapability('alarm_battery')) {
            this.registerCapability('alarm_battery', 'genPowerCfg');
        }` : ''}
        
        // Motion sensing capabilities
        ${specs.type === 'PIR' || specs.type === 'radar' || specs.type === 'mmWave' ? `
        if (this.hasCapability('alarm_motion')) {
            this.registerCapability('alarm_motion', 'msOccupancySensing');
        }` : ''}
    }
    
    async setupEnhancedListeners() {
        // Battery level monitoring
        ${specs.power === 'battery' ? `
        this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', 
            this.onBatteryPercentageRemainingAttributeReport.bind(this), 1);` : ''}
        
        // Motion detection
        ${specs.type === 'PIR' || specs.type === 'radar' || specs.type === 'mmWave' ? `
        this.registerAttrReportListener('msOccupancySensing', 'occupancy',
            this.onOccupancyAttributeReport.bind(this), 1);` : ''}
    }
    
    ${specs.power === 'battery' ? `
    onBatteryPercentageRemainingAttributeReport(value) {
        const batteryThreshold = this.getSetting('battery_threshold') || 20;
        const batteryPercentage = Math.max(0, Math.min(100, Math.round(value / 2)));
        
        this.setCapabilityValue('measure_battery', batteryPercentage);
        this.setCapabilityValue('alarm_battery', batteryPercentage <= batteryThreshold);
        
        this.log('Battery level:', batteryPercentage + '%');
    }` : ''}
    
    ${specs.type === 'PIR' || specs.type === 'radar' || specs.type === 'mmWave' ? `
    onOccupancyAttributeReport(value) {
        const motionDetected = (value & 1) === 1;
        this.setCapabilityValue('alarm_motion', motionDetected);
        
        this.log('Motion detected:', motionDetected);
    }` : ''}
}

module.exports = ${className}Device;`;
    }
    
    toPascalCase(str) {
        return str.replace(/(^|_)([a-z])/g, (match, prefix, letter) => letter.toUpperCase());
    }
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async generateComprehensiveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            scan_summary: {
                repositories_scanned: this.repositories.length,
                total_branches: this.historicalData.branches.length,
                total_drivers_found: this.historicalData.branches.flatMap(b => b.drivers).length,
                unique_manufacturer_ids: this.historicalData.manufacturerIds.size,
                unique_product_ids: this.historicalData.productIds.size
            },
            enhanced_categorization: this.categoryEnhancements,
            historical_data: this.historicalData,
            driver_patterns: this.analyzeDriverPatterns()
        };
        
        const reportPath = path.join(this.projectRoot, 'project-data', 'analysis-results', 'mega-historical-scan-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 MEGA HISTORICAL SCAN REPORT:');
        console.log(`🔍 Repositories scanned: ${report.scan_summary.repositories_scanned}`);
        console.log(`🌿 Total branches analyzed: ${report.scan_summary.total_branches}`);
        console.log(`🚗 Total drivers discovered: ${report.scan_summary.total_drivers_found}`);
        console.log(`🏭 Unique manufacturer IDs: ${report.scan_summary.unique_manufacturer_ids}`);
        console.log(`📦 Unique product IDs: ${report.scan_summary.unique_product_ids}`);
        
        return report;
    }
    
    async run() {
        console.log('🚀 Starting MEGA historical branches scanner...');
        console.log('📋 Scanning ALL branches from Johan Bendz AND dlnraja repositories...');
        
        await this.scanAllBranches();
        this.analyzeDriverPatterns();
        this.generateEnhancedCategorization();
        await this.createMissingDrivers();
        
        const report = await this.generateComprehensiveReport();
        
        console.log('\n✅ MEGA HISTORICAL SCAN COMPLETE!');
        return report;
    }
}

if (require.main === module) {
    const scanner = new MegaHistoricalBranchesScanner();
    scanner.run().catch(console.error);
}

module.exports = MegaHistoricalBranchesScanner;
