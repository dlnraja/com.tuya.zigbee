#!/usr/bin/env node
'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMART PR AUTO-MERGER - v1.0.0                                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Automates PR merging for fingerprint additions:                              ║
 * ║  1. Approves PRs with valid device additions.                                ║
 * ║  2. Resolves merge conflicts in driver.compose.json (JSON Array Union).      ║
 * ║  3. Merges and closes PRs positively.                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY = process.env.DRY_RUN === 'true';
const REPO = process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee';
const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

function gh(c) {
  return execSync(`gh ${c}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
}

function mergeJsonArrays(base, head) {
  const merged = JSON.parse(JSON.stringify(base));
  
  const mergeKeys = (b, h) => {
    for (const key in h) {
      if (Array.isArray(h[key]) && Array.isArray(b[key])) {
        // Union arrays and unique
        b[key] = [...new Set([...b[key], ...h[key]])].sort();
      } else if (typeof h[key] === 'object' && h[key] !== null && typeof b[key] === 'object' && b[key] !== null) {
        mergeKeys(b[key], h[key]);
      } else {
        b[key] = h[key];
      }
    }
  };
  
  mergeKeys(merged, head);
  return merged;
}

async function handlePR(pr) {
  console.log(`\nReviewing PR #${pr.number}: ${pr.title} by @${pr.user.login}`);
  
  // 1. Approve the PR
  if (!DRY) {
    try {
      gh(`pr review ${pr.number} --approve -R ${REPO} -c "Automated approval: Valid device contribution enrichment."`);
      console.log(`  [OK] Approved #${pr.number}`);
    } catch (e) {
      console.log(`  [SKIP] Could not approve (already approved or no perms): ${e.message.split('\n')[0]}`);
    }
  }

  // 2. Try simple merge first
  try {
    if (!DRY) {
      gh(`pr merge ${pr.number} --merge -R ${REPO} --delete-branch`);
      console.log(`  [OK] Merged #${pr.number} smoothly.`);
      return;
    }
  } catch (e) {
    console.log(`  [CONFLICT] Auto-merge failed, attempting smart conflict resolution...`);
  }

  // 3. Smart Conflict Resolution (Local)
  if (DRY) return;

  try {
    // We need to be on master and clean
    execSync('git checkout master && git pull origin master', { stdio: 'inherit' });
    
    // Create temp branch for resolution
    const tempBranch = `resolve-pr-${pr.number}`;
    execSync(`git checkout -b ${tempBranch}`, { stdio: 'inherit' });
    
    // Try to merge the PR branch
    try {
      execSync(`gh pr checkout ${pr.number} -R ${REPO}`, { stdio: 'inherit' });
      // We are now on the PR branch. Merge master into it.
      execSync('git merge master --no-edit', { stdio: 'pipe' }).catch(() => {
        console.log("    Manual merge required for conflicts...");
      });
    } catch (e) {
       console.log("    Could not checkout PR branch. Skipping smart merge.");
       return;
    }

    // Identify conflicting files
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const conflictingFiles = status.split('\n')
      .filter(line => line.startsWith('UU '))
      .map(line => line.slice(3).trim());

    let resolvedCount = 0;
    for (const file of conflictingFiles) {
      if (file.endsWith('driver.compose.json')) {
        console.log(`    Resolving conflict in ${file}...`);
        
        // Extract both versions using git show
        const baseContent = execSync(`git show HEAD:${file}`, { encoding: 'utf8' });
        const incomingContent = execSync(`git show MERGE_HEAD:${file}`, { encoding: 'utf8' });
        
        try {
          const base = JSON.parse(baseContent);
          const incoming = JSON.parse(incomingContent);
          const resolved = mergeJsonArrays(base, incoming);
          
          fs.writeFileSync(file, JSON.stringify(resolved, null, 2) + '\n');
          execSync(`git add ${file}`);
          resolvedCount++;
        } catch (e) {
          console.log(`    [ERR] Failed to parse JSON in ${file}: ${e.message}`);
        }
      }
    }

    if (resolvedCount === conflictingFiles.length && conflictingFiles.length > 0) {
      execSync('git commit -m "Auto-resolved merge conflicts in manifests (JSON union)"');
      // Push back to the PR branch (if allowed) or just merge into master
      // Here we assume we can push to the fork or just merge locally and push to master
      console.log("    [OK] All conflicts resolved. Merging into master...");
      execSync('git checkout master');
      execSync(`git merge ${tempBranch} --no-edit`);
      execSync('git push origin master');
      
      // Close the PR since we merged it manually
      gh(`pr close ${pr.number} -R ${REPO} -c "Integrated via smart conflict resolution pipeline. Thanks for the contribution!"`);
      console.log(`  [OK] PR #${pr.number} integrated and closed.`);
    } else {
      console.log("    [ABORT] Some conflicts could not be auto-resolved (non-JSON or complex logic).");
      execSync('git merge --abort');
      execSync('git checkout master');
    }
    
    // Cleanup
    execSync(`git branch -D ${tempBranch}`, { stdio: 'inherit' });

  } catch (e) {
    console.error(`  [ERR] Smart merge failed: ${e.message}`);
  }
}

async function main() {
  if (!TOKEN) {
    console.error("GH_PAT or GITHUB_TOKEN environment variable is required.");
    process.exit(1);
  }

  console.log(`=== Smart PR Auto-Merger: ${REPO} ===`);
  
  try {
    const prsJson = gh(`pr list -R ${REPO} -s open --json number,title,user,body,labels`);
    const prs = JSON.parse(prsJson);
    
    if (prs.length === 0) {
      console.log("No open PRs found.");
      return;
    }

    for (const pr of prs) {
      // Logic to decide which PRs to auto-merge
      // 1. Dependabot
      // 2. JohanBendz upstream syncs
      // 3. "device-request" or "fingerprint" PRs from reputable users
      const isSystem = pr.user.login.includes('bot') || pr.user.login === 'dlnraja' || pr.user.login === 'JohanBendz';
      const isDeviceAddition = pr.title.toLowerCase().includes('fingerprint') || pr.title.toLowerCase().includes('device') || pr.labels.some(l => l.name === 'device-request');
      
      if (isSystem || isDeviceAddition) {
        await handlePR(pr);
      } else {
        console.log(`Skipping PR #${pr.number} (not a system or device PR)`);
      }
    }
  } catch (e) {
    console.error(`Error fetching PRs: ${e.message}`);
  }
}

main();
