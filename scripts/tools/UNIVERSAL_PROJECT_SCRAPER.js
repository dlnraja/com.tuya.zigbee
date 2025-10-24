#!/usr/bin/env node
'use strict';

/**
 * UNIVERSAL PROJECT SCRAPER v1.0
 * Scrape TOUT le projet pour rendre le Master Orchestrator universel
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '../..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');
const OUTPUT_DIR = path.join(DOCS_DIR, 'analysis');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Scrape all scripts
function scrapeAllScripts() {
  console.log('\n📊 Scraping All Scripts...');
  const scripts = { analysis: [], automation: [], enrichment: [], fixes: [], generation: [], validation: [], other: [] };
  
  function scanDir(dir, category) {
    try {
      for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          const sub = path.basename(fullPath);
          scanDir(fullPath, ['analysis', 'automation', 'enrichment', 'fixes', 'generation', 'validation'].includes(sub) ? sub : category);
        } else if (item.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          (scripts[category] || scripts.other).push({
            name: path.basename(item, '.js'),
            path: path.relative(PROJECT_ROOT, fullPath),
            lines: content.split('\n').length,
            hasIASZone: /iasZone|enrollResponse/i.test(content),
            hasBattery: /battery/i.test(content),
            hasValidation: /validate|verify/i.test(content),
            hasEnrichment: /enrich|enhance/i.test(content)
          });
        }
      }
    } catch (err) {}
  }
  
  scanDir(SCRIPTS_DIR, 'other');
  console.log(`  ✅ ${Object.values(scripts).reduce((sum, arr) => sum + arr.length, 0)} scripts analyzed`);
  return scripts;
}

// Scrape Git history
function scrapeGitHistory() {
  console.log('\n📝 Scraping Git History...');
  try {
    const log = execSync('git log --all --pretty=format:"%H|%s" --date=iso -100', {
      cwd: PROJECT_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024
    });
    
    const commits = log.split('\n').filter(l => l.trim()).map(l => {
      const [hash, message] = l.split('|');
      return { hash, message };
    });
    
    const categories = { feat: 0, fix: 0, docs: 0, other: 0 };
    commits.forEach(c => {
      const msg = c.message.toLowerCase();
      if (msg.startsWith('feat:')) categories.feat++;
      else if (msg.startsWith('fix:')) categories.fix++;
      else if (msg.startsWith('docs:')) categories.docs++;
      else categories.other++;
    });
    
    console.log(`  ✅ ${commits.length} commits analyzed`);
    return { commits, categories };
  } catch {
    return { commits: [], categories: {} };
  }
}

// Analyze drivers
function analyzeDrivers() {
  console.log('\n🔧 Analyzing Drivers...');
  let total = 0, withIASZone = 0, needsFix = 0;
  
  try {
    for (const dir of fs.readdirSync(DRIVERS_DIR)) {
      const devicePath = path.join(DRIVERS_DIR, dir, 'device.js');
      if (fs.existsSync(devicePath)) {
        total++;
        const content = fs.readFileSync(devicePath, 'utf8');
        if (/iasZone/i.test(content)) withIASZone++;
        if (/enrollResponse/.test(content) && !/writeAttributes.*iasCieAddress/.test(content)) needsFix++;
      }
    }
    console.log(`  ✅ ${total} drivers (IAS Zone: ${withIASZone}, Need Fix: ${needsFix})`);
  } catch {}
  
  return { total, withIASZone, needsFix };
}

// Generate report
function generateReport(data) {
  console.log('\n📄 Generating Report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    scripts: {
      total: Object.values(data.scripts).reduce((sum, arr) => sum + arr.length, 0),
      byCategory: Object.fromEntries(Object.entries(data.scripts).map(([k, v]) => [k, v.length])),
      withIASZone: Object.values(data.scripts).flat().filter(s => s.hasIASZone).length
    },
    gitHistory: {
      total: data.gitHistory.commits.length,
      categories: data.gitHistory.categories
    },
    drivers: data.drivers,
    recommendations: [
      { priority: 'CRITICAL', task: `Fix ${data.drivers.needsFix} drivers with incorrect IAS Zone enrollment` },
      { priority: 'HIGH', task: 'Integrate all validation scripts into Master Orchestrator' },
      { priority: 'MEDIUM', task: 'Create automated diagnostic report processor' }
    ]
  };
  
  const reportPath = path.join(OUTPUT_DIR, `universal_analysis_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  const markdown = `# UNIVERSAL PROJECT ANALYSIS

**Generated:** ${report.timestamp}

## Scripts: ${report.scripts.total}
${Object.entries(report.scripts.byCategory).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Git History: ${report.gitHistory.total} commits
${Object.entries(report.gitHistory.categories).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Drivers: ${report.drivers.total}
- IAS Zone: ${report.drivers.withIASZone}
- Need Fix: ${report.drivers.needsFix}

## Recommendations
${report.recommendations.map((r, i) => `${i + 1}. [${r.priority}] ${r.task}`).join('\n')}
`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'UNIVERSAL_PROJECT_ANALYSIS.md'), markdown);
  console.log(`  ✅ Reports saved to ${path.relative(PROJECT_ROOT, OUTPUT_DIR)}`);
  return report;
}

// Main
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' 🌐 UNIVERSAL PROJECT SCRAPER v1.0');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const scripts = scrapeAllScripts();
  const gitHistory = scrapeGitHistory();
  const drivers = analyzeDrivers();
  
  const report = generateReport({ scripts, gitHistory, drivers });
  
  console.log('\n✅ SCRAPING COMPLETE!');
  console.log(`📊 Total Scripts: ${report.scripts.total}`);
  console.log(`📝 Commits Analyzed: ${report.gitHistory.total}`);
  console.log(`🔧 Drivers: ${report.drivers.total} (Fix needed: ${report.drivers.needsFix})`);
  console.log(`🎯 Recommendations: ${report.recommendations.length}`);
}

main().catch(console.error);
