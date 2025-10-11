#!/usr/bin/env node

/**
 * 🐛 PARSE GITHUB ISSUES
 * 
 * Parse et analyse toutes les issues GitHub
 * pour identifier les bugs et demandes de devices
 * 
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT, 'github-analysis');

const REPOS = [
  'JohanBendz/com.tuya.zigbee',
  'dlnraja/com.tuya.zigbee'
];

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
 * Catégorise une issue
 */
function categorizeIssue(issue) {
  const title = issue.title.toLowerCase();
  const body = (issue.body || '').toLowerCase();
  const labels = issue.labels.map(l => l.name.toLowerCase());
  
  const categories = [];
  
  // Device requests
  if (labels.includes('device request') || 
      title.includes('add support') || 
      title.includes('new device')) {
    categories.push('device-request');
  }
  
  // Bugs
  if (labels.includes('bug') || 
      title.includes('not working') || 
      title.includes('error')) {
    categories.push('bug');
  }
  
  // Feature requests
  if (labels.includes('enhancement') || 
      title.includes('feature')) {
    categories.push('feature');
  }
  
  // Pairing issues
  if (title.includes('pair') || 
      title.includes('pairing') || 
      body.includes('pairing')) {
    categories.push('pairing-issue');
  }
  
  return categories.length ? categories : ['other'];
}

/**
 * Extrait manufacturer IDs et device info
 */
function extractDeviceInfo(issue) {
  const text = `${issue.title} ${issue.body || ''}`;
  
  const info = {
    manufacturerIds: [],
    deviceNames: [],
    models: []
  };
  
  // Manufacturer IDs
  const idPatterns = [
    /_TZ\d{4}_[a-z0-9]{8}/g,
    /_TZE\d{3}_[a-z0-9]{8}/g,
    /TS\d{4}[A-Z]?/g
  ];
  
  idPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    info.manufacturerIds.push(...matches);
  });
  
  // Model numbers
  const modelPattern = /model[:\s]+([A-Z0-9-]+)/gi;
  let match;
  while ((match = modelPattern.exec(text)) !== null) {
    info.models.push(match[1]);
  }
  
  // Device names
  const devicePattern = /(switch|sensor|plug|bulb|dimmer|curtain|thermostat|lock|smoke|motion|temperature|humidity)/gi;
  const devices = text.match(devicePattern) || [];
  info.deviceNames = [...new Set(devices.map(d => d.toLowerCase()))];
  
  return info;
}

/**
 * Parse une issue
 */
function parseIssue(issue) {
  const data = {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    user: issue.user.login,
    labels: issue.labels.map(l => l.name),
    categories: categorizeIssue(issue),
    comments: issue.comments,
    ...extractDeviceInfo(issue)
  };
  
  console.log(`  🐛 Issue #${issue.number}: ${data.categories.join(', ')}`);
  
  return data;
}

/**
 * Parse toutes les issues d'un repo
 */
async function parseRepoIssues(repo) {
  console.log(`\n📦 Repository: ${repo}\n`);
  
  try {
    const issues = await fetchGitHub(`https://api.github.com/repos/${repo}/issues?state=all&per_page=100`);
    
    if (!Array.isArray(issues)) {
      console.warn(`⚠️  Pas d'issues trouvées pour ${repo}`);
      return [];
    }
    
    // Filter out PRs (they appear as issues in API)
    const actualIssues = issues.filter(i => !i.pull_request);
    
    console.log(`📊 ${actualIssues.length} issues trouvées\n`);
    
    return actualIssues.map(parseIssue);
    
  } catch (error) {
    console.error(`❌ Erreur repo ${repo}: ${error.message}`);
    return [];
  }
}

/**
 * Analyse résultats
 */
function analyzeResults(allIssues) {
  console.log('\n📊 ANALYSE RÉSULTATS\n');
  
  const stats = {
    total: allIssues.length,
    open: allIssues.filter(i => i.state === 'open').length,
    closed: allIssues.filter(i => i.state === 'closed').length,
    byCategory: {},
    deviceRequests: [],
    bugs: [],
    manufacturerIds: new Set()
  };
  
  allIssues.forEach(issue => {
    // Categories
    issue.categories.forEach(cat => {
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    });
    
    // Device requests
    if (issue.categories.includes('device-request')) {
      stats.deviceRequests.push({
        number: issue.number,
        title: issue.title,
        manufacturerIds: issue.manufacturerIds,
        models: issue.models
      });
    }
    
    // Bugs
    if (issue.categories.includes('bug')) {
      stats.bugs.push({
        number: issue.number,
        title: issue.title,
        state: issue.state
      });
    }
    
    // Manufacturer IDs
    issue.manufacturerIds.forEach(id => stats.manufacturerIds.add(id));
  });
  
  stats.manufacturerIds = Array.from(stats.manufacturerIds);
  
  console.log(`📈 Total issues: ${stats.total}`);
  console.log(`🔓 Open: ${stats.open}`);
  console.log(`✅ Closed: ${stats.closed}`);
  console.log(`\n📊 Par catégorie:`);
  Object.entries(stats.byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
  console.log(`\n📱 Device requests: ${stats.deviceRequests.length}`);
  console.log(`🐛 Bugs reportés: ${stats.bugs.length}`);
  console.log(`🏭 Manufacturer IDs: ${stats.manufacturerIds.length}`);
  
  return stats;
}

async function main() {
  console.log('\n🐛 PARSE GITHUB ISSUES\n');
  console.log('='.repeat(70) + '\n');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const allIssues = [];
  
  for (const repo of REPOS) {
    const issues = await parseRepoIssues(repo);
    allIssues.push(...issues);
  }
  
  const stats = analyzeResults(allIssues);
  
  // Sauvegarder
  const outputFile = path.join(OUTPUT_DIR, 'all_issues.json');
  fs.writeFileSync(outputFile, JSON.stringify({ issues: allIssues, stats }, null, 2));
  console.log(`\n💾 Sauvegardé: ${outputFile}`);
  
  console.log('\n✅ PARSING TERMINÉ!\n');
}

main().catch(console.error);
