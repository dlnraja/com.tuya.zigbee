#!/usr/bin/env node

/**
 * SCRAPE COMMUNITY PRS
 * Check for open PRs that add device support
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_API_URL = 'https://api.github.com/repos/dlnraja/com.tuya.zigbee/pulls';
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'data', 'enrichment', 'community-prs.json');

console.log('\n🔍 CHECKING COMMUNITY PRS\n');
console.log('═'.repeat(70));

const devicePRs = [];

function fetchGitHub(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Tuya-Zigbee-App',
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function checkOpenPRs() {
    console.log('\n📥 Fetching open PRs...\n');
    
    try {
        const prs = await fetchGitHub(GITHUB_API_URL + '?state=open');
        
        if (!Array.isArray(prs)) {
            console.log('⚠️  No PRs found or API limit reached');
            return;
        }
        
        console.log(`Found ${prs.length} open PRs\n`);
        
        for (const pr of prs) {
            // Check if PR adds device support
            const title = pr.title.toLowerCase();
            const body = (pr.body || '').toLowerCase();
            
            const isDeviceSupport = 
                title.includes('device') ||
                title.includes('support') ||
                title.includes('add') && (title.includes('manufacturer') || title.includes('model')) ||
                body.includes('manufacturer id') ||
                body.includes('_tz');
            
            if (isDeviceSupport) {
                console.log(`✅ PR #${pr.number}: ${pr.title}`);
                console.log(`   Author: ${pr.user.login}`);
                console.log(`   Created: ${new Date(pr.created_at).toLocaleDateString()}`);
                
                // Fetch files changed
                try {
                    const files = await fetchGitHub(pr.url + '/files');
                    const driverFiles = files.filter(f => 
                        f.filename.includes('driver.compose.json')
                    );
                    
                    if (driverFiles.length > 0) {
                        console.log(`   Files: ${driverFiles.length} driver files modified`);
                        
                        devicePRs.push({
                            number: pr.number,
                            title: pr.title,
                            author: pr.user.login,
                            created_at: pr.created_at,
                            updated_at: pr.updated_at,
                            url: pr.html_url,
                            files: driverFiles.map(f => f.filename),
                            state: pr.state
                        });
                    }
                } catch (error) {
                    console.log(`   ⚠️  Could not fetch files: ${error.message}`);
                }
                
                console.log('');
            }
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

async function saveResults() {
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const result = {
        date: new Date().toISOString(),
        source: 'github_prs',
        totalPRs: devicePRs.length,
        prs: devicePRs,
        recommendations: []
    };
    
    // Add recommendations
    for (const pr of devicePRs) {
        const age = Math.floor((Date.now() - new Date(pr.updated_at)) / (1000 * 60 * 60 * 24));
        
        if (age > 30) {
            result.recommendations.push({
                pr: pr.number,
                action: 'close_stale',
                reason: `No activity for ${age} days`
            });
        } else if (age < 7) {
            result.recommendations.push({
                pr: pr.number,
                action: 'review',
                reason: 'Recent PR, needs review'
            });
        }
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`\n📄 Results saved: ${OUTPUT_FILE}`);
}

// Main execution
(async () => {
    await checkOpenPRs();
    await saveResults();
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 SUMMARY\n');
    console.log(`Device support PRs:  ${devicePRs.length}`);
    console.log('\n✅ CHECKING COMPLETE!\n');
    
    if (devicePRs.length > 0) {
        console.log('💡 ACTION REQUIRED:');
        console.log('   Review these PRs manually or use auto-pr-handler workflow\n');
    }
    
    process.exit(0);
})();
