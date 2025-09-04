#!/usr/bin/env node
/*
 * Push project to GitHub (cross-platform)
 * Mirrors scripts/push-to-github.bat with safer Node.js implementation
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString().trim();
  } catch (e) {
    if (opts.ignoreError) return null;
    throw e;
  }
}

function hasGit() {
  try { execSync('git --version', { stdio: 'ignore' }); return true; } catch { return false; }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--repo') out.repo = args[++i];
    else if (a === '--branch') out.branch = args[++i];
    else if (a === '--user') out.user = args[++i];
    else if (a === '--email') out.email = args[++i];
    else if (a === '--force') out.force = true;
  }
  return out;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function ensureUserConfig(user, email) {
  if (user) exec(`git config user.name "${user.replace(/"/g, '')}"`, { stdio: 'inherit' });
  if (email) exec(`git config user.email "${email.replace(/"/g, '')}"`, { stdio: 'inherit' });
}

function ensureGitRepo(branch) {
  if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
    console.log('Initializing new Git repository...');
    try {
      exec(`git init -b ${branch}`);
    } catch {
      exec('git init');
      // Fallback: create branch if needed
      exec(`git checkout -B ${branch}`, { ignoreError: true });
    }
  }
}

function stageAndCommit() {
  console.log('Adding files to Git...');
  exec('git add .', { stdio: 'inherit' });

  // commit only if staged changes exist
  const hasStaged = exec('git diff --cached --name-only');
  if (hasStaged && hasStaged.length > 0) {
    console.log('Creating commit...');
    const msg = process.env.GIT_COMMIT_MSG || 'Initial commit: Tuya Zigbee project setup';
    exec(`git commit -m "${msg.replace(/"/g, '')}"`, { stdio: 'inherit' });
  } else {
    console.log('No staged changes to commit.');
  }
}

function currentRemote() {
  try { return exec('git remote get-url origin'); } catch { return null; }
}

async function ensureRemote(repoUrl) {
  if (!repoUrl) {
    const existing = currentRemote();
    if (existing) return existing;
    repoUrl = process.env.GITHUB_REPO;
  }
  if (!repoUrl) {
    repoUrl = await prompt('Enter your GitHub repository URL (e.g., https://github.com/USER/REPO.git): ');
  }
  if (!repoUrl) throw new Error('No repository URL provided.');
  const existing = currentRemote();
  if (!existing) {
    console.log('Adding remote repository...');
    exec(`git remote add origin ${repoUrl}`, { stdio: 'inherit' });
  } else {
    console.log(`Remote 'origin' already set to: ${existing}`);
  }
  return repoUrl;
}

function push(branch, force) {
  console.log('Pushing to GitHub...');
  const flags = force ? ' -f' : '';
  exec(`git push -u origin ${branch}${flags}`, { stdio: 'inherit' });
}

(async function main() {
  const { repo, branch = 'main', user = process.env.GIT_USER_NAME, email = process.env.GIT_USER_EMAIL, force = false } = parseArgs();

  if (!hasGit()) {
    console.error('[ERROR] git is not installed or not in PATH');
    process.exit(1);
  }

  await ensureUserConfig(user, email);
  ensureGitRepo(branch);
  stageAndCommit();
  const remoteUrl = await ensureRemote(repo);

  try {
    push(branch, force);
    console.log('\nSuccess! Your code has been pushed to GitHub.');
    console.log(`Repository: ${remoteUrl}`);
  } catch (e) {
    console.error('\nFailed to push to GitHub. Please check your repository URL and try again.');
    console.error(String(e.message || e));
    process.exitCode = 1;
  }
})();
