// Monitoring and optional auto-commit/push utility
// Environment variables:
//  - MONITOR_INTERVAL_MS (default: 30000)
//  - AUTO_MONITOR_COMMIT=1 (enable auto-commit on detected changes)
//  - MONITOR_AUTOPUSH=1 or AUTO_GIT_PUSH=1 or ULTIMATE_GIT_PUSH=1 (enable auto-push after commit)
//  - COMMIT_MESSAGE (override default commit message)
//  - GITHUB_REPO, GIT_BRANCH (used by pushToGitHub.js)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(PROJECT_ROOT, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'monitor.log');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function log(msg, level = 'INFO') {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  ensureDir(LOG_DIR);
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function run(cmd, opts = {}) {
  log(`RUN: ${cmd}`);
  return execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'pipe', encoding: 'utf8', ...opts });
}

function isGitRepo() {
  try {
    run('git rev-parse --is-inside-work-tree');
    return true;
  } catch {
    return false;
  }
}

function getGitStatus() {
  try {
    const out = run('git status --porcelain');
    return out.trim();
  } catch (e) {
    log(`git status failed: ${e.message}`, 'ERROR');
    return '';
  }
}

function autoCommitAndMaybePush() {
  const commitEnabled = process.env.AUTO_MONITOR_COMMIT === '1' || process.env.MONITOR_AUTOCOMMIT === '1';
  const pushEnabled = process.env.MONITOR_AUTOPUSH === '1' || process.env.AUTO_GIT_PUSH === '1' || process.env.ULTIMATE_GIT_PUSH === '1';

  const status = getGitStatus();
  if (!status) {
    log('No changes detected.');
    return;
  }

  log(`Detected changes:\n${status}`);

  if (!commitEnabled) {
    log('AUTO_MONITOR_COMMIT disabled. Skipping commit.', 'WARN');
    return;
  }

  try {
    run('git add -A');
    const msg = process.env.COMMIT_MESSAGE || `chore(monitor): auto-commit at ${new Date().toISOString()}`;
    run(`git commit -m "${msg.replace(/"/g, '\\"')}"`);
    log('Auto-commit completed.', 'SUCCESS');
  } catch (e) {
    log(`Auto-commit failed: ${e.message}`, 'ERROR');
    return;
  }

  if (pushEnabled) {
    try {
      // Prefer existing helper if present
      const pushHelper = path.join(PROJECT_ROOT, 'scripts', 'js', 'pushToGitHub.js');
      if (fs.existsSync(pushHelper)) {
        run('node scripts/js/pushToGitHub.js');
      } else {
        run('git push');
      }
      log('Auto-push completed.', 'SUCCESS');
    } catch (e) {
      log(`Auto-push failed: ${e.message}`, 'ERROR');
    }
  } else {
    log('Auto-push disabled. Set MONITOR_AUTOPUSH=1 to enable.', 'INFO');
  }
}

function initialHealthCheck() {
  try {
    // Light checks to avoid heavy operations each interval
    run('node scripts/js/verifyNodeEnv.js');
    run('node scripts/js/systemCheck.js');
  } catch (e) {
    log(`Initial health check encountered issues: ${e.message}`, 'WARN');
  }
}

function main() {
  log('Monitor started');
  if (!isGitRepo()) {
    log('Not a git repository. Exiting.', 'ERROR');
    process.exit(1);
  }

  initialHealthCheck();

  const intervalMs = parseInt(process.env.MONITOR_INTERVAL_MS || process.env.MONITOR_INTERVAL_SEC * 1000 || '30000', 10);
  log(`Monitoring interval set to ${intervalMs} ms`);

  // First tick immediately to act on any changes
  autoCommitAndMaybePush();

  setInterval(() => {
    try {
      autoCommitAndMaybePush();
    } catch (e) {
      log(`Unexpected error during monitoring loop: ${e.message}`, 'ERROR');
    }
  }, intervalMs);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    log(`Fatal error: ${e.message}`, 'CRITICAL');
    process.exit(1);
  }
}
