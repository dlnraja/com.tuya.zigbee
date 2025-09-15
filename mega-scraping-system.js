#!/usr/bin/env node

/**
 * MEGA SCRAPING SYSTEM - Ultimate Data Harvester
 * Système de scraping complet pour GitHub, forums, documentation, et sources externes
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

class MegaScrapingSystem {
    constructor() {
        this.results = {
            github: { repos: [], issues: [], prs: [], releases: [] },
            forums: { homey: [], reddit: [], zigbee2mqtt: [] },
            documentation: { homey: [], zigbee: [], tuya: [] },
            devices: { blakadder: [], zigbee2mqtt: [], homeassistant: [] },
            sources: []
        };
        
        this.sources = this.loadSourcesConfig();
        this.outputDir = path.join(process.cwd(), 'enriched-data');
        this.ensureOutputDir();
        
        console.log('🌐 MEGA SCRAPING SYSTEM - Ultimate Data Harvester');
        console.log(`📁 Output: ${this.outputDir}`);
    }

    // Configuration des sources à scraper
    loadSourcesConfig() {
        return {
            github: {
                repos: [
                    'athom-community/com.tuya.zigbee',
                    'Koenkk/zigbee2mqtt',
                    'home-assistant/core',
                    'blakadder/zigbee',
                    'dresden-elektronik/deconz-rest-plugin'
                ],
                topics: ['zigbee', 'tuya', 'homey', 'smart-home', 'iot']
            },
            forums: {
                homey: [
                    'https://community.homey.app/tags/zigbee',
                    'https://community.homey.app/tags/tuya',
                    'https://community.homey.app/c/apps'
                ],
                reddit: [
                    'r/homeassistant',
                    'r/zigbee',
                    'r/smarthome'
                ]
            },
            documentation: {
                homey: 'https://apps-sdk-v3.developer.homey.app/',
                zigbee: 'https://zigbee.blakadder.com/',
                tuya: 'https://developer.tuya.com/en/docs'
            },
            devices: {
                blakadder: 'https://zigbee.blakadder.com/by_manufacturer.html',
                zigbee2mqtt: 'https://www.zigbee2mqtt.io/supported-devices/',
                homeassistant: 'https://www.home-assistant.io/integrations/zha/'
            }
        };
    }

    // Scraping principal
    async scrapeAll() {
        console.log('\n🚀 DÉMARRAGE DU SCRAPING COMPLET');
        
        try {
            await this.scrapeGitHub();
            await this.scrapeForums();
            await this.scrapeDocumentation();
            await this.scrapeDevices();
            await this.enrichExistingData();
            await this.generateReport();
            
            console.log('\n✅ SCRAPING TERMINÉ AVEC SUCCÈS');
            return this.results;
            
        } catch (error) {
            console.log('❌ Erreur durant le scraping:', error.message);
            throw error;
        }
    }

    // Scraping GitHub repositories, issues, PRs
    async scrapeGitHub() {
        console.log('\n🐙 SCRAPING GITHUB');
        
        for (const repo of this.sources.github.repos) {
            console.log(`📦 Repository: ${repo}`);
            
            try {
                // Repository info
                const repoData = await this.fetchGitHubAPI(`https://api.github.com/repos/${repo}`);
                this.results.github.repos.push({
                    name: repo,
                    description: repoData.description,
                    stars: repoData.stargazers_count,
                    language: repoData.language,
                    topics: repoData.topics || [],
                    updated: repoData.updated_at
                });

                // Issues
                const issues = await this.fetchGitHubAPI(`https://api.github.com/repos/${repo}/issues?state=all&per_page=100`);
                this.results.github.issues.push(...issues.map(issue => ({
                    repo,
                    title: issue.title,
                    body: issue.body,
                    labels: issue.labels.map(l => l.name),
                    state: issue.state,
                    created: issue.created_at,
                    url: issue.html_url
                })));

                // Pull Requests
                const prs = await this.fetchGitHubAPI(`https://api.github.com/repos/${repo}/pulls?state=all&per_page=100`);
                this.results.github.prs.push(...prs.map(pr => ({
                    repo,
                    title: pr.title,
                    body: pr.body,
                    state: pr.state,
                    created: pr.created_at,
                    url: pr.html_url
                })));

                // Releases
                const releases = await this.fetchGitHubAPI(`https://api.github.com/repos/${repo}/releases`);
                this.results.github.releases.push(...releases.map(release => ({
                    repo,
                    tag: release.tag_name,
                    name: release.name,
                    body: release.body,
                    created: release.created_at,
                    url: release.html_url
                })));

                await this.sleep(1000); // Rate limiting
                
            } catch (error) {
                console.log(`⚠️ Erreur scraping ${repo}:`, error.message);
            }
        }
        
        console.log(`✅ GitHub: ${this.results.github.repos.length} repos, ${this.results.github.issues.length} issues, ${this.results.github.prs.length} PRs`);
    }

    // Scraping forums communautaires
    async scrapeForums() {
        console.log('\n💬 SCRAPING FORUMS');
        
        // Homey Community
        console.log('🏠 Homey Community...');
        for (const url of this.sources.forums.homey) {
            try {
                const content = await this.fetchHTML(url);
                const topics = this.extractHomeyTopics(content);
                this.results.forums.homey.push(...topics);
            } catch (error) {
                console.log(`⚠️ Erreur Homey forum ${url}:`, error.message);
            }
        }

        console.log(`✅ Forums: ${this.results.forums.homey.length} topics Homey`);
    }

    // Scraping documentation technique
    async scrapeDocumentation() {
        console.log('\n📚 SCRAPING DOCUMENTATION');
        
        for (const [source, url] of Object.entries(this.sources.documentation)) {
            console.log(`📖 ${source}: ${url}`);
            try {
                const content = await this.fetchHTML(url);
                const docs = this.extractDocumentation(content, source);
                this.results.documentation[source] = docs;
            } catch (error) {
                console.log(`⚠️ Erreur documentation ${source}:`, error.message);
            }
        }
        
        console.log(`✅ Documentation scrapée pour ${Object.keys(this.sources.documentation).length} sources`);
    }

    // Scraping bases de données d'appareils
    async scrapeDevices() {
        console.log('\n📱 SCRAPING DEVICE DATABASES');
        
        // Blakadder Zigbee Database
        console.log('🔌 Blakadder Zigbee Database...');
        try {
            const content = await this.fetchHTML(this.sources.devices.blakadder);
            const devices = this.extractBlakadderDevices(content);
            this.results.devices.blakadder = devices;
        } catch (error) {
            console.log('⚠️ Erreur Blakadder:', error.message);
        }

        // Zigbee2MQTT Supported Devices
        console.log('🏠 Zigbee2MQTT Database...');
        try {
            const devices = await this.fetchZigbee2MQTTDevices();
            this.results.devices.zigbee2mqtt = devices;
        } catch (error) {
            console.log('⚠️ Erreur Zigbee2MQTT:', error.message);
        }

        console.log(`✅ Appareils: ${this.results.devices.blakadder.length} Blakadder, ${this.results.devices.zigbee2mqtt.length} Z2M`);
    }

    // Enrichissement des données existantes du projet
    async enrichExistingData() {
        console.log('\n⚡ ENRICHISSEMENT DES DONNÉES EXISTANTES');
        
        try {
            // Enrichir les matrices existantes
            await this.enrichMatrices();
            
            // Enrichir les références
            await this.enrichReferences();
            
            // Mettre à jour la base de données des appareils
            await this.updateDeviceDatabase();
            
            console.log('✅ Enrichissement terminé');
        } catch (error) {
            console.log('⚠️ Erreur enrichissement:', error.message);
        }
    }

    // Utilitaires de réseau
    async fetchGitHubAPI(url) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Ultimate-Zigbee-Hub-Scraper',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (error) {
                        reject(new Error(`Parse error: ${error.message}`));
                    }
                });
            }).on('error', reject);
        });
    }

    async fetchHTML(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
    }

    // Extracteurs de données
    extractHomeyTopics(html) {
        // Extraction simplifiée - en production utiliser un parser HTML
        const topics = [];
        const topicRegex = /<a[^>]*href="[^"]*"[^>]*>([^<]+)<\/a>/gi;
        let match;
        
        while ((match = topicRegex.exec(html)) !== null) {
            if (match[1].length > 10) { // Filtrer les titres trop courts
                topics.push({
                    title: match[1].trim(),
                    source: 'homey-community',
                    extracted: new Date().toISOString()
                });
            }
        }
        
        return topics.slice(0, 50); // Limiter les résultats
    }

    extractDocumentation(html, source) {
        // Extraction basique des liens et titres de documentation
        const docs = [];
        const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
        let match;
        
        while ((match = linkRegex.exec(html)) !== null) {
            docs.push({
                url: match[1],
                title: match[2].trim(),
                source,
                extracted: new Date().toISOString()
            });
        }
        
        return docs.slice(0, 100);
    }

    extractBlakadderDevices(html) {
        // Extraction des appareils de la base Blakadder
        const devices = [];
        
        // Pattern pour les appareils Zigbee
        const deviceRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>/gi;
        let match;
        
        while ((match = deviceRegex.exec(html)) !== null) {
            devices.push({
                manufacturer: match[1].trim(),
                model: match[2].trim(),
                source: 'blakadder',
                extracted: new Date().toISOString()
            });
        }
        
        return devices.slice(0, 1000);
    }

    async fetchZigbee2MQTTDevices() {
        try {
            // Fetch de l'API Zigbee2MQTT
            const url = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/docs/supported-devices.json';
            const response = await this.fetchHTML(url);
            const devices = JSON.parse(response);
            
            return devices.map(device => ({
                manufacturer: device.vendor,
                model: device.model,
                description: device.description,
                supports: device.supports,
                source: 'zigbee2mqtt',
                extracted: new Date().toISOString()
            }));
        } catch (error) {
            return [];
        }
    }

    // Enrichissement des données existantes
    async enrichMatrices() {
        console.log('📊 Enrichissement des matrices...');
        
        const matrixPath = path.join(process.cwd(), 'matrices');
        if (!fs.existsSync(matrixPath)) return;
        
        // Charger et enrichir chaque matrice
        const matrices = fs.readdirSync(matrixPath)
            .filter(file => file.endsWith('.json'))
            .slice(0, 10); // Limiter pour éviter la surcharge
            
        for (const matrixFile of matrices) {
            try {
                const filePath = path.join(matrixPath, matrixFile);
                const matrix = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Ajouter les nouvelles données
                matrix.lastEnriched = new Date().toISOString();
                matrix.githubData = this.results.github.repos.length;
                matrix.deviceCount = this.results.devices.blakadder.length + this.results.devices.zigbee2mqtt.length;
                
                fs.writeFileSync(filePath, JSON.stringify(matrix, null, 2));
            } catch (error) {
                console.log(`⚠️ Erreur enrichissement ${matrixFile}:`, error.message);
            }
        }
    }

    async enrichReferences() {
        console.log('📋 Enrichissement des références...');
        
        const refPath = path.join(process.cwd(), 'references');
        if (!fs.existsSync(refPath)) return;
        
        // Mettre à jour le fichier de sources principales
        const sourcesRef = {
            github: this.results.github,
            forums: this.results.forums,
            documentation: this.results.documentation,
            devices: this.results.devices,
            lastUpdate: new Date().toISOString(),
            totalSources: Object.keys(this.sources).length
        };
        
        fs.writeFileSync(
            path.join(refPath, 'enriched-sources.json'), 
            JSON.stringify(sourcesRef, null, 2)
        );
    }

    async updateDeviceDatabase() {
        console.log('🗄️ Mise à jour base de données appareils...');
        
        const dataPath = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
        
        const deviceDb = {
            sources: ['blakadder', 'zigbee2mqtt', 'github'],
            totalDevices: this.results.devices.blakadder.length + this.results.devices.zigbee2mqtt.length,
            devices: [
                ...this.results.devices.blakadder,
                ...this.results.devices.zigbee2mqtt
            ],
            lastUpdate: new Date().toISOString()
        };
        
        fs.writeFileSync(
            path.join(dataPath, 'enriched-device-database.json'),
            JSON.stringify(deviceDb, null, 2)
        );
    }

    // Génération du rapport final
    async generateReport() {
        console.log('\n📋 GÉNÉRATION DU RAPPORT');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                github: {
                    repos: this.results.github.repos.length,
                    issues: this.results.github.issues.length,
                    prs: this.results.github.prs.length,
                    releases: this.results.github.releases.length
                },
                forums: {
                    homey: this.results.forums.homey.length
                },
                devices: {
                    blakadder: this.results.devices.blakadder.length,
                    zigbee2mqtt: this.results.devices.zigbee2mqtt.length
                }
            },
            results: this.results
        };
        
        const reportPath = path.join(this.outputDir, 'scraping-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`✅ Rapport sauvegardé: ${reportPath}`);
        console.log(`📊 Total sources scrapées: ${Object.keys(this.sources).length}`);
        console.log(`🎯 Appareils collectés: ${report.summary.devices.blakadder + report.summary.devices.zigbee2mqtt}`);
    }

    // Utilitaires
    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exécution
async function main() {
    const scraper = new MegaScrapingSystem();
    
    try {
        await scraper.scrapeAll();
        console.log('\n🎉 SCRAPING SYSTEM TERMINÉ AVEC SUCCÈS');
    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = MegaScrapingSystem;
