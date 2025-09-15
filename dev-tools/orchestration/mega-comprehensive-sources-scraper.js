const fs = require('fs');
const path = require('path');
const https = require('https');

class MegaComprehensiveSourcesScraper {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..', '..');
        this.sources = {
            github_repos: [
                { owner: 'jbendz', repo: 'com.tuya.zigbee', type: 'johan_bendz_main' },
                { owner: 'dlnraja', repo: 'com.tuya.zigbee', type: 'dlnraja_fork' },
                { owner: 'Koenkk', repo: 'zigbee2mqtt', type: 'zigbee2mqtt' },
                { owner: 'Koenkk', repo: 'zigbee-herdsman-converters', type: 'z2m_converters' },
                { owner: 'blakadder', repo: 'zigbee', type: 'blakadder_db' },
                { owner: 'zigpy', repo: 'zha-device-handlers', type: 'zha_handlers' }
            ],
            forums: [
                'https://community.homey.app/t/tuya-zigbee-app/44207',
                'https://community.zigbee2mqtt.io',
                'https://community.home-assistant.io/c/zha'
            ]
        };
        
        this.scraped_data = {
            issues: [],
            pull_requests: [],
            device_configs: [],
            manufacturer_ids: new Set(),
            product_ids: new Set(),
            device_mappings: {},
            forum_discussions: []
        };
        
        this.rate_limit_delay = 1000; // 1 second between requests
    }
    
    async scrapeAllGitHubSources() {
        console.log('Starting comprehensive GitHub sources scraping...');
        
        for (const repo of this.sources.github_repos) {
            console.log(`\nScraping ${repo.owner}/${repo.repo} (${repo.type})...`);
            
            try {
                // Get all issues
                const issues = await this.fetchAllIssues(repo.owner, repo.repo);
                console.log(`  Found ${issues.length} issues`);
                
                // Get all pull requests
                const pullRequests = await this.fetchAllPullRequests(repo.owner, repo.repo);
                console.log(`  Found ${pullRequests.length} pull requests`);
                
                // Get device configurations if available
                const deviceConfigs = await this.fetchDeviceConfigurations(repo.owner, repo.repo);
                console.log(`  Found ${deviceConfigs.length} device configurations`);
                
                // Store data with source attribution
                this.scraped_data.issues.push(...issues.map(issue => ({
                    ...issue,
                    source: `${repo.owner}/${repo.repo}`,
                    source_type: repo.type
                })));
                
                this.scraped_data.pull_requests.push(...pullRequests.map(pr => ({
                    ...pr,
                    source: `${repo.owner}/${repo.repo}`,
                    source_type: repo.type
                })));
                
                this.scraped_data.device_configs.push(...deviceConfigs.map(config => ({
                    ...config,
                    source: `${repo.owner}/${repo.repo}`,
                    source_type: repo.type
                })));
                
                await this.sleep(this.rate_limit_delay);
                
            } catch (error) {
                console.error(`Error scraping ${repo.owner}/${repo.repo}:`, error.message);
            }
        }
        
        return this.scraped_data;
    }
    
    async fetchAllIssues(owner, repo) {
        const issues = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore && page <= 10) { // Limit to 10 pages to avoid excessive requests
            const pageIssues = await this.makeGitHubRequest(
                `/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`
            );
            
            if (pageIssues && pageIssues.length > 0) {
                issues.push(...pageIssues);
                page++;
                await this.sleep(this.rate_limit_delay);
            } else {
                hasMore = false;
            }
        }
        
        return issues;
    }
    
    async fetchAllPullRequests(owner, repo) {
        const pullRequests = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore && page <= 10) {
            const pagePRs = await this.makeGitHubRequest(
                `/repos/${owner}/${repo}/pulls?state=all&per_page=100&page=${page}`
            );
            
            if (pagePRs && pagePRs.length > 0) {
                pullRequests.push(...pagePRs);
                page++;
                await this.sleep(this.rate_limit_delay);
            } else {
                hasMore = false;
            }
        }
        
        return pullRequests;
    }
    
    async fetchDeviceConfigurations(owner, repo) {
        const configs = [];
        
        try {
            // Try to fetch drivers directory
            const driversContent = await this.makeGitHubRequest(
                `/repos/${owner}/${repo}/contents/drivers`
            );
            
            if (Array.isArray(driversContent)) {
                for (const driver of driversContent.slice(0, 50)) { // Limit to avoid excessive requests
                    if (driver.type === 'dir') {
                        const driverConfig = await this.fetchDriverConfig(owner, repo, driver.name);
                        if (driverConfig) {
                            configs.push({
                                driver_name: driver.name,
                                config: driverConfig
                            });
                        }
                        await this.sleep(this.rate_limit_delay / 2);
                    }
                }
            }
            
            // Try to fetch device database files (for Zigbee2MQTT style repos)
            if (repo.includes('zigbee') || repo.includes('z2m')) {
                const deviceFiles = await this.fetchZigbee2MQTTDevices(owner, repo);
                configs.push(...deviceFiles);
            }
            
        } catch (error) {
            console.log(`  Could not fetch device configs from ${owner}/${repo}`);
        }
        
        return configs;
    }
    
    async fetchDriverConfig(owner, repo, driverName) {
        try {
            const configResponse = await this.makeGitHubRequest(
                `/repos/${owner}/${repo}/contents/drivers/${driverName}/driver.compose.json`
            );
            
            if (configResponse && configResponse.content) {
                const content = Buffer.from(configResponse.content, 'base64').toString('utf8');
                const config = JSON.parse(content);
                
                // Extract manufacturer and product IDs
                if (config.manufacturerId) {
                    config.manufacturerId.forEach(id => this.scraped_data.manufacturer_ids.add(id));
                }
                if (config.productId) {
                    config.productId.forEach(id => this.scraped_data.product_ids.add(id));
                }
                
                return config;
            }
        } catch (error) {
            // Driver config doesn't exist or can't be parsed
        }
        
        return null;
    }
    
    async fetchZigbee2MQTTDevices(owner, repo) {
        const devices = [];
        
        try {
            // Common paths for device definitions in Zigbee2MQTT repos
            const devicePaths = [
                'src/devices',
                'devices',
                'lib/devices'
            ];
            
            for (const devicePath of devicePaths) {
                const deviceFiles = await this.makeGitHubRequest(
                    `/repos/${owner}/${repo}/contents/${devicePath}`
                );
                
                if (Array.isArray(deviceFiles)) {
                    for (const file of deviceFiles.slice(0, 20)) { // Limit files
                        if (file.name.endsWith('.js') || file.name.endsWith('.json')) {
                            const fileContent = await this.fetchFileContent(owner, repo, file.path);
                            if (fileContent) {
                                devices.push({
                                    file_name: file.name,
                                    file_path: file.path,
                                    content: fileContent,
                                    type: 'device_definition'
                                });
                            }
                            await this.sleep(this.rate_limit_delay / 2);
                        }
                    }
                    break; // Found device files, don't check other paths
                }
            }
        } catch (error) {
            console.log(`  No Zigbee2MQTT device files found in ${owner}/${repo}`);
        }
        
        return devices;
    }
    
    async fetchFileContent(owner, repo, filePath) {
        try {
            const response = await this.makeGitHubRequest(
                `/repos/${owner}/${repo}/contents/${filePath}`
            );
            
            if (response && response.content) {
                return Buffer.from(response.content, 'base64').toString('utf8');
            }
        } catch (error) {
            // File doesn't exist or can't be read
        }
        
        return null;
    }
    
    async extractDeviceDataFromIssues() {
        console.log('\nExtracting device data from issues and PRs...');
        
        const devicePatterns = [
            /manufacturerId[:\s]+[\[\"]?([0-9a-fA-F_x,\s]+)[\]\"]?/gi,
            /productId[:\s]+[\[\"]?([0-9a-fA-F_x,\s]+)[\]\"]?/gi,
            /_TZ[ES]\d{3}_[a-z0-9]+/gi,
            /TS\d{4}/gi,
            /\b[0-9a-fA-F]{4}\b/gi // Generic 4-digit hex codes
        ];
        
        const extractedDevices = [];
        
        // Process issues
        for (const issue of this.scraped_data.issues) {
            const text = (issue.title + ' ' + (issue.body || '')).toLowerCase();
            
            // Look for device mentions
            for (const pattern of devicePatterns) {
                const matches = text.match(pattern);
                if (matches) {
                    extractedDevices.push({
                        source: 'issue',
                        issue_number: issue.number,
                        issue_title: issue.title,
                        matches: matches,
                        repository: issue.source,
                        created_at: issue.created_at,
                        state: issue.state
                    });
                }
            }
        }
        
        // Process pull requests
        for (const pr of this.scraped_data.pull_requests) {
            const text = (pr.title + ' ' + (pr.body || '')).toLowerCase();
            
            for (const pattern of devicePatterns) {
                const matches = text.match(pattern);
                if (matches) {
                    extractedDevices.push({
                        source: 'pull_request',
                        pr_number: pr.number,
                        pr_title: pr.title,
                        matches: matches,
                        repository: pr.source,
                        created_at: pr.created_at,
                        state: pr.state
                    });
                }
            }
        }
        
        console.log(`Extracted device data from ${extractedDevices.length} issues/PRs`);
        return extractedDevices;
    }
    
    async analyzeDeviceCompatibility() {
        console.log('\nAnalyzing device compatibility across sources...');
        
        const compatibility = {
            common_devices: {},
            unique_to_johan_bendz: [],
            unique_to_zigbee2mqtt: [],
            coverage_gaps: []
        };
        
        // Group devices by manufacturer/product ID combinations
        for (const config of this.scraped_data.device_configs) {
            if (config.config && config.config.manufacturerId && config.config.productId) {
                const key = `${config.config.manufacturerId}_${config.config.productId}`;
                
                if (!compatibility.common_devices[key]) {
                    compatibility.common_devices[key] = {
                        manufacturerId: config.config.manufacturerId,
                        productId: config.config.productId,
                        sources: [],
                        driver_names: []
                    };
                }
                
                compatibility.common_devices[key].sources.push(config.source);
                compatibility.common_devices[key].driver_names.push(config.driver_name);
            }
        }
        
        return compatibility;
    }
    
    async generateEnhancedDrivers() {
        console.log('\nGenerating enhanced drivers based on scraped data...');
        
        const extractedDevices = await this.extractDeviceDataFromIssues();
        const compatibility = await this.analyzeDeviceCompatibility();
        
        const enhancedDrivers = [];
        
        // Create drivers for devices mentioned in issues but not yet implemented
        const deviceRequests = {};
        
        for (const device of extractedDevices) {
            // Parse device information from matches
            const deviceInfo = this.parseDeviceInfo(device);
            
            if (deviceInfo && deviceInfo.type) {
                const driverName = this.generateDriverName(deviceInfo);
                
                if (!deviceRequests[driverName]) {
                    deviceRequests[driverName] = {
                        name: driverName,
                        device_info: deviceInfo,
                        requests: [],
                        priority: 0
                    };
                }
                
                deviceRequests[driverName].requests.push(device);
                deviceRequests[driverName].priority += device.state === 'open' ? 2 : 1;
            }
        }
        
        // Create the most requested drivers
        const sortedRequests = Object.values(deviceRequests)
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 20); // Top 20 most requested
        
        for (const request of sortedRequests) {
            try {
                await this.createEnhancedDriver(request);
                enhancedDrivers.push(request.name);
                console.log(`  Created: ${request.name} (priority: ${request.priority})`);
            } catch (error) {
                console.error(`  Failed to create: ${request.name} - ${error.message}`);
            }
        }
        
        return enhancedDrivers;
    }
    
    parseDeviceInfo(device) {
        // Extract device type and characteristics from issue/PR data
        const text = device.issue_title || device.pr_title || '';
        
        let deviceType = 'sensor'; // Default
        
        if (text.match(/switch|button|wall/i)) deviceType = 'switch';
        else if (text.match(/sensor|motion|temperature|humidity/i)) deviceType = 'sensor';
        else if (text.match(/light|bulb|led|lamp/i)) deviceType = 'light';
        else if (text.match(/plug|outlet|socket/i)) deviceType = 'plug';
        else if (text.match(/lock|door|access/i)) deviceType = 'lock';
        else if (text.match(/curtain|blind|cover/i)) deviceType = 'cover';
        
        return {
            type: deviceType,
            name: text.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim(),
            matches: device.matches,
            source: device.repository
        };
    }
    
    generateDriverName(deviceInfo) {
        const baseName = deviceInfo.name
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .substring(0, 30);
        
        return `${deviceInfo.type}_${baseName}`;
    }
    
    async createEnhancedDriver(request) {
        const driverName = request.name;
        const driverPath = path.join(this.projectRoot, 'drivers', driverName);
        
        if (fs.existsSync(driverPath)) {
            return; // Already exists
        }
        
        fs.mkdirSync(driverPath, { recursive: true });
        fs.mkdirSync(path.join(driverPath, 'assets'), { recursive: true });
        fs.mkdirSync(path.join(driverPath, 'pair'), { recursive: true });
        
        // Generate driver configuration based on scraped data
        const driverConfig = {
            id: driverName,
            class: this.getDriverClass(request.device_info.type),
            capabilities: this.getDriverCapabilities(request.device_info.type),
            energy: this.getEnergyConfig(request.device_info.type),
            zigbee: {
                manufacturerId: this.extractManufacturerIds(request.device_info.matches),
                productId: this.extractProductIds(request.device_info.matches),
                endpoints: {
                    "1": {
                        clusters: this.getClusters(request.device_info.type),
                        bindings: this.getBindings(request.device_info.type)
                    }
                },
                learnmode: {
                    image: `/drivers/${driverName}/assets/learn.svg`,
                    instruction: {
                        en: 'Press and hold the pairing button for 5 seconds',
                        fr: 'Appuyez et maintenez le bouton d\'appairage pendant 5 secondes',
                        nl: 'Houd de koppelknop 5 seconden ingedrukt',
                        de: 'Halten Sie die Kopplungstaste 5 Sekunden lang gedrückt'
                    }
                }
            },
            images: {
                small: `/drivers/${driverName}/assets/small.png`,
                large: `/drivers/${driverName}/assets/large.png`
            }
        };
        
        fs.writeFileSync(
            path.join(driverPath, 'driver.compose.json'),
            JSON.stringify(driverConfig, null, 2)
        );
        
        // Generate device.js
        const deviceJs = this.generateDeviceJs(driverName, request.device_info.type);
        fs.writeFileSync(path.join(driverPath, 'device.js'), deviceJs);
    }
    
    extractManufacturerIds(matches) {
        const ids = [];
        if (matches) {
            for (const match of matches) {
                if (match.startsWith('manufacturerId') || match.includes('_TZ')) {
                    // Extract hex IDs
                    const hexIds = match.match(/[0-9a-fA-F]{4}/g);
                    if (hexIds) ids.push(...hexIds);
                }
            }
        }
        return [...new Set(ids)]; // Remove duplicates
    }
    
    extractProductIds(matches) {
        const ids = [];
        if (matches) {
            for (const match of matches) {
                if (match.startsWith('productId') || match.includes('TS')) {
                    const hexIds = match.match(/[0-9a-fA-F]{4}/g);
                    if (hexIds) ids.push(...hexIds);
                }
            }
        }
        return [...new Set(ids)];
    }
    
    getDriverClass(type) {
        const classMap = {
            switch: 'light',
            sensor: 'sensor',
            light: 'light',
            plug: 'socket',
            lock: 'lock',
            cover: 'windowcoverings'
        };
        return classMap[type] || 'sensor';
    }
    
    getDriverCapabilities(type) {
        const capMap = {
            switch: ['onoff'],
            sensor: ['measure_temperature', 'measure_humidity', 'measure_battery'],
            light: ['onoff', 'dim'],
            plug: ['onoff', 'measure_power'],
            lock: ['locked'],
            cover: ['windowcoverings_state']
        };
        return capMap[type] || ['onoff'];
    }
    
    getEnergyConfig(type) {
        if (type === 'sensor') {
            return { batteries: ['CR2032', 'AA'] };
        }
        return undefined;
    }
    
    getClusters(type) {
        const clusterMap = {
            switch: [0, 3, 6, 8],
            sensor: [0, 1, 3, 1026, 1029],
            light: [0, 3, 6, 8, 768],
            plug: [0, 3, 6, 2820],
            lock: [0, 3, 257],
            cover: [0, 3, 258]
        };
        return clusterMap[type] || [0, 3];
    }
    
    getBindings(type) {
        if (type === 'sensor') return [1];
        return [6];
    }
    
    generateDeviceJs(driverName, type) {
        const className = this.toPascalCase(driverName);
        
        return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className}Device extends ZigBeeDevice {
    
    async onNodeInit() {
        this.log('${driverName} device initialized - based on community data scraping');
        
        await this.registerCapabilitiesFromCommunityData();
    }
    
    async registerCapabilitiesFromCommunityData() {
        // Capabilities registered based on scraped community data
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 'genOnOff');
        }
        
        if (this.hasCapability('dim')) {
            this.registerCapability('dim', 'genLevelCtrl');
        }
        
        if (this.hasCapability('measure_battery')) {
            this.registerCapability('measure_battery', 'genPowerCfg');
        }
        
        if (this.hasCapability('measure_temperature')) {
            this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
        }
        
        if (this.hasCapability('measure_humidity')) {
            this.registerCapability('measure_humidity', 'msRelativeHumidity');
        }
    }
}

module.exports = ${className}Device;`;
    }
    
    toPascalCase(str) {
        return str.replace(/(^|_)([a-z])/g, (match, prefix, letter) => letter.toUpperCase());
    }
    
    async makeGitHubRequest(path) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'api.github.com',
                path: path,
                headers: {
                    'User-Agent': 'Ultimate-Zigbee-Hub-Mega-Scraper',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };
            
            https.get(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    }
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async generateComprehensiveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            scraping_summary: {
                repositories_scraped: this.sources.github_repos.length,
                total_issues: this.scraped_data.issues.length,
                total_pull_requests: this.scraped_data.pull_requests.length,
                device_configs_found: this.scraped_data.device_configs.length,
                manufacturer_ids_discovered: this.scraped_data.manufacturer_ids.size,
                product_ids_discovered: this.scraped_data.product_ids.size
            },
            extracted_devices: await this.extractDeviceDataFromIssues(),
            compatibility_analysis: await this.analyzeDeviceCompatibility(),
            enhanced_drivers: await this.generateEnhancedDrivers(),
            manufacturer_ids: Array.from(this.scraped_data.manufacturer_ids),
            product_ids: Array.from(this.scraped_data.product_ids)
        };
        
        const reportPath = path.join(this.projectRoot, 'project-data', 'analysis-results', 
                                   'mega-comprehensive-scraping-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\nMEGA COMPREHENSIVE SCRAPING REPORT:');
        console.log(`Repositories scraped: ${report.scraping_summary.repositories_scraped}`);
        console.log(`Issues analyzed: ${report.scraping_summary.total_issues}`);
        console.log(`Pull requests analyzed: ${report.scraping_summary.total_pull_requests}`);
        console.log(`Device configs found: ${report.scraping_summary.device_configs_found}`);
        console.log(`Manufacturer IDs discovered: ${report.scraping_summary.manufacturer_ids_discovered}`);
        console.log(`Product IDs discovered: ${report.scraping_summary.product_ids_discovered}`);
        console.log(`Enhanced drivers created: ${report.enhanced_drivers.length}`);
        
        return report;
    }
    
    async run() {
        console.log('Starting MEGA comprehensive sources scraper...');
        console.log('Scraping: Johan Bendz, Zigbee2MQTT, ZHA, Blakadder, and more...');
        
        await this.scrapeAllGitHubSources();
        const report = await this.generateComprehensiveReport();
        
        console.log('\nMEGA COMPREHENSIVE SCRAPING COMPLETE!');
        return report;
    }
}

if (require.main === module) {
    const scraper = new MegaComprehensiveSourcesScraper();
    scraper.run().catch(console.error);
}

module.exports = MegaComprehensiveSourcesScraper;
