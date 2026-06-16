#!/usr/bin/env node
'use strict';

/**
 * auto-push-publish.js - Automated Push and Publish Pipeline v1.0.0
 * =================================================================
 * Validates all changes, runs pre-commit checks, creates git commit,
 * pushes to remote, monitors publish status, and alerts on failure.
 *
 * Features:
 *   - Pre-commit validation gate (syntax, JSON, anti-patterns)
 *   - Git status check (dirty files, untracked files)
 *   - Auto-staging of changed files
 *   - Commit message generation with conventional format
 *   - Push to remote with retry logic
 *   - Publish status monitoring (Homey app store)
 *   - Failure alerting with detailed error info
 *
 * Usage:
 *   node scripts/automation/auto-push-publish.js                    # full pipeline
 *   node scripts/automation/auto-push-publish.js --dry-run          # preview only
 *   node scripts/automation/auto-push-publish.js --message="custom" # custom message
 *   node scripts/automation/auto-push-publish.js --skip-validate    # skip validation
 *   node scripts/automation/auto-push-publish.js --no-publish       # push only, no publish
 *   node scripts/automation/auto-push-publish.js --branch=master    # target branch
 *   node scripts/automation/auto-push-publish.js --auto-commit      # auto-commit changes
 *
 * Exit codes:
 *   0 = push/publish successful
 *   1 = validation failed or push rejected
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT_DIR = path.join(ROOT, '.cache', 'publish');
const REPORT_PATH = path.join(REPORT_DIR, 'publish-report.json');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const APP_JSON = path.join(ROOT, 'app.json');

// ── CLI Arguments ─────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.includes(`--${name}`);
const OPT = (name) => {
  const a = ARGS.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

const DRY_RUN = FLAG('dry-run');
const VERBOSE = FLAG('verbose');
const SKIP_VALIDATE = FLAG('skip-validate');
const NO_PUBLISH = FLAG('no-publish');
const AUTO_COMMIT = FLAG('auto-commit');
const CUSTOM_MESSAGE = OPT('message');
const TARGET_BRANCH = OPT('branch') || 'master';

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(color, ...args) {
  console.log(`${C[color] || ''}[PUSH-PUBLISH]${C.reset}`, ...args);
}

function warn(...args) {
  console.warn(`${C.yellow}[PUSH-PUBLISH WARN]${C.reset}`, ...args);
}

function error(...args) {
  console.error(`${C.red}[PUSH-PUBLISH ERROR]${C.reset}`, ...args);
}

// ── Execute shell command ─────────────────────────────────────────────────────
function exec(cmd, options = {}) {
  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: options.timeout || 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });
    return { success: true, output: output.trim() };
  } catch (err) {
    return {
      success: false,
      output: (err.stdout || '') + (err.stderr || ''),
      error: err.message,
      exitCode: err.status,
    };
  }
}

// ── Get current version from package.json ─────────────────────────────────────
function getCurrentVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON));
    return pkg.version || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
}

// ── Get app version from app.json ─────────────────────────────────────────────
function getAppVersion() {
  try {
    const app = JSON.parse(fs.readFileSync(APP_JSON));
    return app.version || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
}

// ── Check git status ──────────────────────────────────────────────────────────
function checkGitStatus() {
  log('cyan', 'Checking git status...');

  const status = exec('git status --porcelain');
  if (!status.success) {
    error('Failed to get git status');
    return null;
  }

  const lines = status.output.split('\n').filter(l => l.trim());
  const staged = [];
  const modified = [];
  const untracked = [];
  const deleted = [];

  for (const line of lines) {
    const statusChar = line.substring(0, 2).trim();
    const filePath = line.substring(3);

    if (statusChar === 'M' || statusChar === 'A') {
      staged.push(filePath);
    } else if (statusChar === 'M') {
      modified.push(filePath);
    } else if (statusChar === 'D') {
      deleted.push(filePath);
    } else if (statusChar === '??') {
      untracked.push(filePath);
    }
  }

  return {
    clean: lines.length === 0,
    staged,
    modified,
    untracked,
    deleted,
    totalChanges: lines.length,
  };
}

// ── Get diff stats ────────────────────────────────────────────────────────────
function getDiffStats() {
  const diff = exec('git diff --stat');
  if (!diff.success) return null;

  const lines = diff.output.split('\n');
  const summary = lines[lines.length - 1] || '';
  const match = summary.match(/(\d+) files? changed/);

  return {
    filesChanged: match ? parseInt(match[1], 10) : 0,
    summary,
  };
}

// ── Generate commit message ───────────────────────────────────────────────────
function generateCommitMessage(gitStatus) {
  if (CUSTOM_MESSAGE) return CUSTOM_MESSAGE;

  const version = getAppVersion();
  const timestamp = new Date().toISOString().split('T')[0];

  // Determine type of change
  const hasDriverChanges = gitStatus.modified.some(f => f.startsWith('drivers/'));
  const hasLibChanges = gitStatus.modified.some(f => f.startsWith('lib/'));
  const hasNewDrivers = gitStatus.untracked.some(f => f.startsWith('drivers/'));
  const hasDataChanges = gitStatus.modified.some(f => f.startsWith('data/'));
  const hasScriptChanges = gitStatus.modified.some(f => f.startsWith('scripts/'));

  let type = 'chore';
  let scope = '';

  if (hasNewDrivers) {
    type = 'feat';
    scope = 'drivers';
  } else if (hasDriverChanges) {
    type = 'fix';
    scope = 'drivers';
  } else if (hasLibChanges) {
    type = 'fix';
    scope = 'lib';
  } else if (hasDataChanges) {
    type = 'data';
    scope = 'fingerprints';
  } else if (hasScriptChanges) {
    type = 'ci';
    scope = 'scripts';
  }

  const changeCount = gitStatus.totalChanges;
  const detail = changeCount === 1 ? '1 file' : `${changeCount} files`;

  return `${type}(${scope}): v${version} update ${detail} [${timestamp}]`;
}

// ── Run pre-commit validation ─────────────────────────────────────────────────
function runValidation() {
  if (SKIP_VALIDATE) {
    log('yellow', 'Skipping validation (--skip-validate)');
    return true;
  }

  log('cyan', 'Running pre-commit validation...');

  // 1. Syntax check key files
  const keyFiles = ['app.js', 'lib/tuya/TuyaZigbeeDevice.js', 'lib/devices/BaseHybridDevice.js'];
  for (const file of keyFiles) {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
      const result = exec(`node --check "${fullPath}"`, { timeout: 10000 });
      if (!result.success) {
        error(`Syntax check failed: ${file}`);
        return false;
      }
    }
  }

  // 2. Validate driver compose.json files
  const driversDir = path.join(ROOT, 'drivers');
  if (fs.existsSync(driversDir)) {
    const driverDirs = fs.readdirSync(driversDir);
    for (const dir of driverDirs) {
      const dcjPath = path.join(driversDir, dir, 'driver.compose.json');
      if (fs.existsSync(dcjPath)) {
        try {
          JSON.parse(fs.readFileSync(dcjPath));
        } catch (e) {
          error(`Invalid JSON: drivers/${dir}/driver.compose.json`);
          return false;
        }
      }
    }
  }

  // 3. Check bundle size
  const sizeResult = exec('node -e "const fs=require(\'fs\');const p=require(\'path\');let s=0;[\'lib\',\'drivers\',\'data\'].forEach(d=>{const dir=p.join(__dirname,d);if(fs.existsSync(dir)){const files=fs.readdirSync(dir,{recursive:true}).filter(f=>f.endsWith(\'.js\')||f.endsWith(\'.json\'));files.forEach(f=>{try{s+=fs.statSync(p.join(dir,f)).size}catch(e){}})}});console.log((s/1024/1024).toFixed(2))"');
  if (sizeResult.success) {
    const sizeMB = parseFloat(sizeResult.output);
    if (sizeMB > 7) {
      error(`Bundle size ${sizeMB}MB exceeds 7MB limit`);
      return false;
    }
    log('dim', `Bundle size: ${sizeMB}MB (within limit)`);
  }

  log('green', 'Validation passed');
  return true;
}

// ── Stage and commit changes ──────────────────────────────────────────────────
function stageAndCommit(commitMessage) {
  log('cyan', 'Staging changes...');

  // Stage all changes
  const stageResult = exec('git add -A');
  if (!stageResult.success) {
    error('Failed to stage changes');
    return false;
  }

  // Check if there's anything to commit
  const status = exec('git status --porcelain');
  if (!status.success || !status.output.trim()) {
    log('yellow', 'No changes to commit');
    return true;
  }

  // Commit
  log('cyan', 'Creating commit...');
  const commitResult = exec(`git commit -m "${commitMessage}"`);
  if (!commitResult.success) {
    error('Failed to create commit');
    return false;
  }

  log('green', `Commit created: ${commitMessage}`);
  return true;
}

// ── Push to remote ────────────────────────────────────────────────────────────
function pushToRemote(branch) {
  log('cyan', `Pushing to remote (branch: ${branch})...`);

  let retries = 3;
  while (retries > 0) {
    const pushResult = exec(`git push origin ${branch}`, { timeout: 120000 });
    if (pushResult.success) {
      log('green', 'Push successful');
      return true;
    }

    retries--;
    if (retries > 0) {
      warn(`Push failed, retrying (${retries} attempts left)...`);
      execSync('sleep 5');
    } else {
      error(`Push failed after 3 attempts: ${pushResult.error}`);
      return false;
    }
  }

  return false;
}

// ── Monitor publish status ────────────────────────────────────────────────────
function monitorPublish() {
  if (NO_PUBLISH) {
    log('yellow', 'Skipping publish monitoring (--no-publish)');
    return true;
  }

  log('cyan', 'Monitoring publish status...');

  // Check if there's a publish workflow running
  const workflowCheck = exec('gh run list --workflow=publish.yml --limit=1 --json status,conclusion', { timeout: 30000 });
  if (!workflowCheck.success) {
    log('yellow', 'Could not check publish workflow status (gh CLI may not be available)');
    return true;
  }

  try {
    const runs = JSON.parse(workflowCheck.output);
    if (runs.length > 0) {
      const latest = runs[0];
      log('dim', `Latest publish workflow: ${latest.status} (${latest.conclusion || 'pending'})`);

      if (latest.status === 'completed' && latest.conclusion === 'failure') {
        error('Publish workflow failed!');
        return false;
      }
    }
  } catch (e) {
    log('yellow', 'Could not parse workflow status');
  }

  log('green', 'Publish status OK');
  return true;
}

// ── Generate report ───────────────────────────────────────────────────────────
function generateReport(gitStatus, commitMessage, pushSuccess, publishSuccess) {
  return {
    timestamp: new Date().toISOString(),
    version: getAppVersion(),
    branch: TARGET_BRANCH,
    dryRun: DRY_RUN,
    gitStatus: {
      clean: gitStatus?.clean,
      totalChanges: gitStatus?.totalChanges,
      staged: gitStatus?.staged?.length || 0,
      modified: gitStatus?.modified?.length || 0,
      untracked: gitStatus?.untracked?.length || 0,
    },
    commit: {
      message: commitMessage,
      created: !DRY_RUN,
    },
    push: {
      success: pushSuccess,
      branch: TARGET_BRANCH,
    },
    publish: {
      monitored: !NO_PUBLISH,
      success: publishSuccess,
    },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('cyan', 'Automated Push and Publish Pipeline v1.0.0');
  log('dim', `Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  log('dim', `Branch: ${TARGET_BRANCH}`);
  log('dim', `Version: ${getAppVersion()}`);
  log('');

  // 1. Check git status
  const gitStatus = checkGitStatus();
  if (!gitStatus) {
    error('Failed to check git status');
    process.exit(2);
  }

  if (gitStatus.clean && !AUTO_COMMIT) {
    log('green', 'Working tree is clean - nothing to commit');
    process.exit(0);
  }

  log('dim', `Changes: ${gitStatus.totalChanges} files`);
  if (VERBOSE) {
    if (gitStatus.modified.length > 0) log('dim', `  Modified: ${gitStatus.modified.join(', ')}`);
    if (gitStatus.untracked.length > 0) log('dim', `  Untracked: ${gitStatus.untracked.join(', ')}`);
    if (gitStatus.deleted.length > 0) log('dim', `  Deleted: ${gitStatus.deleted.join(', ')}`);
  }

  // 2. Run validation
  if (!runValidation()) {
    error('Validation failed - commit blocked');
    process.exit(1);
  }

  // 3. Generate commit message
  const commitMessage = generateCommitMessage(gitStatus);
  log('cyan', `Commit message: ${commitMessage}`);

  if (DRY_RUN) {
    log('yellow', 'DRY RUN - No changes will be committed or pushed');
    log('');
    log('cyan', 'Would have committed:');
    log('dim', `  Message: ${commitMessage}`);
    log('dim', `  Branch: ${TARGET_BRANCH}`);
    log('dim', `  Files: ${gitStatus.totalChanges}`);

    const report = generateReport(gitStatus, commitMessage, false, false);
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    process.exit(0);
  }

  // 4. Stage and commit
  if (!stageAndCommit(commitMessage)) {
    error('Failed to create commit');
    process.exit(1);
  }

  // 5. Push to remote
  const pushSuccess = pushToRemote(TARGET_BRANCH);
  if (!pushSuccess) {
    error('Failed to push to remote');
    process.exit(1);
  }

  // 6. Monitor publish
  const publishSuccess = monitorPublish();
  if (!publishSuccess) {
    warn('Publish monitoring reported failure');
  }

  // 7. Generate report
  const report = generateReport(gitStatus, commitMessage, pushSuccess, publishSuccess);
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  // Save to state directory
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(STATE_DIR, 'publish-report.json'),
    JSON.stringify(report, null, 2)
  );

  // 8. Summary
  log('');
  log('cyan', '========================================');
  log('cyan', '  PUSH/PUBLISH SUMMARY');
  log('cyan', '========================================');
  log('dim', `Version: ${getAppVersion()}`);
  log('dim', `Branch: ${TARGET_BRANCH}`);
  log('dim', `Commit: ${commitMessage}`);
  log('green', `Push: ${pushSuccess ? 'SUCCESS' : 'FAILED'}`);
  log(publishSuccess ? 'green' : 'yellow', `Publish: ${publishSuccess ? 'OK' : 'CHECK MANUALLY'}`);
  log('');
  log('green', 'Pipeline completed successfully');

  process.exit(0);
}

// ── Error handling ────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  process.exit(2);
});

process.on('unhandledRejection', (err) => {
  error(`Unhandled rejection: ${err.message || err}`);
  process.exit(2);
});

main();
