#!/usr/bin/env node

/**
 * 🔍 MASTER PARSING SUITE
 * 
 * Exécute TOUS les scripts de parsing:
 * - GitHub PRs
 * - GitHub Issues
 * - Forum Homey
 * - Driver capabilities
 * 
 * Génère rapport consolidé de toutes les sources
 * 
 * @version 2.1.46
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUTPUT_DIR = path.join(ROOT, 'github-analysis');

const PARSING_SCRIPTS = [
  { script: 'scripts/parsing/PARSE_GITHUB_PRS.js', name: 'GitHub PRs' },
  { script: 'scripts/parsing/PARSE_GITHUB_ISSUES.js', name: 'GitHub Issues' },
  { script: 'scripts/parsing/PARSE_FORUM_HOMEY.js', name: 'Forum Homey' },
  { script: 'scripts/parsing/PARSE_DRIVER_CAPABILITIES.js', name: 'Driver Capabilities' }
];

function exec(cmd) {
  console.log(`\n▶️  ${cmd}\n`);
  try {
    execSync(cmd, { 
      cwd: ROOT, 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    return true;
  } catch (error) {
    console.warn(`⚠️  ${error.message}`);
    return false;
  }
}

function consolidateResults() {
  console.log('\n📊 CONSOLIDATION DES RÉSULTATS\n');
  
  const consolidated = {
    manufacturerIds: new Set(),
    issues: [],
    deviceRequests: [],
    capabilities: new Set(),
    sources: {}
  };
  
  // Charger résultats GitHub PRs
  const prsFile = path.join(OUTPUT_DIR, 'manufacturer_ids_from_prs.json');
  if (fs.existsSync(prsFile)) {
    const prsIds = JSON.parse(fs.readFileSync(prsFile, 'utf-8'));
    prsIds.forEach(id => consolidated.manufacturerIds.add(id));
    consolidated.sources.githubPRs = prsIds.length;
  }
  
  // Charger résultats Forum
  const forumFile = path.join(OUTPUT_DIR, 'manufacturer_ids_from_forum.json');
  if (fs.existsSync(forumFile)) {
    const forumIds = JSON.parse(fs.readFileSync(forumFile, 'utf-8'));
    forumIds.forEach(id => consolidated.manufacturerIds.add(id));
    consolidated.sources.forum = forumIds.length;
  }
  
  // Charger résultats Issues
  const issuesFile = path.join(OUTPUT_DIR, 'all_issues.json');
  if (fs.existsSync(issuesFile)) {
    const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf-8'));
    if (issuesData.stats) {
      consolidated.sources.githubIssues = issuesData.stats.total;
      consolidated.deviceRequests = issuesData.stats.deviceRequests || [];
    }
  }
  
  // Charger capabilities
  const capFile = path.join(ROOT, 'reports', 'driver_capabilities.json');
  if (fs.existsSync(capFile)) {
    const capData = JSON.parse(fs.readFileSync(capFile, 'utf-8'));
    if (capData.stats && capData.stats.uniqueCapabilities) {
      capData.stats.uniqueCapabilities.forEach(cap => consolidated.capabilities.add(cap));
      consolidated.sources.capabilities = capData.stats.uniqueCapabilities.length;
    }
  }
  
  return {
    manufacturerIds: Array.from(consolidated.manufacturerIds),
    deviceRequests: consolidated.deviceRequests,
    capabilities: Array.from(consolidated.capabilities),
    sources: consolidated.sources,
    totals: {
      manufacturerIds: consolidated.manufacturerIds.size,
      deviceRequests: consolidated.deviceRequests.length,
      capabilities: consolidated.capabilities.size
    }
  };
}

async function main() {
  console.log('\n🔍 MASTER PARSING SUITE\n');
  console.log('='.repeat(70) + '\n');
  
  const startTime = Date.now();
  const results = {};
  
  // Créer output dir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Exécuter chaque script de parsing
  for (const { script, name } of PARSING_SCRIPTS) {
    console.log(`\n📋 ${name}\n`);
    console.log('='.repeat(70) + '\n');
    results[name] = exec(`node ${script}`);
  }
  
  // Consolidation
  console.log('\n📊 CONSOLIDATION\n');
  console.log('='.repeat(70) + '\n');
  
  const consolidated = consolidateResults();
  
  console.log('📈 RÉSULTATS CONSOLIDÉS:\n');
  console.log(`🏭 Manufacturer IDs uniques: ${consolidated.totals.manufacturerIds}`);
  console.log(`📱 Device requests: ${consolidated.totals.deviceRequests}`);
  console.log(`🎯 Capabilities: ${consolidated.totals.capabilities}`);
  
  console.log('\n📊 PAR SOURCE:\n');
  Object.entries(consolidated.sources).forEach(([source, count]) => {
    console.log(`${source.padEnd(20)}: ${count}`);
  });
  
  // Sauvegarder consolidé
  const consolidatedFile = path.join(OUTPUT_DIR, 'consolidated_results.json');
  fs.writeFileSync(consolidatedFile, JSON.stringify(consolidated, null, 2));
  console.log(`\n💾 Résultats consolidés: ${consolidatedFile}`);
  
  // Durée
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  Durée totale: ${duration}s`);
  
  console.log('\n✅ PARSING TERMINÉ!\n');
}

main().catch(console.error);
