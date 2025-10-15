const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE EXHAUSTIVE GITHUB - UNIVERSAL TUYA ZIGBEE\n');

// Configuration
const REPO_OWNER = 'JohanBendz';
const REPO_NAME = 'com.tuya.zigbee';
const OUTPUT_DIR = path.join(__dirname, '..', 'github-analysis');
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 secondes

// Créer dossier output
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Fonction sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction requête HTTP avec retry
async function httpRequest(url, retries = MAX_RETRIES) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Homey-App-Analyzer',
                'Accept': 'application/json'
            }
        };

        const attemptRequest = (attemptsLeft) => {
            https.get(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            console.log(`⚠️  Parse error: ${url}`);
                            resolve({ error: 'parse_error', data: data.substring(0, 100) });
                        }
                    } else if (res.statusCode === 403 && attemptsLeft > 0) {
                        console.log(`⏳ Rate limit (${url}), retry in ${RETRY_DELAY}ms...`);
                        setTimeout(() => attemptRequest(attemptsLeft - 1), RETRY_DELAY);
                    } else {
                        console.log(`⚠️  HTTP ${res.statusCode}: ${url}`);
                        resolve({ error: res.statusCode, url });
                    }
                });
            }).on('error', (err) => {
                if (attemptsLeft > 0) {
                    console.log(`⚠️  Network error, retry... (${attemptsLeft} left)`);
                    setTimeout(() => attemptRequest(attemptsLeft - 1), RETRY_DELAY);
                } else {
                    console.log(`❌ Failed: ${url}`);
                    resolve({ error: 'network_error', message: err.message });
                }
            });
        };

        attemptRequest(retries);
    });
}

// Analyse Pull Requests
async function analyzePullRequests() {
    console.log('\n📋 ANALYSE PULL REQUESTS (ALL)...\n');
    
    const allPRs = [];
    const states = ['open', 'closed', 'all'];
    
    for (const state of states) {
        console.log(`\n🔍 PRs state: ${state}...`);
        let page = 1;
        let hasMore = true;
        
        while (hasMore && page <= 10) { // Max 10 pages par state
            const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=${state}&per_page=100&page=${page}`;
            console.log(`   Page ${page}...`);
            
            const prs = await httpRequest(url);
            await sleep(500); // Rate limiting gentle
            
            if (prs.error || !Array.isArray(prs) || prs.length === 0) {
                hasMore = false;
                break;
            }
            
            allPRs.push(...prs);
            console.log(`   ✅ ${prs.length} PRs récupérées`);
            
            if (prs.length < 100) hasMore = false;
            page++;
        }
    }
    
    // Dédupliquer par numéro
    const uniquePRs = Array.from(new Map(allPRs.map(pr => [pr.number, pr])).values());
    
    console.log(`\n✅ Total PRs uniques: ${uniquePRs.length}`);
    
    // Sauvegarder
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'all_pull_requests.json'),
        JSON.stringify(uniquePRs, null, 2)
    );
    
    return uniquePRs;
}

// Analyse Issues
async function analyzeIssues() {
    console.log('\n📋 ANALYSE ISSUES (ALL)...\n');
    
    const allIssues = [];
    const states = ['open', 'closed', 'all'];
    
    for (const state of states) {
        console.log(`\n🔍 Issues state: ${state}...`);
        let page = 1;
        let hasMore = true;
        
        while (hasMore && page <= 10) {
            const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=${state}&per_page=100&page=${page}`;
            console.log(`   Page ${page}...`);
            
            const issues = await httpRequest(url);
            await sleep(500);
            
            if (issues.error || !Array.isArray(issues) || issues.length === 0) {
                hasMore = false;
                break;
            }
            
            // Filtrer PRs (issues inclut PRs dans GitHub API)
            const realIssues = issues.filter(issue => !issue.pull_request);
            allIssues.push(...realIssues);
            
            console.log(`   ✅ ${realIssues.length} Issues récupérées`);
            
            if (issues.length < 100) hasMore = false;
            page++;
        }
    }
    
    // Dédupliquer
    const uniqueIssues = Array.from(new Map(allIssues.map(issue => [issue.number, issue])).values());
    
    console.log(`\n✅ Total Issues uniques: ${uniqueIssues.length}`);
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'all_issues.json'),
        JSON.stringify(uniqueIssues, null, 2)
    );
    
    return uniqueIssues;
}

// Analyse Forks
async function analyzeForks() {
    console.log('\n📋 ANALYSE FORKS...\n');
    
    const allForks = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 5) {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/forks?per_page=100&page=${page}`;
        console.log(`Page ${page}...`);
        
        const forks = await httpRequest(url);
        await sleep(500);
        
        if (forks.error || !Array.isArray(forks) || forks.length === 0) {
            hasMore = false;
            break;
        }
        
        allForks.push(...forks);
        console.log(`✅ ${forks.length} Forks récupérés`);
        
        if (forks.length < 100) hasMore = false;
        page++;
    }
    
    console.log(`\n✅ Total Forks: ${allForks.length}`);
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'all_forks.json'),
        JSON.stringify(allForks, null, 2)
    );
    
    return allForks;
}

// Extraire manufacturer IDs depuis texte
function extractManufacturerIDs(text) {
    if (!text) return [];
    
    const patterns = [
        /_TZ[A-Z0-9]{4}_[a-z0-9]{8}/g,  // _TZ3000_abcdefgh
        /_TZE[0-9]{3}_[a-z0-9]{8}/g,    // _TZE200_abcdefgh, _TZE284_abcdefgh
        /TS[0-9]{4}[A-Z]?/g,             // TS0601, TS011F
        /_TZ[0-9]{4}_[a-z0-9]{8}/g      // _TZ1800_abcdefgh
    ];
    
    const ids = new Set();
    
    patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(id => ids.add(id));
        }
    });
    
    return Array.from(ids);
}

// Analyser contenu PR/Issue
async function analyzeContent(item, type) {
    const ids = new Set();
    
    // Titre
    extractManufacturerIDs(item.title).forEach(id => ids.add(id));
    
    // Body
    extractManufacturerIDs(item.body).forEach(id => ids.add(id));
    
    // Essayer de récupérer les comments (avec rate limiting)
    if (item.comments > 0 && item.comments_url) {
        try {
            const comments = await httpRequest(item.comments_url);
            await sleep(300);
            
            if (Array.isArray(comments)) {
                comments.forEach(comment => {
                    extractManufacturerIDs(comment.body).forEach(id => ids.add(id));
                });
            }
        } catch (error) {
            console.log(`⚠️  Erreur comments ${type} #${item.number}`);
        }
    }
    
    return Array.from(ids);
}

// Main
async function main() {
    console.log('🚀 DÉMARRAGE ANALYSE EXHAUSTIVE\n');
    console.log('Configuration:');
    console.log(`  Repository: ${REPO_OWNER}/${REPO_NAME}`);
    console.log(`  Output: ${OUTPUT_DIR}`);
    console.log(`  Max retries: ${MAX_RETRIES}`);
    console.log(`  Retry delay: ${RETRY_DELAY}ms\n`);
    
    const results = {
        timestamp: new Date().toISOString(),
        repository: `${REPO_OWNER}/${REPO_NAME}`,
        pullRequests: { total: 0, analyzed: 0, ids: [] },
        issues: { total: 0, analyzed: 0, ids: [] },
        forks: { total: 0, ids: [] },
        allManufacturerIDs: new Set(),
        summary: {}
    };
    
    try {
        // 1. Pull Requests
        const prs = await analyzePullRequests();
        results.pullRequests.total = prs.length;
        
        console.log('\n🔍 EXTRACTION IDs DEPUIS PRs...');
        for (let i = 0; i < prs.length && i < 50; i++) {
            const pr = prs[i];
            const ids = await analyzeContent(pr, 'PR');
            
            if (ids.length > 0) {
                console.log(`  PR #${pr.number}: ${ids.length} IDs`);
                results.pullRequests.ids.push({ number: pr.number, title: pr.title, ids });
                ids.forEach(id => results.allManufacturerIDs.add(id));
                results.pullRequests.analyzed++;
            }
            
            if (i % 10 === 0) await sleep(1000); // Rate limiting
        }
        
        // 2. Issues
        const issues = await analyzeIssues();
        results.issues.total = issues.length;
        
        console.log('\n🔍 EXTRACTION IDs DEPUIS ISSUES...');
        for (let i = 0; i < issues.length && i < 50; i++) {
            const issue = issues[i];
            const ids = await analyzeContent(issue, 'Issue');
            
            if (ids.length > 0) {
                console.log(`  Issue #${issue.number}: ${ids.length} IDs`);
                results.issues.ids.push({ number: issue.number, title: issue.title, ids });
                ids.forEach(id => results.allManufacturerIDs.add(id));
                results.issues.analyzed++;
            }
            
            if (i % 10 === 0) await sleep(1000);
        }
        
        // 3. Forks
        const forks = await analyzeForks();
        results.forks.total = forks.length;
        results.forks.list = forks.map(f => ({ name: f.full_name, url: f.html_url }));
        
        // Finaliser
        results.allManufacturerIDs = Array.from(results.allManufacturerIDs).sort();
        results.summary = {
            totalPRs: results.pullRequests.total,
            analyzedPRs: results.pullRequests.analyzed,
            totalIssues: results.issues.total,
            analyzedIssues: results.issues.analyzed,
            totalForks: results.forks.total,
            totalManufacturerIDs: results.allManufacturerIDs.length
        };
        
        // Sauvegarder résultats
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'analysis_results.json'),
            JSON.stringify(results, null, 2)
        );
        
        // Rapport texte
        const report = `
# 📊 RAPPORT ANALYSE EXHAUSTIVE GITHUB

**Date:** ${results.timestamp}
**Repository:** ${results.repository}

## 🎯 RÉSUMÉ

- **Pull Requests:** ${results.summary.totalPRs} (${results.summary.analyzedPRs} analysées)
- **Issues:** ${results.summary.totalIssues} (${results.summary.analyzedIssues} analysées)
- **Forks:** ${results.summary.totalForks}
- **Manufacturer IDs trouvés:** ${results.summary.totalManufacturerIDs}

## 📋 MANUFACTURER IDs EXTRAITS

${results.allManufacturerIDs.map(id => `- \`${id}\``).join('\n')}

## 📊 DÉTAILS PAR SOURCE

### Pull Requests (${results.pullRequests.ids.length})
${results.pullRequests.ids.map(pr => `
#### PR #${pr.number}: ${pr.title}
${pr.ids.map(id => `- \`${id}\``).join('\n')}
`).join('\n')}

### Issues (${results.issues.ids.length})
${results.issues.ids.map(issue => `
#### Issue #${issue.number}: ${issue.title}
${issue.ids.map(id => `- \`${id}\``).join('\n')}
`).join('\n')}

### Forks (${results.forks.total})
${results.forks.list ? results.forks.list.slice(0, 20).map(f => `- [${f.name}](${f.url})`).join('\n') : 'N/A'}

---

**Fichiers générés:**
- \`all_pull_requests.json\` - Toutes les PRs
- \`all_issues.json\` - Toutes les Issues
- \`all_forks.json\` - Tous les forks
- \`analysis_results.json\` - Résultats complets
- \`RAPPORT_ANALYSE.md\` - Ce rapport
`;
        
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'RAPPORT_ANALYSE.md'),
            report
        );
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ ANALYSE TERMINÉE');
        console.log('='.repeat(70));
        console.log(`\n📊 RÉSULTATS:`);
        console.log(`  Pull Requests: ${results.summary.totalPRs} (${results.summary.analyzedPRs} analysées)`);
        console.log(`  Issues: ${results.summary.totalIssues} (${results.summary.analyzedIssues} analysées)`);
        console.log(`  Forks: ${results.summary.totalForks}`);
        console.log(`  Manufacturer IDs: ${results.summary.totalManufacturerIDs}`);
        console.log(`\n📁 Fichiers sauvegardés dans: ${OUTPUT_DIR}`);
        console.log(`\n🎉 TERMINÉ!\n`);
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error.stack);
    }
}

// Exécution
main().catch(console.error);
