const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 RUN_HISTORY_AND_ENRICH_ALL - Orchestrator');

function resolveScript(candidates) {
  for (const rel of candidates) {
    const p = path.join(__dirname, rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function runNodeCandidates(candidates, args = []) {
  const script = resolveScript(candidates);
  if (!script) {
    console.log(`⚠️ Missing script: ${candidates.join(' | ')}`);
    return false;
  }
  console.log(`\n▶️ node ${path.relative(process.cwd(), script)} ${args.join(' ')}`);
  const res = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  if (res.error) console.log(`⚠️ Error: ${res.error.message}`);
  return res.status === 0;
}

// 1) History dumps
runNodeCandidates(['scripts/history/COMPLETE_HISTORY_EXTRACTOR.js','COMPLETE_HISTORY_EXTRACTOR.js']);
runNodeCandidates(['scripts/history/COMPLETE_BRANCH_EXTRACTION.js','COMPLETE_BRANCH_EXTRACTION.js']);
runNodeCandidates(['scripts/history/BYPASS_TIMEOUT_EXTRACTOR.js','BYPASS_TIMEOUT_EXTRACTOR.js']);
runNodeCandidates(['scripts/history/COMPLETE_BACKUP_CONTENT.js','COMPLETE_BACKUP_CONTENT.js']);

// 2) Merge from backups (drivers in backups into current ones)
runNodeCandidates(['backup/RECURSIVE_ENRICH_FROM_BACKUPS.js']);

// 3) Re-run global enrichment
runNodeCandidates(['scraping/COMPARE_ENRICH_ALL_DRIVERS.js']);
runNodeCandidates(['scraping/SCRAPE_ENRICH_MANUFACTURERS.js']);

// 4) Update referentials
runNodeCandidates(['referentials/DEEP_COMPARE_ENRICH_REFERENTIALS.js']);

// 5) Validate
runNodeCandidates(['scripts/validation/VALIDATE_COMPLETE.js','VALIDATE_COMPLETE.js']);

console.log('\n🎉 ORCHESTRATION DONE');
