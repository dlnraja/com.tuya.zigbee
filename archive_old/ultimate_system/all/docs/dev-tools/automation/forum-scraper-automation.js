#!/usr/bin/env node

/**
 * Forum Scraper Automation - Scrapes Homey Community Forum for Tuya device updates
 * Extracts device information, issues, and manufacturer data automatically
 */

const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const { URL } = require('url');

class ForumScraperAutomation {
    constructor() {
        this.projectRoot = process.cwd();
        this.scrapedData = [];
        this.forumUrls = [
            'https://community.homey.app/search?q=Tuya',
            'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352',
            'https://community.homey.app/t/app-pro-tuya-zigbee-app/26439'
        ];
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
        this.devicePatterns = {
            manufacturerIds: /(_TZE?\d+_[a-z0-9]+|TS\d{4}|ZM-\d+-\w+)/gi,
            aliexpressItems: /(\d{13,16})/g,
            deviceModels: /(tuya|zigbee|smart|sensor|switch|plug|light|button|dimmer|thermostat|curtain|smoke|water|motion|door|window)/gi
        };
    }

    async scrapeForumData() {
        console.log('🕷️  Scraping Homey Community Forum for Tuya device data...');
        
        await this.scrapeMainForumPages();
        await this.extractDeviceInformation();
        await this.updateDriverDatabase();
        await this.generateScrapingReport();
        
        console.log(`✅ Scraped and processed ${this.scrapedData.length} forum entries`);
        return this.scrapedData;
    }

    async scrapeMainForumPages() {
        for (const url of this.forumUrls) {
            try {
                console.log(`   📄 Scraping: ${url}`);
                const content = await this.fetchPage(url);
                const extractedData = this.parseForumContent(content, url);
                this.scrapedData.push(...extractedData);
                
                // Rate limiting to be respectful
                await this.delay(2000);
            } catch (error) {
                console.log(`   ⚠️  Failed to scrape ${url}: ${error.message}`);
            }
        }
    }

    async fetchPage(url) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            };

            const request = https.get(url, options, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    resolve(data);
                });
            });
            
            request.on('error', (error) => {
                reject(error);
            });
            
            request.setTimeout(10000, () => {
                request.abort();
                reject(new Error('Request timeout'));
            });
        });
    }

    parseForumContent(content, sourceUrl) {
        const extractedData = [];
        
        // Extract device-related posts
        const postMatches = content.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || [];
        
        for (const post of postMatches) {
            const postData = {
                source_url: sourceUrl,
                timestamp: new Date().toISOString(),
                manufacturer_ids: [],
                product_ids: [],
                aliexpress_items: [],
                device_issues: [],
                device_types: []
            };
            
            // Extract manufacturer IDs
            const manufacturerMatches = post.match(this.devicePatterns.manufacturerIds) || [];
            postData.manufacturer_ids = [...new Set(manufacturerMatches)];
            
            // Extract AliExpress item numbers
            const aliexpressMatches = post.match(this.devicePatterns.aliexpressItems) || [];
            postData.aliexpress_items = [...new Set(aliexpressMatches)];
            
            // Extract device types
            const deviceMatches = post.match(this.devicePatterns.deviceModels) || [];
            postData.device_types = [...new Set(deviceMatches.map(d => d.toLowerCase()))];
            
            // Extract issues and problems
            postData.device_issues = this.extractDeviceIssues(post);
            
            // Only include posts with relevant device data
            if (postData.manufacturer_ids.length > 0 || 
                postData.aliexpress_items.length > 0 ||
                postData.device_issues.length > 0) {
                extractedData.push(postData);
            }
        }
        
        return extractedData;
    }

    extractDeviceIssues(postContent) {
        const issues = [];
        const issuePatterns = [
            /not stay connected/i,
            /keeps blinking/i,
            /pairs but.*disconnects/i,
            /connection.*problem/i,
            /won't.*pair/i,
            /timeout.*pairing/i,
            /device.*missing/i,
            /led.*flashing/i
        ];
        
        for (const pattern of issuePatterns) {
            if (pattern.test(postContent)) {
                issues.push(pattern.source.replace(/[\/\\^$.*+?()[\]{}|]/g, ''));
            }
        }
        
        return issues;
    }

    async extractDeviceInformation() {
        console.log('🔍 Extracting device information from scraped data...');
        
        const deviceDatabase = {};
        
        for (const entry of this.scrapedData) {
            // Process manufacturer IDs
            for (const manufacturerId of entry.manufacturer_ids) {
                if (!deviceDatabase[manufacturerId]) {
                    deviceDatabase[manufacturerId] = {
                        manufacturer: this.guessManufacturer(manufacturerId),
                        product_types: new Set(),
                        aliexpress_items: new Set(),
                        issues: new Set(),
                        forum_mentions: 0
                    };
                }
                
                deviceDatabase[manufacturerId].forum_mentions++;
                entry.device_types.forEach(type => deviceDatabase[manufacturerId].product_types.add(type));
                entry.aliexpress_items.forEach(item => deviceDatabase[manufacturerId].aliexpress_items.add(item));
                entry.device_issues.forEach(issue => deviceDatabase[manufacturerId].issues.add(issue));
            }
        }
        
        // Convert sets to arrays
        Object.values(deviceDatabase).forEach(device => {
            device.product_types = Array.from(device.product_types);
            device.aliexpress_items = Array.from(device.aliexpress_items);
            device.issues = Array.from(device.issues);
        });
        
        // Save extracted device information
        await fs.ensureDir(path.join(this.projectRoot, 'project-data', 'forum-data'));
        await fs.writeJson(
            path.join(this.projectRoot, 'project-data', 'forum-data', 'extracted-devices.json'),
            deviceDatabase,
            { spaces: 2 }
        );
        
        console.log(`   📊 Extracted ${Object.keys(deviceDatabase).length} unique device identifiers`);
        return deviceDatabase;
    }

    guessManufacturer(manufacturerId) {
        if (manufacturerId.startsWith('_TZE') || manufacturerId.startsWith('_TZ') || manufacturerId.startsWith('TS')) {
            return 'Tuya';
        } else if (manufacturerId.startsWith('ZM-')) {
            return 'MOES';
        } else if (manufacturerId.includes('ONENUO')) {
            return 'OneNuo';
        }
        return 'Unknown';
    }

    async updateDriverDatabase() {
        console.log('🔄 Updating driver database with forum findings...');
        
        const extractedDevicesPath = path.join(this.projectRoot, 'project-data', 'forum-data', 'extracted-devices.json');
        const extractedDevices = await fs.readJson(extractedDevicesPath);
        
        // Update drivers with new manufacturer IDs
        const driversDir = path.join(this.projectRoot, 'drivers');
        const categories = await fs.readdir(driversDir);
        
        let updatedDrivers = 0;
        
        for (const category of categories) {
            const categoryPath = path.join(driversDir, category);
            const stat = await fs.stat(categoryPath);
            if (!stat.isDirectory()) continue;
            
            const drivers = await fs.readdir(categoryPath);
            
            for (const driver of drivers) {
                const driverPath = path.join(categoryPath, driver);
                const composeFile = path.join(driverPath, 'driver.compose.json');
                
                if (await fs.pathExists(composeFile)) {
                    const compose = await fs.readJson(composeFile);
                    let updated = false;
                    
                    // Check if any extracted device matches this driver
                    for (const [deviceId, deviceData] of Object.entries(extractedDevices)) {
                        if (this.deviceMatchesDriver(deviceId, deviceData, driver, category)) {
                            // Add manufacturer ID if not present
                            if (!compose.zigbee) compose.zigbee = {};
                            if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
                            if (!compose.zigbee.productId) compose.zigbee.productId = [];
                            
                            if (!compose.zigbee.manufacturerName.includes(deviceId)) {
                                compose.zigbee.manufacturerName.push(deviceId);
                                updated = true;
                            }
                            
                            // Add AliExpress items as product IDs
                            for (const item of deviceData.aliexpress_items) {
                                if (!compose.zigbee.productId.includes(item)) {
                                    compose.zigbee.productId.push(item);
                                    updated = true;
                                }
                            }
                            
                            // Add forum issues to driver notes
                            if (deviceData.issues.length > 0 && !compose.settings) {
                                compose.settings = [];
                            }
                        }
                    }
                    
                    if (updated) {
                        await fs.writeJson(composeFile, compose, { spaces: 2 });
                        updatedDrivers++;
                        console.log(`   ✅ Updated ${category}/${driver}`);
                    }
                }
            }
        }
        
        console.log(`   📦 Updated ${updatedDrivers} drivers with forum data`);
    }

    deviceMatchesDriver(deviceId, deviceData, driverName, category) {
        const driverLower = driverName.toLowerCase();
        const deviceTypes = deviceData.product_types;
        
        // Check if device types match driver category
        const categoryMatches = {
            'motion_sensors': ['motion', 'pir', 'presence', 'radar'],
            'environmental_sensors': ['temperature', 'humidity', 'sensor', 'soil'],
            'contact_security': ['door', 'window', 'contact'],
            'smart_lighting': ['light', 'bulb', 'led', 'lamp'],
            'switches_dimmers': ['switch', 'dimmer', 'button', 'scene'],
            'power_energy': ['plug', 'socket', 'power', 'energy'],
            'safety_detection': ['smoke', 'gas', 'water', 'leak'],
            'climate_control': ['thermostat', 'temperature', 'climate'],
            'covers_access': ['curtain', 'blind', 'cover', 'motor']
        };
        
        const expectedTypes = categoryMatches[category] || [];
        
        // Check if device types overlap with expected types for this category
        return deviceTypes.some(type => 
            expectedTypes.some(expected => 
                type.includes(expected) || driverLower.includes(type)
            )
        );
    }

    async generateScrapingReport() {
        const report = {
            timestamp: new Date().toISOString(),
            scraping_session: {
                urls_scraped: this.forumUrls.length,
                total_entries: this.scrapedData.length,
                unique_manufacturers: [...new Set(this.scrapedData.flatMap(d => d.manufacturer_ids))].length,
                unique_aliexpress_items: [...new Set(this.scrapedData.flatMap(d => d.aliexpress_items))].length,
                total_device_issues: [...new Set(this.scrapedData.flatMap(d => d.device_issues))].length
            },
            top_manufacturers: this.getTopManufacturers(),
            common_issues: this.getCommonIssues(),
            next_scraping_date: this.getNextScrapingDate()
        };
        
        await fs.ensureDir(path.join(this.projectRoot, 'reports'));
        await fs.writeJson(
            path.join(this.projectRoot, 'reports', 'forum-scraping-report.json'),
            report,
            { spaces: 2 }
        );
        
        console.log('\n📊 Forum Scraping Summary:');
        console.log(`   URLs processed: ${report.scraping_session.urls_scraped}`);
        console.log(`   Entries found: ${report.scraping_session.total_entries}`);
        console.log(`   Manufacturers: ${report.scraping_session.unique_manufacturers}`);
        console.log(`   Issues identified: ${report.scraping_session.total_device_issues}`);
    }

    getTopManufacturers() {
        const manufacturers = {};
        this.scrapedData.forEach(entry => {
            entry.manufacturer_ids.forEach(id => {
                manufacturers[id] = (manufacturers[id] || 0) + 1;
            });
        });
        
        return Object.entries(manufacturers)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([id, count]) => ({ id, mentions: count }));
    }

    getCommonIssues() {
        const issues = {};
        this.scrapedData.forEach(entry => {
            entry.device_issues.forEach(issue => {
                issues[issue] = (issues[issue] || 0) + 1;
            });
        });
        
        return Object.entries(issues)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([issue, count]) => ({ issue, occurrences: count }));
    }

    getNextScrapingDate() {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Execute if run directly
if (require.main === module) {
    const scraper = new ForumScraperAutomation();
    scraper.scrapeForumData().catch(console.error);
}

module.exports = ForumScraperAutomation;
