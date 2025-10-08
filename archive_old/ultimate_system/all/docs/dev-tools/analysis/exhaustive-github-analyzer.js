#!/usr/bin/env node

/**
 * Exhaustive GitHub Analyzer
 * Comprehensive analysis of all PRs, Issues, and code from Johan Bendz and dlnraja repositories
 * Extracts device data, manufacturer IDs, and missing drivers for complete coverage
 */

const fs = require('fs-extra');
const path = require('path');
const https = require('https');

class ExhaustiveGitHubAnalyzer {
    constructor() {
        this.projectRoot = process.cwd();
        this.outputDir = path.join(this.projectRoot, 'project-data', 'analysis-results');
        this.repositories = [
            'JohanBendz/com.tuya.zigbee',
            'dlnraja/com.tuya.zigbee',
            'JohanBendz/com.ikea.tradfri',
            'JohanBendz/com.xiaomi-mi',
            'JohanBendz/com.philips.hue.zigbee'
        ];
        
        this.extractedData = {
            pullRequests: [],
            issues: [],
            deviceData: new Map(),
            manufacturerIds: new Set(),
            missingDrivers: [],
            discussions: [],
            codeAnalysis: new Map()
        };
        
        console.log('🔍 Exhaustive GitHub Analyzer');
        console.log('📊 Analyzing ALL PRs, Issues, Code from Johan Bendz + dlnraja');
    }

    async run() {
        console.log('\n🚀 Starting exhaustive GitHub analysis...');
        
        try {
            await fs.ensureDir(this.outputDir);
            
            for (const repo of this.repositories) {
                console.log(`\n📂 Analyzing repository: ${repo}`);
                await this.analyzeRepository(repo);
            }
            
            await this.consolidateFindings();
            await this.generateComprehensiveReport();
            
            console.log('\n✅ Exhaustive GitHub analysis completed!');
            return this.extractedData;
            
        } catch (error) {
            console.error('❌ Error during GitHub analysis:', error);
            throw error;
        }
    }

    async analyzeRepository(repo) {
        try {
            // Analyze Pull Requests (all states)
            console.log(`  📋 Fetching PRs for ${repo}...`);
            const prs = await this.fetchGitHubData(`/repos/${repo}/pulls`, { state: 'all', per_page: 100 });
            
            for (const pr of prs) {
                await this.analyzePullRequest(repo, pr);
            }
            
            // Analyze Issues (all states)
            console.log(`  🐛 Fetching Issues for ${repo}...`);
            const issues = await this.fetchGitHubData(`/repos/${repo}/issues`, { state: 'all', per_page: 100 });
            
            for (const issue of issues) {
                if (!issue.pull_request) { // Skip PRs that appear as issues
                    await this.analyzeIssue(repo, issue);
                }
            }
            
            // Analyze Repository Code
            console.log(`  💻 Analyzing code structure for ${repo}...`);
            await this.analyzeRepositoryCode(repo);
            
            // Analyze Repository Discussions
            console.log(`  💬 Fetching discussions for ${repo}...`);
            await this.analyzeDiscussions(repo);
            
        } catch (error) {
            console.error(`⚠️  Error analyzing repository ${repo}:`, error.message);
        }
    }

    async fetchGitHubData(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `https://api.github.com${endpoint}${queryString ? '?' + queryString : ''}`;
        
        return new Promise((resolve, reject) => {
            const req = https.get(url, {
                headers: {
                    'User-Agent': 'Ultimate-Zigbee-Hub-Analyzer',
                    'Accept': 'application/vnd.github.v3+json'
                }
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 400) {
                            reject(new Error(`GitHub API error: ${parsed.message || 'Unknown error'}`));
                        } else {
                            resolve(Array.isArray(parsed) ? parsed : [parsed]);
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON: ${error.message}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async analyzePullRequest(repo, pr) {
        console.log(`    📋 Analyzing PR #${pr.number}: ${pr.title}`);
        
        const prData = {
            repository: repo,
            number: pr.number,
            title: pr.title,
            body: pr.body || '',
            state: pr.state,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            user: pr.user?.login,
            labels: pr.labels?.map(l => l.name) || [],
            deviceData: this.extractDeviceData(pr.title + ' ' + (pr.body || '')),
            manufacturerIds: this.extractManufacturerIds(pr.title + ' ' + (pr.body || ''))
        };
        
        this.extractedData.pullRequests.push(prData);
        
        // Extract device and manufacturer data
        prData.deviceData.forEach(device => {
            const key = device.model || device.name || 'unknown';
            if (!this.extractedData.deviceData.has(key)) {
                this.extractedData.deviceData.set(key, []);
            }
            this.extractedData.deviceData.get(key).push({
                source: `PR #${pr.number}`,
                repository: repo,
                ...device
            });
        });
        
        prData.manufacturerIds.forEach(id => {
            this.extractedData.manufacturerIds.add(id);
        });
        
        // Small delay to avoid rate limiting
        await this.delay(100);
    }

    async analyzeIssue(repo, issue) {
        console.log(`    🐛 Analyzing Issue #${issue.number}: ${issue.title}`);
        
        const issueData = {
            repository: repo,
            number: issue.number,
            title: issue.title,
            body: issue.body || '',
            state: issue.state,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            user: issue.user?.login,
            labels: issue.labels?.map(l => l.name) || [],
            deviceData: this.extractDeviceData(issue.title + ' ' + (issue.body || '')),
            manufacturerIds: this.extractManufacturerIds(issue.title + ' ' + (issue.body || ''))
        };
        
        this.extractedData.issues.push(issueData);
        
        // Extract device and manufacturer data
        issueData.deviceData.forEach(device => {
            const key = device.model || device.name || 'unknown';
            if (!this.extractedData.deviceData.has(key)) {
                this.extractedData.deviceData.set(key, []);
            }
            this.extractedData.deviceData.get(key).push({
                source: `Issue #${issue.number}`,
                repository: repo,
                ...device
            });
        });
        
        issueData.manufacturerIds.forEach(id => {
            this.extractedData.manufacturerIds.add(id);
        });
        
        // Small delay to avoid rate limiting
        await this.delay(100);
    }

    async analyzeRepositoryCode(repo) {
        try {
            // Get repository tree to analyze structure
            const tree = await this.fetchGitHubData(`/repos/${repo}/git/trees/HEAD`, { recursive: 1 });
            
            const driverFiles = tree[0]?.tree?.filter(item => 
                item.path.includes('driver') && 
                (item.path.endsWith('.js') || item.path.endsWith('.json'))
            ) || [];
            
            console.log(`    💻 Found ${driverFiles.length} driver-related files`);
            
            // Analyze driver structure
            for (const file of driverFiles.slice(0, 50)) { // Limit to avoid rate limits
                try {
                    const content = await this.fetchGitHubData(`/repos/${repo}/contents/${file.path}`);
                    if (content[0]?.content) {
                        const decoded = Buffer.from(content[0].content, 'base64').toString('utf-8');
                        this.analyzeCodeContent(repo, file.path, decoded);
                    }
                } catch (error) {
                    console.log(`      ⚠️  Error reading ${file.path}: ${error.message}`);
                }
                
                await this.delay(200); // Longer delay for content requests
            }
            
        } catch (error) {
            console.log(`    ⚠️  Error analyzing repository code: ${error.message}`);
        }
    }

    analyzeCodeContent(repo, filePath, content) {
        const analysis = {
            repository: repo,
            file: filePath,
            manufacturerIds: this.extractManufacturerIds(content),
            deviceModels: this.extractDeviceModels(content),
            capabilities: this.extractCapabilities(content),
            zigbeeConfig: this.extractZigbeeConfig(content)
        };
        
        this.extractedData.codeAnalysis.set(`${repo}:${filePath}`, analysis);
        
        // Add manufacturer IDs to global set
        analysis.manufacturerIds.forEach(id => {
            this.extractedData.manufacturerIds.add(id);
        });
    }

    async analyzeDiscussions(repo) {
        try {
            // GitHub Discussions API (if available)
            const discussions = await this.fetchGitHubData(`/repos/${repo}/discussions`);
            
            for (const discussion of discussions.slice(0, 20)) { // Limit discussions
                const discussionData = {
                    repository: repo,
                    title: discussion.title,
                    body: discussion.body || '',
                    category: discussion.category?.name,
                    created_at: discussion.created_at,
                    deviceData: this.extractDeviceData(discussion.title + ' ' + (discussion.body || ''))
                };
                
                this.extractedData.discussions.push(discussionData);
                await this.delay(300);
            }
            
        } catch (error) {
            console.log(`    💬 Discussions not available for ${repo}: ${error.message}`);
        }
    }

    extractDeviceData(text) {
        const devices = [];
        const devicePatterns = [
            /TZ[E0-9]{4}[A-Z0-9]+/gi,
            /TS[0-9]{4}[A-Z]/gi,
            /SNZB-[0-9]+/gi,
            /TRADFRI[^\\s]*/gi,
            /STYRBAR/gi,
            /SYMFONISK/gi
        ];
        
        devicePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(match => {
                devices.push({
                    model: match.trim(),
                    type: this.inferDeviceType(match, text)
                });
            });
        });
        
        return devices;
    }

    extractManufacturerIds(text) {
        const ids = new Set();
        const patterns = [
            /_TZ[E0-9]{4}_[A-Z0-9]+/gi,
            /manufacturerId['":\s]*([A-Z0-9_]+)/gi,
            /manufacturer['":\s]*['""]([^'"]+)['"]/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                ids.add(match[1] || match[0]);
            }
        });
        
        return Array.from(ids);
    }

    extractDeviceModels(content) {
        const models = new Set();
        const patterns = [
            /modelId['":\s]*['""]([^'"]+)['"]/gi,
            /model['":\s]*['""]([^'"]+)['"]/gi,
            /TS[0-9]{4}[A-Z]/gi,
            /TZ[E0-9]{4}[A-Z0-9]+/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                models.add(match[1] || match[0]);
            }
        });
        
        return Array.from(models);
    }

    extractCapabilities(content) {
        const capabilities = new Set();
        const patterns = [
            /onoff/gi,
            /dim/gi,
            /measure_temperature/gi,
            /measure_humidity/gi,
            /alarm_motion/gi,
            /alarm_contact/gi,
            /windowcoverings_state/gi,
            /meter_power/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => capabilities.add(match.toLowerCase()));
        });
        
        return Array.from(capabilities);
    }

    extractZigbeeConfig(content) {
        const config = {};
        
        // Extract manufacturer info
        const manufacturerMatch = content.match(/manufacturerName['":\s]*['""]([^'"]+)['"]/i);
        if (manufacturerMatch) config.manufacturerName = manufacturerMatch[1];
        
        const productIdMatch = content.match(/productId['":\s]*['""]([^'"]+)['"]/i);
        if (productIdMatch) config.productId = productIdMatch[1];
        
        return config;
    }

    inferDeviceType(model, context) {
        const lowerContext = context.toLowerCase();
        
        if (lowerContext.includes('switch') || lowerContext.includes('relay')) return 'switch';
        if (lowerContext.includes('sensor') || lowerContext.includes('motion')) return 'sensor';
        if (lowerContext.includes('light') || lowerContext.includes('bulb')) return 'light';
        if (lowerContext.includes('thermostat') || lowerContext.includes('temperature')) return 'climate';
        if (lowerContext.includes('curtain') || lowerContext.includes('blind')) return 'cover';
        if (lowerContext.includes('lock') || lowerContext.includes('door')) return 'security';
        if (lowerContext.includes('plug') || lowerContext.includes('socket')) return 'plug';
        
        return 'unknown';
    }

    async consolidateFindings() {
        console.log('\n📊 Consolidating findings...');
        
        // Identify missing drivers based on device data
        this.extractedData.deviceData.forEach((devices, model) => {
            const deviceTypes = devices.map(d => d.type);
            const uniqueTypes = [...new Set(deviceTypes)];
            
            uniqueTypes.forEach(type => {
                if (type !== 'unknown') {
                    const suggestedDriverName = this.generateDriverName(model, type);
                    this.extractedData.missingDrivers.push({
                        suggestedName: suggestedDriverName,
                        model: model,
                        type: type,
                        sources: devices.map(d => `${d.repository} ${d.source}`),
                        priority: devices.length // More mentions = higher priority
                    });
                }
            });
        });
        
        // Sort missing drivers by priority
        this.extractedData.missingDrivers.sort((a, b) => b.priority - a.priority);
        
        console.log(`📊 Consolidated findings:`);
        console.log(`   Pull Requests: ${this.extractedData.pullRequests.length}`);
        console.log(`   Issues: ${this.extractedData.issues.length}`);
        console.log(`   Device Models: ${this.extractedData.deviceData.size}`);
        console.log(`   Manufacturer IDs: ${this.extractedData.manufacturerIds.size}`);
        console.log(`   Missing Drivers: ${this.extractedData.missingDrivers.length}`);
        console.log(`   Code Files: ${this.extractedData.codeAnalysis.size}`);
        console.log(`   Discussions: ${this.extractedData.discussions.length}`);
    }

    generateDriverName(model, type) {
        const typeMap = {
            'switch': 'smart_switch',
            'sensor': 'sensor',
            'light': 'smart_bulb',
            'climate': 'thermostat',
            'cover': 'curtain_motor',
            'security': 'smart_lock',
            'plug': 'smart_plug'
        };
        
        const baseType = typeMap[type] || type;
        const cleanModel = model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        return `${baseType}_${cleanModel}`;
    }

    async generateComprehensiveReport() {
        const reportPath = path.join(this.outputDir, 'exhaustive-github-analysis.json');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                repositories_analyzed: this.repositories.length,
                pull_requests: this.extractedData.pullRequests.length,
                issues: this.extractedData.issues.length,
                device_models: this.extractedData.deviceData.size,
                manufacturer_ids: this.extractedData.manufacturerIds.size,
                missing_drivers: this.extractedData.missingDrivers.length,
                code_files: this.extractedData.codeAnalysis.size,
                discussions: this.extractedData.discussions.length
            },
            data: {
                pullRequests: this.extractedData.pullRequests,
                issues: this.extractedData.issues,
                deviceData: Object.fromEntries(this.extractedData.deviceData),
                manufacturerIds: Array.from(this.extractedData.manufacturerIds),
                missingDrivers: this.extractedData.missingDrivers,
                codeAnalysis: Object.fromEntries(this.extractedData.codeAnalysis),
                discussions: this.extractedData.discussions
            }
        };
        
        await fs.writeJson(reportPath, report, { spaces: 2 });
        console.log(`📄 Comprehensive report saved: ${reportPath}`);
        
        return report;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Execute if run directly
if (require.main === module) {
    const analyzer = new ExhaustiveGitHubAnalyzer();
    analyzer.run().catch(console.error);
}

module.exports = ExhaustiveGitHubAnalyzer;
