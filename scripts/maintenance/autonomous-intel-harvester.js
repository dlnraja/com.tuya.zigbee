#!/usr/bin/env node
/**
 * 
 *   AUTONOMOUS INTEL HARVESTER v1.0.0 (Thinking Reimplementation Engine inspired)              
 * 
 *   Going beyond ManufacturerNames. Harvesting "Smart Ideas & Methods"          
 *   from the entire fork ecosystem (ascending & descending).                     
 * 
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data', 'intel-harvest');
const REPORT_FILE = path.join(ROOT, 'REPORTS', 'INTELLECTUAL-ENRICHMENT.md');
const STATE_FILE = path.join(ROOT, '.github', 'state', 'intel-harvester-state.json');

// Configuration
const UPSTREAM = 'dlnraja/com.tuya.zigbee';
const OWN = 'dlnraja/com.tuya.zigbee';
const INTEL_KEYWORDS = [
  'calibration', 'offset', 'correction', 'firmware_workaround', 
  'retry_logic', 'exponential_backoff', 'local_scene', 'group_endpoint',
  'power_limit', 'child_lock', 'backlight_mode', 'inching', 'on_off_memory',
  'over_current_protection', 'energy_multiply', 'division_factor',
  'mcu_version', 'raw_mcu', 'serial_baud', 'uart_config', 'tuya_mcu_ota',
  'dp_custom_raw', 'enum_mapping_mcu'
];

function gh(cmd) {
  try {
    return execSync(`gh ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log(' Starting Autonomous Intel Harvester (Autonomous Engine Reimplementation Mode)...');

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(path.dirname(REPORT_FILE))) fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });

  // 1. Get all forks + Upstream branches
  console.log('   Identifying all ecosystem sources (Ascending & Descending)...');
  const forksRaw = gh(`api repos/${UPSTREAM}/forks --per-page 100`);
  const forks = JSON.parse(forksRaw || '[]');
  
  // Add Upstream itself to the analysis list
  forks.unshift({ full_name: UPSTREAM, pushed_at: new Date().toISOString() });
  
  console.log(`    Found ${forks.length} potential innovation sources.`);

  const harvest = {
    timestamp: new Date().toISOString(),
    newMethods: [],
    structuralInnovations: [],
    hiddenGems: [],
    forksAnalyzed: 0,
    branchesScanned: 0
  };

  // 2. Perform Deep Structural Analysis on top source repositories
  const activeSources = forks
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, 20);

  for (const source of activeSources) {
    console.log(`   Analyzing source: ${source.full_name}`);
    harvest.forksAnalyzed++;

    // Get all branches for this source
    const branchesRaw = gh(`api repos/${source.full_name}/branches`);
    const branches = JSON.parse(branchesRaw || '[]');
    
    for (const br of branches) {
      const branchName = br.name;
      harvest.branchesScanned++;
      console.log(`     Scanning branch: ${branchName}`);

      // A. Check for new files in lib/ on this branch
      const libFilesRaw = gh(`api repos/${source.full_name}/contents/lib? ref=${branchName}`)       ;
      if (libFilesRaw) {
        const libFiles = JSON.parse(libFilesRaw );
        for (const file of libFiles) {
          if (file.type === 'file' && !fs.existsSync(path.join(ROOT, 'lib', file.name))) {
            harvest.structuralInnovations.push({
              source: source.full_name,
              branch: branchName,
              file: file.name,
              url: file.html_url
            });
          }
        }
      }

      // B. Analyze core logic files for new Methods on this branch
      const importantFiles = ['app.js', 'lib/BaseHybridDevice.js', 'lib/TuyaEF00Manager.js', 'lib/UniversalDataHandler.js'];
      for (const fpath of importantFiles) {
        const remoteContent = gh(`api repos/${source.full_name}/contents/${fpath}? ref=${branchName} --template '{{.content}}' | base64 -d`)       ;
        if (!remoteContent) continue;

        const localPath = path.join(ROOT, fpath);
        if (!fs.existsSync(localPath)) continue;
        const localContent = fs.readFileSync(localPath, 'utf8');

        const funcRegex = /(?:async\s+)? ([a-zA-Z0-9_]+)\s*\([^)]*\ : null)\s*\{/g       ;
        const remoteMethods = [...remoteContent.matchAll(funcRegex)].map(m => m[1]);
        const localMethods = [...localContent.matchAll(funcRegex)].map(m => m[1]);

        const newMethods = remoteMethods.filter(m => !localMethods.includes(m) && !m.startsWith('_'));
        if (newMethods.length > 0) {
          harvest.newMethods.push({
            source: source.full_name,
            branch: branchName,
            file: fpath,
            methods: newMethods
          });
        }

        // C. Search for Intel Keywords
        for (const kw of INTEL_KEYWORDS) {
          if (remoteContent.includes(kw) && !localContent.includes(kw)) {
            harvest.hiddenGems.push({
              source: source.full_name,
              branch: branchName,
              file: fpath,
              keyword: kw,
              context: 'Silent implementation for ' + kw
            });
          }
        }
      }
    }
  }

  // 3. New section: Community Diagnostic Harvesting (Rule 10)
  console.log('   Harvesting community diagnostic data...');
  const COMMUNITY_DIAGS = [
    path.join(ROOT, 'diagnostics', 'summary.json'),
    path.join(ROOT, 'diagnostics', 'diag_forum.json')
  ];

  COMMUNITY_DIAGS.forEach(f => {
    if (!fs.existsSync(f)) return;
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      const unmatched = data.unmatchedFPs || [];
      unmatched.forEach(item => {
        const fp = item.fp;
        const context = item.subj || item.msg || '';
        
        // Inference Logic
        let inferredCategory = 'unknown';
        if (context.toLowerCase().includes('curtain') || context.toLowerCase().includes('blind')) inferredCategory = 'curtain';
        else if (context.toLowerCase().includes('switch') || context.toLowerCase().includes('gang')) inferredCategory = 'switch';
        else if (context.toLowerCase().includes('plug') || context.toLowerCase().includes('outlet')) inferredCategory = 'plug';
        else if (context.toLowerCase().includes('temp') || context.toLowerCase().includes('climate')) inferredCategory = 'sensor_climate';
        else if (context.toLowerCase().includes('motion') || context.toLowerCase().includes('radar')) inferredCategory = 'sensor_motion';

        harvest.hiddenGems.push({
          source: 'community_diag',
          fp,
          inferredCategory,
          context: `From: ${item.source || 'forum'} | Subj: ${context}`
        });
      });
    } catch (e) {}
  });

  // 4. Generate Intellectual Enrichment Report
  console.log('   Generating Intellectual Enrichment Report...');
  let md = `# Intellectual Enrichment Report (Thinking Reimplementation Engine)\n`;
  md += `*Generated: ${harvest.timestamp} | Forks Analyzed: ${harvest.forksAnalyzed}*\n\n`;

  md += `##  Structural Innovations (New Files)\n`;
  if (harvest.structuralInnovations.length === 0) md += `_No new biological structures found._\n`;
  for (const si of harvest.structuralInnovations) {
    md += `- **${si.file}** in \`${si.source}\` [View Source](${si.url})\n`;
  }

  md += `\n##  Smart Methods & Logic Extensions\n`;
  if (harvest.newMethods.length === 0) md += `_No new cognitive pathways detected._\n`;
  for (const nm of harvest.newMethods) {
    md += `### ${nm.file} (${nm.source})\n`;
    md += `Found methods: ${nm.methods.map(m => `\`${m}\``).join(', ')}\n\n`;
  }

  md += `\n##  Community Gems (Unmatched Fingerprints & Inferred Categories)\n`;
  const communityGems = harvest.hiddenGems.filter(g => g.source === 'community_diag');
  if (communityGems.length === 0) md += `_No new community patterns extracted._\n`;
  for (const gem of communityGems) {
    md += `- **${gem.fp}** (Category: \`${gem.inferredCategory}\`) - ${gem.context}\n`;
  }

  md += `\n##  Hidden Gems (Advanced Tuya Patterns from Forks)\n`;
  const forkGems = harvest.hiddenGems.filter(g => g.source !== 'community_diag');
  if (forkGems.length === 0) md += `_No rare elements extracted._\n`;
  const uniqueGems = [...new Set(forkGems.map(g => g.keyword))];
  for (const kw of uniqueGems) {
    const examples = forkGems.filter(g => g.keyword === kw);
    md += `- **${kw}**: Detected in ${examples.length} location(s) (e.g., \`${examples[0].source}\`)\n`;
  }

  fs.writeFileSync(REPORT_FILE, md);
  fs.writeFileSync(path.join(DATA_DIR, 'latest-harvest.json'), JSON.stringify(harvest, null, 2));

  console.log(` Intelligence Harvest complete! Report: ${REPORT_FILE}`);
}

main().catch(e => {
  console.error(' Harvester Failed:', e);
  process.exit(1);
});
