#!/usr/bin/env node

/**
 * EXHAUSTIVE PR & ISSUES SCANNER
 * Scanner TOUS les PR (ouverts/fermés) et issues de Johan Bendz
 * Extraction complète des données pour enrichissement drivers
 */

const fs = require('fs-extra');
const path = require('path');
const https = require('https');

class ExhaustivePRIssuesScanner {
    constructor() {
        this.projectRoot = process.cwd();
        this.reportsPath = path.join(this.projectRoot, 'project-data', 'analysis-results');
        this.baseUrl = 'https://api.github.com';
        this.repos = [
            'JohanBendz/com.tuya.zigbee',
            'dlnraja/com.tuya.zigbee'
        ];
        this.allPRs = [];
        this.allIssues = [];
        this.deviceRequests = [];
        this.manufacturerIds = [];
    }

    async run() {
        console.log('🔍 Starting Exhaustive PR & Issues Scanning...');
        
        await fs.ensureDir(this.reportsPath);
        
        for (const repo of this.repos) {
            console.log(`\n📊 Analyzing repository: ${repo}`);
            
            // Scanner TOUS les PR (états: all)
            await this.scanAllPullRequests(repo);
            
            // Scanner TOUS les issues (états: all) 
            await this.scanAllIssues(repo);
        }
        
        // Analyse et extraction des données
        await this.extractDeviceRequests();
        await this.extractManufacturerIds();
        await this.generateComprehensiveReport();
        
        console.log('✅ Exhaustive scanning complete!');
    }

    async scanAllPullRequests(repo) {
        console.log(`  📥 Scanning ALL Pull Requests for ${repo}...`);
        
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            try {
                console.log(`    Page ${page}...`);
                
                const prs = await this.makeGitHubRequest(`/repos/${repo}/pulls`, {
                    state: 'all',  // all, open, closed
                    per_page: 100,
                    page: page
                });
                
                if (prs.length === 0) {
                    hasMore = false;
                } else {
                    // Récupération des détails de chaque PR
                    for (const pr of prs) {
                        console.log(`      PR #${pr.number}: ${pr.title}`);
                        
                        // Détails du PR
                        const prDetails = await this.makeGitHubRequest(`/repos/${repo}/pulls/${pr.number}`);
                        
                        // Fichiers modifiés
                        const prFiles = await this.makeGitHubRequest(`/repos/${repo}/pulls/${pr.number}/files`);
                        
                        // Commentaires
                        const prComments = await this.makeGitHubRequest(`/repos/${repo}/pulls/${pr.number}/comments`);
                        
                        this.allPRs.push({
                            repo,
                            number: pr.number,
                            title: pr.title,
                            body: pr.body,
                            state: pr.state,
                            merged: pr.merged_at ? true : false,
                            author: pr.user.login,
                            created_at: pr.created_at,
                            updated_at: pr.updated_at,
                            labels: pr.labels.map(l => l.name),
                            details: prDetails,
                            files: prFiles,
                            comments: prComments
                        });
                    }
                    
                    this.allPRs = this.allPRs.concat(prs);
                    page++;
                }
                
                // Rate limiting
                await this.delay(1000);
                
            } catch (error) {
                console.error(`    Error fetching PRs page ${page}:`, error.message);
                hasMore = false;
            }
        }
        
        console.log(`  ✅ Found ${this.allPRs.filter(pr => pr.repo === repo).length} PRs for ${repo}`);
    }

    async scanAllIssues(repo) {
        console.log(`  📋 Scanning ALL Issues for ${repo}...`);
        
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
            try {
                console.log(`    Page ${page}...`);
                
                const issues = await this.makeGitHubRequest(`/repos/${repo}/issues`, {
                    state: 'all',  // all, open, closed
                    per_page: 100,
                    page: page
                });
                
                if (issues.length === 0) {
                    hasMore = false;
                } else {
                    // Récupération des détails de chaque issue
                    for (const issue of issues) {
                        // Skip PRs (issues include PRs in GitHub API)
                        if (issue.pull_request) continue;
                        
                        console.log(`      Issue #${issue.number}: ${issue.title}`);
                        
                        // Commentaires de l'issue
                        const issueComments = await this.makeGitHubRequest(`/repos/${repo}/issues/${issue.number}/comments`);
                        
                        this.allIssues.push({
                            repo,
                            number: issue.number,
                            title: issue.title,
                            body: issue.body,
                            state: issue.state,
                            author: issue.user.login,
                            created_at: issue.created_at,
                            updated_at: issue.updated_at,
                            closed_at: issue.closed_at,
                            labels: issue.labels.map(l => l.name),
                            comments: issueComments
                        });
                    }
                    
                    page++;
                }
                
                // Rate limiting
                await this.delay(1000);
                
            } catch (error) {
                console.error(`    Error fetching issues page ${page}:`, error.message);
                hasMore = false;
            }
        }
        
        console.log(`  ✅ Found ${this.allIssues.filter(issue => issue.repo === repo).length} Issues for ${repo}`);
    }

    async makeGitHubRequest(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        
        // Ajout des paramètres
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Ultimate-Zigbee-Hub-Enhancer',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };
            
            const req = https.get(url.toString(), options, (res) => {
                let data = '';
                
                res.on('data', chunk => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(30000, () => {
                req.abort();
                reject(new Error('Request timeout'));
            });
        });
    }

    async extractDeviceRequests() {
        console.log('\n📱 Extracting device requests from PRs & Issues...');
        
        // Combinaison de tous les PRs et issues
        const allItems = [...this.allPRs, ...this.allIssues];
        
        const deviceKeywords = [
            'device', 'switch', 'sensor', 'bulb', 'plug', 'dimmer',
            'motion', 'temperature', 'humidity', 'door', 'window',
            'tuya', 'zigbee', 'add support', 'new device', 'not working'
        ];
        
        for (const item of allItems) {
            const text = `${item.title} ${item.body || ''}`.toLowerCase();
            
            // Vérification si c'est une demande de device
            const isDeviceRequest = deviceKeywords.some(keyword => text.includes(keyword));
            
            if (isDeviceRequest) {
                // Extraction des manufacturer/product IDs
                const manufacturerMatches = text.match(/_tz\w+_[a-z0-9]+/gi) || [];
                const productMatches = text.match(/ts\d{4}/gi) || [];
                const modelMatches = text.match(/model[:\s]+([a-z0-9\-_]+)/gi) || [];
                
                this.deviceRequests.push({
                    type: item.pull_request ? 'PR' : 'Issue',
                    repo: item.repo,
                    number: item.number,
                    title: item.title,
                    body: item.body,
                    author: item.author,
                    created_at: item.created_at,
                    manufacturerIds: manufacturerMatches,
                    productIds: productMatches,
                    models: modelMatches,
                    labels: item.labels || []
                });
            }
        }
        
        console.log(`  📱 Found ${this.deviceRequests.length} device-related requests`);
    }

    async extractManufacturerIds() {
        console.log('\n🏭 Extracting manufacturer IDs...');
        
        const allText = this.deviceRequests.map(req => `${req.title} ${req.body}`).join(' ');
        
        // Patterns pour les IDs Tuya/Zigbee
        const patterns = {
            manufacturer: /_TZ\w+_[A-Z0-9]+/gi,
            product: /TS\d{4}/gi,
            model: /[A-Z]{2,}\d{2,}[A-Z]*/gi
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = allText.match(pattern) || [];
            const unique = [...new Set(matches)];
            
            console.log(`  ${type}: ${unique.length} unique IDs found`);
            
            this.manufacturerIds.push({
                type,
                count: unique.length,
                ids: unique
            });
        }
    }

    async generateComprehensiveReport() {
        console.log('\n📊 Generating comprehensive report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalPRs: this.allPRs.length,
                totalIssues: this.allIssues.length,
                deviceRequests: this.deviceRequests.length,
                manufacturerIds: this.manufacturerIds
            },
            repositories: this.repos,
            pullRequests: this.allPRs,
            issues: this.allIssues,
            deviceRequests: this.deviceRequests,
            extractedIds: this.manufacturerIds
        };
        
        // Sauvegarde du rapport complet
        await fs.writeJson(
            path.join(this.reportsPath, 'exhaustive-pr-issues-scan.json'),
            report,
            { spaces: 2 }
        );
        
        // Rapport simplifié pour les device requests
        await fs.writeJson(
            path.join(this.reportsPath, 'device-requests-extracted.json'),
            this.deviceRequests,
            { spaces: 2 }
        );
        
        // Rapport des IDs pour enrichissement
        const idsForDrivers = {};
        this.manufacturerIds.forEach(category => {
            idsForDrivers[category.type] = category.ids;
        });
        
        await fs.writeJson(
            path.join(this.reportsPath, 'manufacturer-ids-extracted.json'),
            idsForDrivers,
            { spaces: 2 }
        );
        
        console.log(`  📄 Reports saved to: ${this.reportsPath}`);
        console.log(`  📊 Summary:`);
        console.log(`     PRs analyzed: ${report.summary.totalPRs}`);
        console.log(`     Issues analyzed: ${report.summary.totalIssues}`);
        console.log(`     Device requests found: ${report.summary.deviceRequests}`);
        console.log(`     Manufacturer IDs extracted: ${this.manufacturerIds.reduce((sum, cat) => sum + cat.count, 0)}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exécution
if (require.main === module) {
    new ExhaustivePRIssuesScanner().run().catch(console.error);
}

module.exports = ExhaustivePRIssuesScanner;
