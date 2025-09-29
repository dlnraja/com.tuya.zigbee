#!/usr/bin/env node
// GitHub Scanner - PRs & Issues Johann Bendz

const https = require('https');
const fs = require('fs-extra');
const path = require('path');

class GitHubScanner {
    constructor() {
        this.outputPath = path.join(__dirname, 'github-scan-results.json');
    }

    fetchData(url) {
        return new Promise((resolve, reject) => {
            https.get(url, { headers: { 'User-Agent': 'nodejs-app' } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                });
            }).on('error', reject);
        });
    }

    async scanJohanBendz() {
        console.log('🔍 Scanning Johann Bendz repository...');
        
        try {
            // Scan PRs
            const prsUrl = 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/pulls?state=all&per_page=100';
            const prs = await this.fetchData(prsUrl);
            
            // Scan Issues  
            const issuesUrl = 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/issues?state=all&per_page=100';
            const issues = await this.fetchData(issuesUrl);

            const results = {
                timestamp: new Date().toISOString(),
                totalPRs: Array.isArray(prs) ? prs.length : 0,
                totalIssues: Array.isArray(issues) ? issues.length : 0,
                prs: Array.isArray(prs) ? prs.slice(0, 10) : [],
                issues: Array.isArray(issues) ? issues.slice(0, 10) : []
            };

            await fs.writeJson(this.outputPath, results, { spaces: 2 });
            
            console.log(`✅ Found ${results.totalPRs} PRs and ${results.totalIssues} issues`);
            console.log(`📄 Results saved to: ${this.outputPath}`);
            
            return results;
        } catch (error) {
            console.error('❌ Error scanning GitHub:', error.message);
            return null;
        }
    }
}

new GitHubScanner().scanJohanBendz();
