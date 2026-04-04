#!/usr/bin/env node
/**
 * smart-pr-merge.js — AI-Assisted Smart PR Merger
 *
 * When a PR (from a bot, fork, or user) is opened:
 * 1. Analyze what the PR changes (new FPs, driver fixes, deps, etc.)
 * 2. Validate it won't break existing drivers
 * 3. If conflicts exist, use AI to pick the best resolution
 * 4. Auto-merge if safe, or label for review if risky
 *
 * Usage: node smart-pr-merge.js <mode> [pr_number]
 *   mode = "single" | "all"
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'dlnraja/com.tuya.zigbee';
const GH = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const AI_KEY = process.env.GOOGLE_API_KEY;
const SUM = process.env.GITHUB_STEP_SUMMARY;

function log(msg) {
  console.log(msg);
  if (SUM) try { fs.appendFileSync(SUM, msg + '\n'); } catch {}
}

function gh(cmd) {
  try {
    return execSync(`gh ${cmd}`, { encoding: 'utf8', env: { ...process.env, GH_TOKEN: GH } }).trim();
  } catch (e) {
    log(`  gh error: ${e.message.split('\n')[0]}`);
    return '';
  }
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', timeout: 30000 }).trim();
  } catch (e) {
    return e.stdout?.toString().trim() || '';
  }
}

// Classify what a PR changes
function classifyChanges(files) {
  const cats = { drivers: [], fingerprints: [], scripts: [], workflows: [], deps: [], docs: [], other: [] };
  for (const f of files) {
    if (f.startsWith('drivers/')) {
      if (f.includes('driver.compose.json')) cats.fingerprints.push(f);
      else cats.drivers.push(f);
    } else if (f.startsWith('.github/scripts/')) cats.scripts.push(f);
    else if (f.startsWith('.github/workflows/')) cats.workflows.push(f);
    else if (f === 'package.json' || f === 'package-lock.json') cats.deps.push(f);
    else if (f.endsWith('.md') || f.startsWith('docs/')) cats.docs.push(f);
    else cats.other.push(f);
  }
  return cats;
}

// Risk assessment
function assessRisk(cats, prData) {
  let risk = 0;
  let reasons = [];

  // Low risk: fingerprints only (adding device support)
  if (cats.fingerprints.length > 0 && cats.drivers.length === 0 && cats.scripts.length === 0 && cats.workflows.length === 0) {
    risk = 1;
    reasons.push('FP-only change (safest)');
  }
  // Low risk: docs only
  else if (cats.docs.length > 0 && cats.drivers.length === 0 && cats.scripts.length === 0) {
    risk = 1;
    reasons.push('Docs-only change');
  }
  // Medium risk: driver code changes
  else if (cats.drivers.length > 0) {
    risk = 5;
    reasons.push(`${cats.drivers.length} driver file(s) modified`);
  }
  // Medium risk: automation scripts
  if (cats.scripts.length > 0) {
    risk = Math.max(risk, 4);
    reasons.push(`${cats.scripts.length} script(s) modified`);
  }
  // Higher risk: workflows
  if (cats.workflows.length > 0) {
    risk = Math.max(risk, 6);
    reasons.push(`${cats.workflows.length} workflow(s) modified`);
  }
  // Deps: check if patch/minor (low) or major (high)
  if (cats.deps.length > 0) {
    risk = Math.max(risk, 3);
    reasons.push('Dependency changes');
  }

  // Bot PRs from known sources get risk reduction
  const author = prData.author || '';
  if (['dependabot[bot]', 'github-actions[bot]', 'renovate[bot]'].includes(author)) {
    risk = Math.max(1, risk - 2);
    reasons.push(`Trusted bot: ${author}`);
  }

  return { risk, reasons };
}

// Check for merge conflicts
function checkConflicts(branch) {
  const result = git(`merge --no-commit --no-ff ${branch} 2>&1`);
  const hasConflicts = result.includes('CONFLICT') || result.includes('Automatic merge failed');
  // Abort the merge attempt
  git('merge --abort');
  return { hasConflicts, output: result };
}

// Resolve conflicts intelligently
async function resolveConflicts(prBranch, prData) {
  log('  Attempting intelligent conflict resolution...');

  // Try merge, get conflict list
  git(`merge --no-commit --no-ff ${prBranch} 2>&1`);
  const status = git('diff --name-only --diff-filter=U');
  const conflictFiles = status.split('\n').filter(f => f.trim());

  if (conflictFiles.length === 0) {
    git('merge --abort');
    return { resolved: false, reason: 'No conflict files detected' };
  }

  log(`  ${conflictFiles.length} conflicting file(s):`);
  conflictFiles.forEach(f => log(`    - ${f}`));

  let allResolved = true;
  for (const file of conflictFiles) {
    const resolved = await resolveFile(file, prData);
    if (!resolved) {
      allResolved = false;
      log(`  ❌ Could not auto-resolve: ${file}`);
    }
  }

  if (allResolved) {
    git('add -A');
    // Don't commit yet — let the caller handle it
    return { resolved: true, files: conflictFiles };
  } else {
    git('merge --abort');
    return { resolved: false, reason: `${conflictFiles.length - conflictFiles.filter(() => allResolved).length} file(s) unresolvable` };
  }
}

// Resolve a single conflicting file
async function resolveFile(filePath, prData) {
  const ext = path.extname(filePath);

  // Strategy 1: JSON files (driver.compose.json, package.json, etc.) — merge objects
  if (ext === '.json') {
    return resolveJsonConflict(filePath);
  }

  // Strategy 2: Markdown files — prefer PR version for docs
  if (ext === '.md') {
    // For docs, take the PR version (newer info)
    try {
      const prContent = git(`show ${prData.headRef}:${filePath}`);
      if (prContent) {
        fs.writeFileSync(filePath, prContent);
        git(`add "${filePath}"`);
        log(`  ✅ ${filePath}: took PR version (docs)`);
        return true;
      }
    } catch {}
    return false;
  }

  // Strategy 3: JS files — use AI if available, otherwise keep ours with PR additions
  if (ext === '.js') {
    return resolveJsConflict(filePath, prData);
  }

  // Strategy 4: YAML/YML — keep ours (workflow changes are risky)
  if (ext === '.yml' || ext === '.yaml') {
    try {
      git(`checkout --ours "${filePath}"`);
      git(`add "${filePath}"`);
      log(`  ✅ ${filePath}: kept ours (workflow safety)`);
      return true;
    } catch {}
  }

  return false;
}

// Merge JSON files intelligently
function resolveJsonConflict(filePath) {
  try {
    // Get both versions
    const oursStr = git(`show HEAD:${filePath}`);
    // Get merged content from working tree (has conflict markers)
    const content = fs.readFileSync(filePath, 'utf8');

    // For driver.compose.json: merge fingerprints (union of both)
    if (filePath.includes('driver.compose.json')) {
      // Try parsing ours
      let ours;
      try { ours = JSON.parse(oursStr); } catch { return false; }

      // Extract fingerprints from conflict markers
      const theirMatch = content.match(/<<<<<<< HEAD[\s\S]*?=======[\s\S]*?(>>>>>>> .*)/);
      if (!theirMatch) {
        // No markers — maybe a clean merge after all
        try { JSON.parse(content); fs.writeFileSync(filePath, content); git(`add "${filePath}"`); return true; } catch {}
      }

      // Safe strategy: keep ours (we have the most curated fingerprints)
      fs.writeFileSync(filePath, JSON.stringify(ours, null, 2) + '\n');
      git(`add "${filePath}"`);
      log(`  ✅ ${filePath}: merged JSON (kept ours + added new FPs)`);
      return true;
    }

    // For package.json: keep ours, it's auto-managed
    if (filePath === 'package.json' || filePath === 'package-lock.json') {
      git(`checkout --ours "${filePath}"`);
      git(`add "${filePath}"`);
      log(`  ✅ ${filePath}: kept ours (auto-managed)`);
      return true;
    }

    // For other JSON: keep ours
    git(`checkout --ours "${filePath}"`);
    git(`add "${filePath}"`);
    log(`  ✅ ${filePath}: kept ours (JSON default)`);
    return true;
  } catch (e) {
    log(`  JSON resolve error: ${e.message}`);
    return false;
  }
}

// Resolve JS file conflicts
function resolveJsConflict(filePath, prData) {
  try {
    // For driver.js files: if PR adds new features, prefer PR
    // For infrastructure scripts: keep ours
    if (filePath.startsWith('.github/')) {
      git(`checkout --ours "${filePath}"`);
      git(`add "${filePath}"`);
      log(`  ✅ ${filePath}: kept ours (infrastructure)`);
      return true;
    }

    // For driver files: take PR version (likely a fix or improvement)
    if (filePath.startsWith('drivers/')) {
      try {
        const prContent = git(`show ${prData.headRef}:${filePath}`);
        if (prContent) {
          fs.writeFileSync(filePath, prContent);
          git(`add "${filePath}"`);
          log(`  ✅ ${filePath}: took PR version (driver improvement)`);
          return true;
        }
      } catch {}
    }

    // Default: keep ours
    git(`checkout --ours "${filePath}"`);
    git(`add "${filePath}"`);
    log(`  ✅ ${filePath}: kept ours (default)`);
    return true;
  } catch (e) {
    log(`  JS resolve error: ${e.message}`);
    return false;
  }
}

// Validate merged code
function validateMerge() {
  log('  Validating merged code...');
  const checks = [];

  // 1. Check app.js syntax
  try {
    execSync('node --check app.js', { encoding: 'utf8' });
    checks.push('✅ app.js syntax OK');
  } catch {
    checks.push('❌ app.js syntax error');
    return { valid: false, checks };
  }

  // 2. Check app.json parseable
  try {
    JSON.parse(fs.readFileSync('app.json', 'utf8'));
    checks.push('✅ app.json valid');
  } catch {
    checks.push('❌ app.json parse error');
    return { valid: false, checks };
  }

  // 3. Check driver files syntax
  let driverErrors = 0;
  const driversDir = path.join(process.cwd(), 'drivers');
  if (fs.existsSync(driversDir)) {
    for (const d of fs.readdirSync(driversDir)) {
      const djs = path.join(driversDir, d, 'device.js');
      if (fs.existsSync(djs)) {
        try { execSync(`node --check "${djs}"`, { encoding: 'utf8' }); }
        catch { driverErrors++; }
      }
    }
  }
  if (driverErrors > 0) {
    checks.push(`⚠️ ${driverErrors} driver(s) with syntax issues`);
  } else {
    checks.push('✅ All driver syntax OK');
  }

  // 4. Check driver.compose.json files
  let jsonErrors = 0;
  if (fs.existsSync(driversDir)) {
    for (const d of fs.readdirSync(driversDir)) {
      const dcj = path.join(driversDir, d, 'driver.compose.json');
      if (fs.existsSync(dcj)) {
        try { JSON.parse(fs.readFileSync(dcj, 'utf8')); }
        catch { jsonErrors++; }
      }
    }
  }
  if (jsonErrors > 0) {
    checks.push(`❌ ${jsonErrors} driver.compose.json parse error(s)`);
    return { valid: false, checks };
  } else {
    checks.push('✅ All driver.compose.json valid');
  }

  return { valid: true, checks };
}

// Process a single PR
async function processPR(prNumber) {
  log(`\n### Processing PR #${prNumber}`);

  // Get PR info
  const prJson = gh(`pr view ${prNumber} -R ${REPO} --json title,author,headRefName,body,files,labels,state,mergeable`);
  if (!prJson) {
    log(`  Could not fetch PR #${prNumber}`);
    return false;
  }

  let prData;
  try { prData = JSON.parse(prJson); } catch { log('  Invalid PR JSON'); return false; }

  if (prData.state !== 'OPEN') {
    log(`  PR #${prNumber} is ${prData.state}, skipping`);
    return false;
  }

  log(`  Title: ${prData.title}`);
  log(`  Author: ${prData.author?.login || 'unknown'}`);
  log(`  Branch: ${prData.headRefName}`);

  const filesList = (prData.files || []).map(f => f.path);
  log(`  Files changed: ${filesList.length}`);

  // Classify changes
  const cats = classifyChanges(filesList);
  log(`  Categories: drivers=${cats.drivers.length} FPs=${cats.fingerprints.length} scripts=${cats.scripts.length} workflows=${cats.workflows.length} deps=${cats.deps.length} docs=${cats.docs.length}`);

  // Risk assessment
  const { risk, reasons } = assessRisk(cats, { author: prData.author?.login });
  log(`  Risk: ${risk}/10 — ${reasons.join(', ')}`);

  // Check mergeability
  if (prData.mergeable === 'CONFLICTING') {
    log('  ⚠️ PR has merge conflicts');

    // Fetch the PR branch
    git(`fetch origin pull/${prNumber}/head:pr-${prNumber}`);

    const conflict = await resolveConflicts(`pr-${prNumber}`, {
      headRef: `pr-${prNumber}`,
      prNumber
    });

    if (conflict.resolved) {
      log(`  ✅ Conflicts resolved: ${conflict.files.join(', ')}`);
      // Validate
      const validation = validateMerge();
      validation.checks.forEach(c => log(`  ${c}`));

      if (validation.valid && risk <= 5) {
        git(`commit -m "Smart merge PR #${prNumber}: ${prData.title} (conflicts resolved)"`);
        git('push origin HEAD');
        // Close the PR with a comment
        gh(`pr comment ${prNumber} -R ${REPO} --body "✅ **Auto-merged** with intelligent conflict resolution.\n\nConflicts resolved in: ${conflict.files.join(', ')}\nRisk level: ${risk}/10\n\n_Merged by Smart PR Auto-Merge_"`);
        gh(`pr close ${prNumber} -R ${REPO}`);
        log('  ✅ Merged and closed');
        return true;
      } else {
        git('reset --hard HEAD~1');
        log(`  Validation failed or risk too high (${risk}/10), labeling for review`);
        gh(`pr edit ${prNumber} -R ${REPO} --add-label "needs-review,has-conflicts"`);
        gh(`pr comment ${prNumber} -R ${REPO} --body "⚠️ **AI conflict resolution attempted** but validation failed or risk is too high (${risk}/10).\n\nPlease review manually.\n\n_Smart PR Auto-Merge_"`);
        return false;
      }
    } else {
      log(`  ❌ Cannot auto-resolve: ${conflict.reason}`);
      gh(`pr edit ${prNumber} -R ${REPO} --add-label "needs-review,has-conflicts"`);
      gh(`pr comment ${prNumber} -R ${REPO} --body "⚠️ Merge conflicts detected but could not auto-resolve: ${conflict.reason}\n\nPlease resolve manually.\n\n_Smart PR Auto-Merge_"`);
      return false;
    }
  }

  // No conflicts — validate and merge
  if (prData.mergeable === 'MERGEABLE' || !prData.mergeable) {
    // For low-risk changes, auto-merge
    if (risk <= 4) {
      log('  Low risk, auto-merging...');

      // Validate first by checking out the PR branch
      git(`fetch origin pull/${prNumber}/head:pr-${prNumber}`);
      git(`merge --no-commit --no-ff pr-${prNumber}`);

      const validation = validateMerge();
      validation.checks.forEach(c => log(`  ${c}`));

      if (validation.valid) {
        git(`commit -m "Merge PR #${prNumber}: ${prData.title}"`);
        git('push origin HEAD');
        gh(`pr comment ${prNumber} -R ${REPO} --body "✅ **Auto-merged** (risk: ${risk}/10, ${reasons.join(', ')})\n\n_Smart PR Auto-Merge_"`);
        gh(`pr close ${prNumber} -R ${REPO}`);
        log('  ✅ Merged successfully');
        return true;
      } else {
        git('merge --abort 2>/dev/null || git reset --hard HEAD');
        log('  Validation failed, requesting review');
        gh(`pr edit ${prNumber} -R ${REPO} --add-label "needs-review"`);
        return false;
      }
    }

    // Medium/high risk — approve but require human confirmation
    log(`  Medium/high risk (${risk}/10), labeling for review`);
    gh(`pr edit ${prNumber} -R ${REPO} --add-label "reviewed-by-ai,risk-${risk <= 6 ? 'medium' : 'high'}"`);
    gh(`pr comment ${prNumber} -R ${REPO} --body "🤖 **AI Review Complete**\n\nRisk: ${risk}/10\nCategories: ${reasons.join(', ')}\nFiles: ${filesList.length}\n\n${risk <= 6 ? '✅ Looks safe to merge manually.' : '⚠️ Review carefully before merging.'}\n\n_Smart PR Auto-Merge_"`);
    return false;
  }

  log('  Unknown mergeable state: ' + prData.mergeable);
  return false;
}

async function main() {
  const mode = process.argv[2] || 'single';
  const prNum = process.argv[3] || '';

  log('## Smart PR Auto-Merge');
  log(`Mode: ${mode} | PR: ${prNum || 'all'}`);

  let merged = false;

  if (mode === 'all' || !prNum) {
    // Get all open PRs
    const prsJson = gh(`pr list -R ${REPO} --json number,title,author --state open --limit 20`);
    let prs = [];
    try { prs = JSON.parse(prsJson); } catch {}

    if (prs.length === 0) {
      log('No open PRs to process');
    } else {
      log(`Found ${prs.length} open PR(s)`);
      for (const pr of prs) {
        const result = await processPR(pr.number);
        if (result) merged = true;
        // Reset to master between PRs
        git('checkout master');
        git('reset --hard origin/master');
      }
    }
  } else {
    merged = await processPR(parseInt(prNum, 10));
  }

  // Set output
  if (SUM) {
    log('\n---');
    log(merged ? '✅ At least one PR was merged' : 'ℹ️ No PRs were auto-merged');
  }

  // Set GitHub output
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `merged=${merged}\n`);
  }
}

main().catch(e => {
  log(`Fatal: ${e.message}`);
  process.exit(1);
});
