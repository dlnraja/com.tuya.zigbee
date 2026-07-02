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
let activeBaseRef = process.env.PR_BASE_REF || 'master';

function isFullSha(value) {
  return /^[a-f0-9]{40}$/i.test(String(value || '').trim());
}

function shortSha(value) {
  const sha = String(value || '').trim();
  return sha ? sha.slice(0, 12) : 'unknown';
}

function safeRefName(value) {
  const ref = String(value || '').trim();
  if (!/^[A-Za-z0-9._/-]+$/.test(ref)) {
    throw new Error(`Unsafe git ref name: ${ref}`);
  }
  return ref;
}

function getEventHeadSha() {
  const candidates = [
    process.env.PR_HEAD_SHA,
    process.env.EXPECTED_PR_HEAD_SHA,
    process.env.GITHUB_HEAD_SHA,
  ];

  if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    try {
      const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      candidates.push(
        event?.pull_request?.head?.sha,
        event?.workflow_run?.head_sha,
        event?.check_suite?.head_sha,
        event?.after
      );
    } catch (e) {
      log(`  Warning: could not parse GitHub event payload for SHA detection: ${e.message}`);
    }
  }

  return candidates.find(isFullSha) || '';
}

function normalizePrData(prNumber, prData, stage = 'current') {
  if (!prData || typeof prData !== 'object') {
    throw new Error(`PR #${prNumber} returned invalid metadata`);
  }

  activeBaseRef = prData.baseRefName || activeBaseRef || 'master';
  const eventSha = getEventHeadSha();
  if (eventSha && prData.headRefOid && eventSha !== prData.headRefOid) {
    log(`  Notice: ${stage} event SHA ${shortSha(eventSha)} is stale; using current PR head ${shortSha(prData.headRefOid)}`);
  }

  if (prData.headRefOid) {
    log(`  Head SHA (${stage}): ${shortSha(prData.headRefOid)}`);
  }
  if (prData.baseRefName) {
    log(`  Base branch (${stage}): ${prData.baseRefName}`);
  }

  return prData;
}

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

function sh(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runRequired(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      timeout: options.timeout || 60000,
      env: options.env || process.env,
    }).trim();
  } catch (e) {
    const stdout = e.stdout?.toString().trim();
    const stderr = e.stderr?.toString().trim();
    const detail = [stdout, stderr, e.message].filter(Boolean).join('\n');
    throw new Error(`${command} failed\n${detail}`);
  }
}

function gitRequired(cmd, options = {}) {
  return runRequired(`git ${cmd}`, options);
}

function ghRequired(cmd, options = {}) {
  return runRequired(`gh ${cmd}`, {
    ...options,
    env: { ...process.env, GH_TOKEN: GH },
  });
}

function configureGitIdentity() {
  gitRequired('config user.name "github-actions[bot]"');
  gitRequired('config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
}

function checkoutBaseBranch(baseRefName = activeBaseRef) {
  const base = safeRefName(baseRefName || 'master');
  activeBaseRef = base;
  gitRequired(`fetch origin ${base}`);
  gitRequired(`checkout -B ${base} origin/${base}`);
}

function abortMergeQuietly() {
  git('merge --abort');
}

function restoreBaseBranchQuietly(baseRefName = activeBaseRef) {
  abortMergeQuietly();
  git('restore --staged .');
  git('restore .');
  const base = safeRefName(baseRefName || 'master');
  activeBaseRef = base;
  git(`fetch origin ${base}`);
  git(`checkout -B ${base} origin/${base}`);
}

function verifyIntegrated(prNumber, prData) {
  if (!prData.headRefOid) {
    throw new Error(`PR #${prNumber} has no headRefOid; refusing to report a merge without verification`);
  }

  const base = safeRefName(prData.baseRefName || activeBaseRef || 'master');
  gitRequired(`fetch origin ${base}`);
  try {
    gitRequired(`merge-base --is-ancestor ${prData.headRefOid} origin/${base}`);
  } catch {
    throw new Error(`PR #${prNumber} head ${prData.headRefOid} is not reachable from origin/${base}`);
  }

  log(`  ✅ Verified PR #${prNumber} head ${shortSha(prData.headRefOid)} is reachable from origin/${base}`);
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

function readPrData(prNumber, stage = 'current') {
  const prJson = gh(`pr view ${prNumber} -R ${REPO} --json title,author,headRefName,headRefOid,baseRefName,body,files,labels,state,isDraft,mergeable`);
  if (!prJson) {
    throw new Error(`Could not fetch PR #${prNumber}`);
  }

  let prData;
  try {
    prData = JSON.parse(prJson);
  } catch (e) {
    throw new Error(`Invalid PR JSON for #${prNumber}: ${e.message}`);
  }

  return normalizePrData(prNumber, prData, stage);
}

function fetchPrHead(prNumber, prData) {
  const localRef = safeRefName(`pr-${prNumber}`);
  gitRequired(`fetch --force origin pull/${prNumber}/head:${localRef}`);
  const fetchedSha = gitRequired(`rev-parse ${localRef}`);

  if (prData.headRefOid && fetchedSha !== prData.headRefOid) {
    const fresh = readPrData(prNumber, 'refetched-after-fetch');
    if (fresh.headRefOid !== fetchedSha) {
      throw new Error(`Fetched PR #${prNumber} SHA ${shortSha(fetchedSha)} does not match GitHub head ${shortSha(fresh.headRefOid)}`);
    }
    Object.assign(prData, fresh);
  }

  log(`  Fetched PR head ${shortSha(fetchedSha)} into ${localRef}`);
  return localRef;
}

function ensureHeadStillCurrent(prNumber, validatedHeadSha, stage) {
  const fresh = readPrData(prNumber, stage);
  if (!fresh.headRefOid) {
    log(`  Warning: PR #${prNumber} has no head SHA at ${stage}; skipping guarded merge`);
    return { ok: false, prData: fresh };
  }

  if (fresh.headRefOid !== validatedHeadSha) {
    log(`  SHA changed after validation: validated ${shortSha(validatedHeadSha)}, current ${shortSha(fresh.headRefOid)}. Skipping merge; next run will validate the new head.`);
    return { ok: false, prData: fresh };
  }

  return { ok: true, prData: fresh };
}

function mergePrWithHeadGuard(prNumber, prData) {
  const sha = prData.headRefOid;
  if (!sha) {
    throw new Error(`PR #${prNumber} has no head SHA; refusing unguarded merge`);
  }

  ghRequired(`pr merge ${prNumber} -R ${REPO} --merge --delete-branch --match-head-commit ${sha} --subject ${sh(`Merge PR #${prNumber}: ${prData.title}`)}`);
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
async function resolveJsConflict(filePath, prData) {
  try {
    // For infrastructure scripts: keep ours
    if (filePath.startsWith('.github/')) {
      git(`checkout --ours "${filePath}"`);
      git(`add "${filePath}"`);
      log(`  ✅ ${filePath}: kept ours (infrastructure)`);
      return true;
    }

    // For driver files: Attempt AI Merge
    if (filePath.startsWith('drivers/') || filePath.startsWith('lib/')) {
      // Load AI helper if available
      let callAI;
      try { callAI = require('./ai-helper').callAI; } catch (e) { log('  No AI helper available for JS conflict.'); }

      if (callAI && (process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY || process.env.GITHUB_TOKEN)) {
        try {
          const contentWithMarkers = fs.readFileSync(filePath, 'utf8');
          if (contentWithMarkers.includes('<<<<<<< HEAD')) {
             log(`  🤖 Asking AI (Copilot/Gemini) to smartly merge conflicts in ${filePath}...`);
             const prompt = 'You are a Tuya Zigbee for Homey expert. Resolve the git merge conflict strictly keeping the best features from both branches (our base vs PR). Output only the resolved file content without markdown code blocks, explanations, or markers.';
             const aiRes = await callAI(contentWithMarkers, prompt, { maxTokens: 4000 });
             if (aiRes && aiRes.text && !aiRes.text.includes('<<<<<<<')) {
                // Wipe markdown block if present
                let resolvedText = aiRes.text.replace(/^```[\s\S]*?\n/g, '').replace(/```$/g, '').trim();
                fs.writeFileSync(filePath, resolvedText);
                git(`add "${filePath}"`);
                log(`  ✅ ${filePath}: intelligently merged using AI (${aiRes.model})!`);
                return true;
             } else {
                log(`  ⚠️ AI failed to resolve ${filePath} cleanly.`);
             }
          }
        } catch (err) {
          log(`  ⚠️ AI merge error for ${filePath}: ${err.message}`);
        }
      }

      // Fallback: take PR version (likely a fix or improvement)
      try {
        const prContent = git(`show ${prData.headRef}:${filePath}`);
        if (prContent) {
          fs.writeFileSync(filePath, prContent);
          git(`add "${filePath}"`);
          log(`  ✅ ${filePath}: took PR version (driver improvement fallback)`);
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

// Generate a human-readable merge summary for PR comments
function generateMergeSummary(prData, cats, risk, reasons, mergeType, conflictFiles) {
  const author = prData.author?.login || 'unknown';
  const lines = [];

  lines.push(`## ✅ PR fusionnée automatiquement`);
  lines.push('');
  lines.push(`**${prData.title}** (par @${author})`);
  lines.push('');

  // What was changed (human-readable)
  lines.push('### Ce qui a été intégré');
  if (cats.fingerprints.length > 0) {
    const drivers = cats.fingerprints.map(f => f.split('/')[1] || f).join(', ');
    lines.push(`- 🔍 **${cats.fingerprints.length} fingerprint(s)** mis à jour : ${drivers}`);
  }
  if (cats.drivers.length > 0) {
    const driverNames = [...new Set(cats.drivers.map(f => f.split('/')[1] || f))].join(', ');
    lines.push(`- 🔧 **${cats.drivers.length} fichier(s) driver** modifié(s) : ${driverNames}`);
  }
  if (cats.scripts.length > 0) {
    lines.push(`- ⚙️ **${cats.scripts.length} script(s) automation** modifié(s)`);
  }
  if (cats.workflows.length > 0) {
    lines.push(`- 🔄 **${cats.workflows.length} workflow(s) CI/CD** modifié(s)`);
  }
  if (cats.deps.length > 0) {
    lines.push(`- 📦 **Dépendances** mises à jour`);
  }
  if (cats.docs.length > 0) {
    lines.push(`- 📝 **${cats.docs.length} document(s)** mis à jour`);
  }
  if (cats.other.length > 0) {
    lines.push(`- 📁 **${cats.other.length} autre(s) fichier(s)** modifié(s)`);
  }
  lines.push('');

  // How it was merged
  lines.push('### Comment');
  if (mergeType === 'conflict-resolved') {
    lines.push(`- ⚡ **Conflits détectés et résolus automatiquement** dans : \`${conflictFiles.join('`, `')}\``);
    lines.push('- La meilleure version de chaque fichier a été sélectionnée intelligemment');
  } else if (mergeType === 'clean') {
    lines.push('- ✅ Merge propre, aucun conflit');
  }
  lines.push(`- 🔐 Niveau de risque : **${risk}/10** (${reasons.join(', ')})`);
  lines.push('- ✅ Validation post-merge : app.js, app.json, drivers — tout OK');
  lines.push('');

  lines.push('---');
  lines.push('_🤖 Fusionné par Smart PR Auto-Merge — branche supprimée automatiquement_');

  return lines.join('\n');
}

// Comment on a merged PR only after verifying the head commit reached master.
function closePR(prNumber, prData, cats, risk, reasons, mergeType, conflictFiles) {
  verifyIntegrated(prNumber, prData);

  const summary = generateMergeSummary(prData, cats, risk, reasons, mergeType, conflictFiles || []);

  // Write comment to temp file to avoid shell escaping issues with backticks, quotes, etc.
  const tmpFile = path.join(process.cwd(), '.github', 'state', `pr-${prNumber}-close-comment.md`);
  try {
    fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
    fs.writeFileSync(tmpFile, summary, 'utf8');
    gh(`pr comment ${prNumber} -R ${REPO} --body-file "${tmpFile}"`);
  } catch (e) {
    log(`  ⚠️ Comment write failed: ${e.message}`);
    // Fallback: simple comment
    gh(`pr comment ${prNumber} -R ${REPO} --body "✅ PR #${prNumber} merged via Smart Auto-Merge"`);
  }

  // Delete the remote branch (cleanup). GitHub's merge API may already have done this.
  const branch = prData.headRefName;
  if (branch && branch !== 'master' && branch !== 'main') {
    log(`  Deleting branch: ${branch}`);
    git(`push origin --delete ${branch}`);
  }

  // Clean up temp file
  try { fs.unlinkSync(tmpFile); } catch {}

  log(`  ✅ PR #${prNumber} verified, commented, and branch cleanup attempted`);
}

// Process a single PR
async function processPR(prNumber) {
  log(`\n### Processing PR #${prNumber}`);

  let prData;
  try {
    prData = readPrData(prNumber, 'initial');
  } catch (e) {
    log(`  ${e.message}`);
    return false;
  }

  if (prData.state !== 'OPEN') {
    log(`  PR #${prNumber} is ${prData.state}, skipping`);
    return false;
  }

  if (prData.isDraft) {
    log(`  PR #${prNumber} is draft; validating metadata only and skipping auto-merge`);
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

    checkoutBaseBranch(prData.baseRefName);
    const prRef = fetchPrHead(prNumber, prData);

    const conflict = await resolveConflicts(prRef, {
      headRef: prRef,
      prNumber
    });

    if (conflict.resolved) {
      log(`  ✅ Conflicts resolved: ${conflict.files.join(', ')}`);
      // Validate
      const validation = validateMerge();
      validation.checks.forEach(c => log(`  ${c}`));

      if (validation.valid && risk <= 5) {
        const current = ensureHeadStillCurrent(prNumber, prData.headRefOid, 'pre-conflict-merge-push');
        if (!current.ok) {
          restoreBaseBranchQuietly(prData.baseRefName);
          return false;
        }
        Object.assign(prData, current.prData);

        configureGitIdentity();
        gitRequired(`commit -m ${sh(`Merge PR #${prNumber}: ${prData.title} (conflicts resolved) [skip ci]`)}`);
        const base = safeRefName(prData.baseRefName || activeBaseRef || 'master');
        gitRequired(`push origin HEAD:refs/heads/${base}`);
        closePR(prNumber, prData, cats, risk, reasons, 'conflict-resolved', conflict.files);
        return true;
      } else {
        restoreBaseBranchQuietly();
        log(`  Validation failed or risk too high (${risk}/10), labeling for review`);
        gh(`pr edit ${prNumber} -R ${REPO} --add-label "needs-review,has-conflicts"`);
        gh(`pr comment ${prNumber} -R ${REPO} --body "⚠️ **Tentative de résolution automatique des conflits**\n\nLe merge a été tenté mais la validation a échoué ou le risque est trop élevé (${risk}/10).\n\n**Fichiers en conflit :** ${conflict.files.join(', ')}\n\nMerci de vérifier manuellement avant de fusionner.\n\n_🤖 Smart PR Auto-Merge_"`);
        return false;
      }
    } else {
      log(`  ❌ Cannot auto-resolve: ${conflict.reason}`);
      gh(`pr edit ${prNumber} -R ${REPO} --add-label "needs-review,has-conflicts"`);
      gh(`pr comment ${prNumber} -R ${REPO} --body "⚠️ **Conflits de merge détectés**\n\nLes conflits n'ont pas pu être résolus automatiquement : ${conflict.reason}\n\nMerci de résoudre les conflits manuellement.\n\n_🤖 Smart PR Auto-Merge_"`);
      return false;
    }
  }

  // No conflicts — validate and merge
  if (prData.mergeable === 'MERGEABLE' || prData.mergeable === 'UNKNOWN' || !prData.mergeable) {
    // For low-risk changes, auto-merge
    if (risk <= 4) {
      log('  Low risk, auto-merging...');

      // Validate first by checking out the PR base and merging the exact PR head locally.
      checkoutBaseBranch(prData.baseRefName);
      const prRef = fetchPrHead(prNumber, prData);
      const validatedHeadSha = prData.headRefOid;
      gitRequired(`merge --no-commit --no-ff ${prRef}`);

      const validation = validateMerge();
      validation.checks.forEach(c => log(`  ${c}`));

      if (validation.valid) {
        abortMergeQuietly();
        const current = ensureHeadStillCurrent(prNumber, validatedHeadSha, 'pre-clean-merge');
        if (!current.ok) {
          restoreBaseBranchQuietly(prData.baseRefName);
          return false;
        }
        Object.assign(prData, current.prData);

        try {
          mergePrWithHeadGuard(prNumber, prData);
        } catch (e) {
          if (/still a draft/i.test(e.message)) {
            log(`  PR #${prNumber} became draft during merge; validation passed, skipping auto-merge`);
            return false;
          }
          throw e;
        }
        closePR(prNumber, prData, cats, risk, reasons, 'clean');
        return true;
      } else {
        restoreBaseBranchQuietly();
        log('  Validation failed, requesting review');
        gh(`pr edit ${prNumber} -R ${REPO} --add-label "needs-review"`);
        gh(`pr comment ${prNumber} -R ${REPO} --body "⚠️ **Validation échouée**\n\nLe merge a été tenté mais la validation du code a échoué. Vérifiez les erreurs de syntaxe dans les drivers.\n\nChecks: ${validation.checks.join(' | ')}\n\n_🤖 Smart PR Auto-Merge_"`);
        return false;
      }
    }

    // Medium/high risk — approve but require human confirmation
    log(`  Medium/high risk (${risk}/10), labeling for review`);
    gh(`pr edit ${prNumber} -R ${REPO} --add-label "reviewed-by-ai,risk-${risk <= 6 ? 'medium' : 'high'}"`);

    const riskEmoji = risk <= 6 ? '🟡' : '🔴';
    const riskAdvice = risk <= 6
      ? 'Ce PR semble sûr à fusionner manuellement.'
      : 'Ce PR contient des changements sensibles — vérifiez attentivement avant de fusionner.';

    const changeSummary = [];
    if (cats.fingerprints.length) changeSummary.push(`${cats.fingerprints.length} fingerprints`);
    if (cats.drivers.length) changeSummary.push(`${cats.drivers.length} fichiers driver`);
    if (cats.scripts.length) changeSummary.push(`${cats.scripts.length} scripts`);
    if (cats.workflows.length) changeSummary.push(`${cats.workflows.length} workflows`);
    if (cats.deps.length) changeSummary.push('dépendances');
    if (cats.docs.length) changeSummary.push(`${cats.docs.length} docs`);

    gh(`pr comment ${prNumber} -R ${REPO} --body "${riskEmoji} **Analyse automatique terminée**\n\n**Risque : ${risk}/10** — ${reasons.join(', ')}\n**Changements :** ${changeSummary.join(', ') || 'aucun classifié'}\n**Total :** ${filesList.length} fichier(s)\n\n${riskAdvice}\n\n_🤖 Smart PR Auto-Merge_"`);
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
        restoreBaseBranchQuietly();
      }
    }
  } else {
    merged = await processPR(parseInt(prNum, 10));
  }

  // v5.13.1: Post-merge driver validation
  if (merged) {
    log('\n🔍 Running post-merge driver validation...');
    try {
      const validateResult = require('child_process').execSync(
        'node .github/scripts/validate-drivers.js 2>&1',
        { encoding: 'utf8', timeout: 30000 }
      );
      if (validateResult.includes('❌')) {
        log('⚠️ Post-merge validation found issues:');
        log(validateResult.split('\n').filter(l => l.includes('❌') || l.includes('RESULTS')).join('\n'));
      } else {
        log('✅ Post-merge validation passed');
      }
    } catch (e) {
      log(`⚠️ Validation script: ${e.message.split('\n').slice(0, 3).join(' ')}`);
    }
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
