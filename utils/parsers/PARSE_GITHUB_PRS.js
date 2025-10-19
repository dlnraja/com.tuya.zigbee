#!/usr/bin/env node

/**
 * 🔍 PARSE GITHUB PULL REQUESTS
 * 
 * Parse et analyse toutes les PRs de Johan Bendz et forks
 * pour extraire les manufacturer IDs et amélirations
 * 
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT, 'github-analysis');

// Repositories à analyser
const REPOS = [
  'JohanBendz/com.tuya.zigbee',
  'dlnraja/com.tuya.zigbee',
  // Forks principaux
  'TheHomeyAppBackupRepositories/com.tuya.zigbee'
];

/**
 * Fetch GitHub API (sans authentification pour éviter rate limits)
 */
function fetchGitHub(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Tuya-Zigbee-Parser',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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

/**
 * Extrait les manufacturer IDs d'un diff
 */
function extractManufacturerIds(diff) {
  const ids = new Set();
  const patterns = [
    /_TZ\d{4}_[a-z0-9]{8}/g,
    /_TZE\d{3}_[a-z0-9]{8}/g,
    /TS\d{4}[A-Z]?/g,
    /MOES|BSEED|Lonsonho|Nedis|Woodupp/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = diff.match(pattern) || [];
    matches.forEach(id => ids.add(id));
  });
  
  return Array.from(ids);
}

/**
 * Parse une PR
 */
async function parsePR(repo, pr) {
  console.log(`  📄 PR #${pr.number}: ${pr.title}`);
  
  const data = {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    merged_at: pr.merged_at,
    user: pr.user.login,
    labels: pr.labels.map(l => l.name),
    manufacturerIds: [],
    filesChanged: 0
  };
  
  // Récupérer les fichiers modifiés
  try {
    const files = await fetchGitHub(pr.url + '/files');
    data.filesChanged = files.length;
    
    // Extraire les manufacturer IDs des diffs
    for (const file of files) {
      if (file.filename.includes('driver.compose.json') && file.patch) {
        const ids = extractManufacturerIds(file.patch);
        data.manufacturerIds.push(...ids);
      }
    }
    
    data.manufacturerIds = [...new Set(data.manufacturerIds)];
  } catch (error) {
    console.warn(`    ⚠️  Erreur fichiers PR: ${error.message}`);
  }
  
  return data;
}

/**
 * Parse toutes les PRs d'un repo
 */
async function parseRepoPRs(repo) {
  console.log(`\n📦 Repository: ${repo}\n`);
  
  try {
    // Fetch PRs (max 100 par page)
    const prs = await fetchGitHub(`https://api.github.com/repos/${repo}/pulls?state=all&per_page=100`);
    
    if (!Array.isArray(prs)) {
      console.warn(`⚠️  Pas de PRs trouvées pour ${repo}`);
      return [];
    }
    
    console.log(`📊 ${prs.length} PRs trouvées\n`);
    
    const results = [];
    for (const pr of prs) {
      const data = await parsePR(repo, pr);
      results.push(data);
      
      // Rate limiting (1 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
    
  } catch (error) {
    console.error(`❌ Erreur repo ${repo}: ${error.message}`);
    return [];
  }
}

/**
 * Analyse et sauvegarde les résultats
 */
function analyzeResults(allPRs) {
  console.log('\n📊 ANALYSE RÉSULTATS\n');
  
  const stats = {
    totalPRs: allPRs.length,
    merged: allPRs.filter(pr => pr.merged_at).length,
    open: allPRs.filter(pr => pr.state === 'open').length,
    closed: allPRs.filter(pr => pr.state === 'closed' && !pr.merged_at).length,
    totalManufacturerIds: 0,
    uniqueManufacturerIds: new Set(),
    prsByUser: {}
  };
  
  allPRs.forEach(pr => {
    // Count manufacturer IDs
    stats.totalManufacturerIds += pr.manufacturerIds.length;
    pr.manufacturerIds.forEach(id => stats.uniqueManufacturerIds.add(id));
    
    // Count by user
    stats.prsByUser[pr.user] = (stats.prsByUser[pr.user] || 0) + 1;
  });
  
  stats.uniqueManufacturerIds = Array.from(stats.uniqueManufacturerIds);
  
  console.log(`📈 Total PRs: ${stats.totalPRs}`);
  console.log(`✅ Merged: ${stats.merged}`);
  console.log(`🔓 Open: ${stats.open}`);
  console.log(`❌ Closed: ${stats.closed}`);
  console.log(`🏭 Manufacturer IDs uniques: ${stats.uniqueManufacturerIds.length}`);
  console.log(`👥 Contributeurs: ${Object.keys(stats.prsByUser).length}`);
  
  return stats;
}

async function main() {
  console.log('\n🔍 PARSE GITHUB PULL REQUESTS\n');
  console.log('='.repeat(70) + '\n');
  
  // Créer output dir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const allPRs = [];
  
  // Parse chaque repo
  for (const repo of REPOS) {
    const prs = await parseRepoPRs(repo);
    allPRs.push(...prs);
  }
  
  // Analyser
  const stats = analyzeResults(allPRs);
  
  // Sauvegarder
  const outputFile = path.join(OUTPUT_DIR, 'all_pull_requests.json');
  fs.writeFileSync(outputFile, JSON.stringify({ prs: allPRs, stats }, null, 2));
  console.log(`\n💾 Sauvegardé: ${outputFile}`);
  
  // Sauvegarder manufacturer IDs uniques
  const idsFile = path.join(OUTPUT_DIR, 'manufacturer_ids_from_prs.json');
  fs.writeFileSync(idsFile, JSON.stringify(stats.uniqueManufacturerIds, null, 2));
  console.log(`💾 Manufacturer IDs: ${idsFile}`);
  
  console.log('\n✅ PARSING TERMINÉ!\n');
}

main().catch(console.error);
