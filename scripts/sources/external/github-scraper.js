#!/usr/bin/env node
'use strict';

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'scripts', 'sources');
const EXTERNAL_DIR = path.join(SOURCES_DIR, 'external');
const CACHE_DIR = path.join(EXTERNAL_DIR, 'cache');
const REPORTS_DIR = path.join(EXTERNAL_DIR, 'reports');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const DEFAULT_HEADERS = {
  'User-Agent': 'tuya-repair-bot/1.0',
  'Accept': 'application/vnd.github+json'
};

// Sources GitHub à analyser
const GITHUB_SOURCES = {
    'homey-community': {
        repos: [
            'homey-community/drivers',
            'homey-community/apps',
            'homey-community/zigbee'
        ],
        keywords: ['tuya', 'zigbee', 'driver', 'device']
    },
    'johanbenz': {
        repos: [
            'johanbenz/com.tuya.zigbee',
            'johanbenz/homey-tuya-zigbee'
        ],
        keywords: ['tuya', 'zigbee', 'driver', 'issue', 'pull request']
    },
    'zigbee-community': {
        repos: [
            'Koenkk/zigbee2mqtt',
            'Koenkk/zigbee-herdsman'
        ],
        keywords: ['tuya', 'device', 'fingerprint', 'cluster']
    },
    'home-assistant': {
        repos: [
            'home-assistant/core'
        ],
        keywords: ['tuya', 'zigbee', 'integration', 'device']
    }
};

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const headers = { ...DEFAULT_HEADERS };
        if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

        const req = https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (_) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(20000, () => req.destroy(new Error('Timeout')));
    });
}

async function scrapeGitHubRepo(owner, repo, keywords) {
    console.log(`🔍 Scraping ${owner}/${repo}...`);
    
    try {
        const base = `https://api.github.com/repos/${owner}/${repo}`;
        const repoInfo = await makeRequest(base);
        const commits = await makeRequest(`${base}/commits?per_page=50`);
        const issues = await makeRequest(`${base}/issues?state=all&per_page=50`);

        let readme = '';
        try {
            const readmeResponse = await makeRequest(`${base}/readme`);
            if (readmeResponse && readmeResponse.content) {
                readme = Buffer.from(readmeResponse.content, 'base64').toString();
            }
        } catch (_) {}
        
        const content = JSON.stringify({ repoInfo, commits, issues, readme }).toLowerCase();
        const foundKeywords = keywords.filter(keyword => content.includes(keyword.toLowerCase()));
        
        return {
            owner,
            repo,
            foundKeywords,
            lastCommit: commits?.[0]?.commit?.message || 'N/A',
            lastCommitDate: commits?.[0]?.commit?.author?.date || 'N/A',
            openIssues: Array.isArray(issues) ? issues.filter(i => i.state === 'open').length : 0,
            stars: repoInfo?.stargazers_count || 0,
            forks: repoInfo?.forks_count || 0,
            description: repoInfo?.description || 'N/A',
            language: repoInfo?.language || 'N/A',
            updatedAt: repoInfo?.updated_at || 'N/A'
        };
        
    } catch (error) {
        console.log(`❌ Erreur lors du scraping de ${owner}/${repo}:`, error.message);
        return { owner, repo, error: error.message, foundKeywords: [] };
    }
}

async function scrapeAllGitHubSources() {
    console.log('🚀 Début du scraping GitHub...');
    const results = {};
    const startTime = Date.now();
    
    for (const [sourceName, sourceConfig] of Object.entries(GITHUB_SOURCES)) {
        console.log(`\n📊 Source: ${sourceName}`);
        results[sourceName] = [];
        for (const repo of sourceConfig.repos) {
            const [owner, repoName] = repo.split('/');
            const result = await scrapeGitHubRepo(owner, repoName, sourceConfig.keywords);
            results[sourceName].push(result);
            await new Promise(r => setTimeout(r, 800));
        }
    }
    
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(REPORTS_DIR, `github-scraping-${timestamp}.json`);

    const summary = {
        totalSources: Object.keys(results).length,
        totalRepos: Object.values(results).reduce((n, arr) => n + arr.length, 0),
        totalKeywordsFound: Object.values(results).flat().reduce((sum, repo) => sum + (repo.foundKeywords?.length || 0), 0),
        totalErrors: Object.values(results).flat().filter(r => r.error).length,
        totalStars: Object.values(results).flat().reduce((sum, repo) => sum + (repo.stars || 0), 0),
        durationMs: duration
    };

    const report = { timestamp: new Date().toISOString(), duration: `${duration}ms`, results, summary };
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Rapport GitHub: ${reportPath}`);
    return report;
}

async function main() {
    try {
        [SOURCES_DIR, EXTERNAL_DIR, CACHE_DIR, REPORTS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));
        await scrapeAllGitHubSources();
    } catch (error) {
        console.error('❌ Erreur lors du scraping GitHub:', error);
        process.exit(1);
    }
}

if (require.main === module) main();

module.exports = { scrapeAllGitHubSources, scrapeGitHubRepo };
