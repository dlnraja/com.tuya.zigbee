#!/usr/bin/env node
/**
 * cleanup-failed-runs.js  Autonomous GitHub Actions failed run cleaner
 * Usage: node scripts/maintenance/cleanup-failed-runs.js
 * Requires: gh CLI authenticated
 * 
 * Deletes ALL failed/timed_out workflow runs in batches of 100.
 * Loops until zero failures remain. Safe to run repeatedly.
 */
const { execSync } = require('child_process');

const BATCH = 100;
const REPO = 'dlnraja/com.tuya.zigbee';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', timeout: 30000 }).toString().trim();
  } catch (e) {
    return e.stdout ? e.stdout.toString().trim() : ''      ;
  }
}

async function main() {
  console.log(' GitHub Actions Failed Run Cleaner\n');
  let totalDeleted = 0;
  let round = 0;

  while (true) {
    round++;
    const raw = run(`gh run list --repo ${REPO} --limit ${BATCH} --status failure --json databaseId,workflowName`);
    if (!raw || raw === '[]') {
      // Also check timed_out
      const raw2 = run(`gh run list --repo ${REPO} --limit ${BATCH} --status timed_out --json databaseId`);
      if (!raw2 || raw2 === '[]') break;
      const ids2 = JSON.parse(raw2).map(x => x.databaseId);
      console.log(`  Round ${round}: ${ids2.length} timed_out runs...`);
      for (const id of ids2) {
        run(`gh run delete ${id} --repo ${REPO}`);
        totalDeleted++;
      }
      continue;
    }

    const runs = JSON.parse(raw);
    if (runs.length === 0) break;

    // Group by workflow for display
    const byWf = {};
    for (const r of runs) {
      byWf[r.workflowName] = (byWf[r.workflowName] || 0) + 1;
    }

    console.log(`  Round ${round}: ${runs.length} failed runs`);
    for (const [wf, count] of Object.entries(byWf)) {
      console.log(`    - ${wf}: ${count}`);
    }

    for (const r of runs) {
      try {
        run(`gh run delete ${r.databaseId} --repo ${REPO}`);
        totalDeleted++;
      } catch {}
    }

    console.log(`   Deleted ${runs.length} (total: ${totalDeleted})\n`);
    
    // Small pause to respect rate limits
    if (runs.length === BATCH) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n Done! Total deleted: ${totalDeleted}`);
  console.log(`   Remaining failed runs: 0`);
}

main().catch(e => { console.error('', e.message); process.exit(1); });
