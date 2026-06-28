#!/usr/bin/env node
/**
 * 🔐 Security Scanner v8.5.0
 * ==========================
 * Scans the repository for:
 * - Hardcoded secrets, tokens, API keys
 * - .env files committed
 * - credentials.json/token.json committed
 * - GitHub tokens in git config
 * - npm/.netrc credentials
 * - Homey PAT tokens
 *
 * Usage: node scripts/ci/security-scanner.js
 * Exit code: 0 = clean, 1 = issues found
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const MAX_SCAN_BYTES = 2 * 1024 * 1024;

const SECRET_PATTERNS = [
  // Generic API keys
  /(?:api[_-]?key|apikey|api_key)['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]/gi,
  // GitHub tokens (ghp_, gho_, ghx_, ghu_, ghs_)
  /gh[pousrx]_[A-Za-z0-9_]{36,}/g,
  // GitHub PAT in URLs
  /https:\/\/[^@]*:[^@]*@github\.com/g,
  // AWS keys
  /AKIA[0-9A-Z]{16}/g,
  // Google API keys
  /AIza[0-9A-Za-z_-]{35}/g,
  // Discord bot tokens
  /[Mm][Nn][Dd][Cc]_[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g,
  // Slack tokens
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  // Homey PAT values only, not ordinary file names such as homey_forum_analysis_complete
  /homey[_\-]?pat[_\-]?[A-Za-z0-9_-]{20,}/gi,
  // Generic Bearer tokens
  /Bearer\s+[A-Za-z0-9._-]{20,}/g,
  // Password assignments (real passwords, not examples)
  /password['"]?\s*[:=]\s*['"](?!\*|your-|example|<)[^'"\n+${}]{8,}['"]/gi,
  // Private keys
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  // JWT tokens (eyJ...)
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g,
  // Connection strings with embedded passwords (mongodb://, postgres://, mysql://, redis://)
  /(?:mongodb|postgres|mysql|redis|amqp):\/\/[^:]+:[^@]+@[^/\s]+/gi,
  // Tuya-specific: device keys/secrets in plain text assignments
  /(?:tuya[_-]?(?:secret|key|token|api[_-]?secret))['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]/gi,
];

const FORBIDDEN_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.staging',
  'credentials.json',
  'token.json',
  'oauth2.keys.json',
  'config.json',
  'secrets.json',
  'homey-auth.json',
  'client_secret.json',
  '.netrc',
  '.npmrc',
  '*.p12',
  '*.pfx',
  '*.keystore',
];

const FORBIDDEN_TRACKED_PATHS = [
  {
    pattern: /^\.github\/state\/(?!\.gitkeep$|README\.md$).+/,
    reason: 'generated dashboard/forum/Gmail/diagnostic state can contain private operational data',
  },
  {
    pattern: /^\.diag\/.+/,
    reason: 'diagnostic tarballs can embed old app snapshots, private state, and cached dashboard data',
  },
  {
    pattern: /^\.cache\/.+/,
    reason: 'local cache entries can contain downloaded API responses or generated analysis artifacts',
  },
  {
    pattern: /^diagnostics\/(?!README\.md$|reports\/\.gitkeep$).+/,
    reason: 'local diagnostics can contain Homey IDs, crash context, and user environment details',
  },
  {
    pattern: /^screenshots(?:\/|$)/,
    reason: 'dashboard/login screenshots can expose account or session details',
  },
  {
    pattern: /^\.agents\/fix_.*\.js$/,
    reason: 'one-off local repair scripts often contain private absolute paths',
  },
];

const EXCLUDED_PATHS = [
  '.git/',
  'node_modules/',
  'backup/',
  '.github/state/',
  '.github/scripts/temp/',
  '.agents/skills/',
  '.archive/',
  'tmp/',
  'dumps/',
  'data/',
  'reference pdf/',
  'references/',   // harvested reference content, not source code
  'docs/',         // documentation, not source code
  'reports/',      // generated reports
  '.diag/',
  '.memory/',
  '.ai/',
  '.gemini/',
  '.claude/',
  'screenshots/',
  '.homeybuild/',
  'build/',
  'dist/',
  'test/',
  'tests/',
  'spec/',
  'skills/',
  'scratch/',
  'diagnostics/',
  'logs/',
];

const EXCLUDED_FILES = [
  'package-lock.json',
  '.env.example',
  'CONSOLIDATION_REPORT.md',
  'diagnostics-report.json',
  'security-scanner.js',
];

function getTrackedFiles() {
  try {
    return new Set(execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(f => f.replace(/\\/g, '/')));
  } catch {
    return new Set();
  }
}

function patternLikelyRelevant(pattern, content, lower) {
  const src = pattern.source;
  if (src.includes('api') && !lower.includes('api') && !lower.includes('key')) return false;
  if (src.includes('gh[pousrx]') && !content.includes('gh')) return false;
  if (src.includes('github\\.com') && !lower.includes('github.com')) return false;
  if (src.includes('AKIA') && !content.includes('AKIA')) return false;
  if (src.includes('AIza') && !content.includes('AIza')) return false;
  if (src.includes('Mm') && !content.includes('_')) return false;
  if (src.includes('xox') && !lower.includes('xox')) return false;
  if (src.includes('homey') && !lower.includes('homey_') && !lower.includes('homey-')) return false;
  if (src.includes('Bearer') && !content.includes('Bearer')) return false;
  if (src.includes('password') && !lower.includes('password')) return false;
  if (src.includes('PRIVATE KEY') && !content.includes('PRIVATE KEY')) return false;
  if (src.includes('eyJ') && !content.includes('eyJ')) return false;
  if (src.includes('mongodb') && !lower.includes('://')) return false;
  if (src.includes('tuya') && !lower.includes('tuya')) return false;
  return true;
}

function checkForbiddenFiles() {
  let found = false;
  console.log(`\n${BOLD}[1/4] Checking for forbidden files and tracked private artifacts...${RESET}`);
  const trackedFiles = getTrackedFiles();

  for (const file of trackedFiles) {
    for (const rule of FORBIDDEN_TRACKED_PATHS) {
      if (rule.pattern.test(file)) {
        console.log(`  ${RED}⚠  FORBIDDEN TRACKED PATH: ${file}${RESET}`);
        console.log(`  ${YELLOW}   → ${rule.reason}${RESET}`);
        found = true;
      }
    }
  }

  const walkDir = (dir, depth = 0) => {
    if (depth > 4) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.git') continue;
        walkDir(fullPath, depth + 1);
      } else {
        if (!trackedFiles.has(relativePath)) continue;
        for (const forbidden of FORBIDDEN_FILES) {
          if (forbidden.includes('*')) {
            const pattern = new RegExp('^' + forbidden.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            if (pattern.test(entry.name)) {
              console.log(`  ${RED}⚠  FORBIDDEN: ${relativePath}${RESET}`);
              found = true;
            }
          } else if (entry.name === forbidden) {
            console.log(`  ${RED}⚠  FORBIDDEN: ${relativePath}${RESET}`);
            found = true;
          }
        }
      }
    }
  };

  walkDir(ROOT);
  if (!found) console.log(`  ${GREEN}✓ No forbidden files or tracked private artifacts found${RESET}`);
  return found;
}

function checkGitConfigForTokens() {
  let found = false;
  console.log(`\n${BOLD}[2/4] Checking git config for embedded tokens...${RESET}`);

  try {
    const gitConfigPath = path.join(ROOT, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const config = fs.readFileSync(gitConfigPath, 'utf8');
      const tokenMatch = config.match(/https:\/\/[^@]*:[^@]*@github\.com/);
      if (tokenMatch) {
        const sanitized = tokenMatch[0].replace(/:[^@]+@/, ':*****@');
        console.log(`  ${RED}⚠  GIT CONFIG contains embedded token: ${sanitized}${RESET}`);
        console.log(`  ${YELLOW}   → Action required: Run 'git remote set-url origin <clean-URL>'${RESET}`);
        found = true;
      } else {
        console.log(`  ${GREEN}✓ No tokens in git config${RESET}`);
      }
    }

    // Check git remotes
    const remotes = execSync('git remote -v', { cwd: ROOT, encoding: 'utf8' });
    const remoteMatches = remotes.match(/https:\/\/[^@]*:[^@]*@github\.com/g);
    if (remoteMatches) {
      for (const match of remoteMatches) {
        const sanitized = match.replace(/:[^@]+@/, ':*****@');
        console.log(`  ${YELLOW}ℹ  Remote URL (sanitized): ${sanitized}${RESET}`);
        // Only flag if it has an actual token (not just username)
        if (!match.includes('x-access-token')) {
          console.log(`  ${YELLOW}   → Consider using SSH instead of HTTPS for security${RESET}`);
        }
      }
    }
  } catch (err) {
    console.log(`  ${YELLOW}⚠  Could not check git config: ${err.message}${RESET}`);
  }

  return found;
}

function scanFilesForSecrets() {
  let found = false;
  console.log(`\n${BOLD}[3/4] Scanning tracked files for hardcoded secrets...${RESET}`);

  try {
    const grepPatterns = [
      'gh[pousrx]_[A-Za-z0-9_]{36,}',
      'github_pat_[A-Za-z0-9_]{20,}_[A-Za-z0-9_]{40,}',
      'AKIA[0-9A-Z]{16}',
      'AIza[0-9A-Za-z_-]{35}',
      'xox[baprs]-[A-Za-z0-9-]{10,}',
      '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',
      'eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]+',
      'Bearer[[:space:]]+[A-Za-z0-9._-]{24,}',
      '(mongodb|postgres|mysql|redis|amqp)://[^:[:space:]]+:[^@[:space:]]+@[^/[:space:]]+',
      'homey[_-]?pat[_-]?[A-Za-z0-9_-]{20,}',
      'tuya[_-]?(secret|token|api[_-]?secret)[[:space:]]*[:=][[:space:]]*[\\047"][A-Za-z0-9_-]{16,}[\\047"]',
      'password[\\047"]?[[:space:]]*[:=][[:space:]]*[\\047"][^\\047"[:space:]]{8,}[\\047"]',
    ];
    const args = ['grep', '-I', '-n', '-E'];
    for (const pattern of grepPatterns) args.push('-e', pattern);
    args.push('--',
      '.',
      ':(exclude).git/**',
      ':(exclude)node_modules/**',
      ':(exclude).github/state/**',
      ':(exclude).agents/skills/**',
      ':(exclude).diag/**',
      ':(exclude).cache/**',
      ':(exclude)diagnostics/**',
      ':(exclude)dumps/**',
      ':(exclude)screenshots/**',
      ':(exclude)docs/**',
      ':(exclude)reports/**',
      ':(exclude)test/**',
      ':(exclude)tests/**',
      ':(exclude)package-lock.json',
      ':(exclude)scripts/ci/security-scanner.js',
      ':(exclude)scripts/ci/history-secret-scanner.js',
    );

    let raw = '';
    try {
      raw = execFileSync('git', args, {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        timeout: 60000,
      });
    } catch (err) {
      raw = err.stdout || '';
      if (err.status && err.status !== 1) throw err;
    }

    const lines = raw.split(/\r?\n/).filter(Boolean);
    for (const line of lines.slice(0, 200)) {
      const sanitized = line
        .replace(/gh[pousrx]_[A-Za-z0-9_]{36,}/g, 'ghx_****')
        .replace(/github_pat_[A-Za-z0-9_]{20,}_[A-Za-z0-9_]{40,}/g, 'github_pat_****')
        .replace(/AIza[0-9A-Za-z_-]{35}/g, 'AIza****')
        .replace(/AKIA[0-9A-Z]{16}/g, 'AKIA****')
        .replace(/xox[baprs]-[A-Za-z0-9-]{10,}/g, 'xox****')
        .replace(/Bearer\s+[A-Za-z0-9._-]{24,}/g, 'Bearer ****')
        .replace(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, 'jwt.****')
        .replace(/password['"]?\s*[:=]\s*['"][^'"]{4,}['"]/gi, (m) => m.replace(/['"][^'"]{4,}['"]/, "'****'"));
      console.log(`  ${RED}⚠  SUSPICIOUS: ${sanitized.substring(0, 240)}${RESET}`);
      found = true;
    }
    if (lines.length > 200) {
      console.log(`  ${YELLOW}⚠  ${lines.length - 200} additional suspicious lines suppressed${RESET}`);
      found = true;
    }
  } catch (err) {
    console.log(`  ${YELLOW}⚠  Scan error: ${err.message}${RESET}`);
    found = true;
  }

  if (!found) console.log(`  ${GREEN}✓ No hardcoded secrets detected in tracked files${RESET}`);
  return found;
}

function checkWorkflowSecretExposure() {
  let found = false;
  console.log(`\n${BOLD}[4/4] Checking workflows for secret exposure in shell scripts...${RESET}`);

  try {
    const workflowDir = path.join(ROOT, '.github', 'workflows');
    if (!fs.existsSync(workflowDir)) return found;

    const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    for (const file of files) {
      const fullPath = path.join(workflowDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      let runIndent = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trim = line.trim();
        if (!trim || trim.startsWith('#')) continue;
        const indent = line.match(/^\s*/)[0].length;

        if (runIndent !== null && indent <= runIndent && !trim.startsWith('|') && !trim.startsWith('>')) {
          runIndent = null;
        }

        if (/^run:\s*/.test(trim)) {
          runIndent = indent;
          const inline = trim.replace(/^run:\s*/, '');
          if (inline.includes('${{ secrets.')) {
            const secretMatch = inline.match(/secrets\.(\w+)/);
            console.log(`  ${YELLOW}⚠  ${file}:${i + 1} — secret "${secretMatch?.[1] || '?'}" interpolated directly in run:${RESET}`);
            found = true;
          }
          continue;
        }

        if (runIndent !== null && line.includes('${{ secrets.')) {
          const secretMatch = line.match(/secrets\.(\w+)/);
          console.log(`  ${YELLOW}⚠  ${file}:${i + 1} — secret "${secretMatch?.[1] || '?'}" interpolated directly in run block${RESET}`);
          found = true;
        }
      }
    }
  } catch (err) {
    console.log(`  ${YELLOW}⚠  Workflow scan error: ${err.message}${RESET}`);
  }

  if (!found) console.log(`  ${GREEN}✓ No secret exposure in workflow shell scripts${RESET}`);
  return found;
}

async function main() {
  console.log(`${BOLD}${YELLOW}══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${YELLOW}  🔐 Security Scanner v8.6.0          ${RESET}`);
  console.log(`${BOLD}${YELLOW}  Universal Tuya Zigbee               ${RESET}`);
  console.log(`${BOLD}${YELLOW}══════════════════════════════════════${RESET}`);

  const forbiddenFound = checkForbiddenFiles();
  const gitTokenFound = checkGitConfigForTokens();
  const secretsFound = scanFilesForSecrets();
  const workflowExposure = checkWorkflowSecretExposure();

  const totalIssues = (forbiddenFound ? 1 : 0) + (gitTokenFound ? 1 : 0) + (secretsFound ? 1 : 0) + (workflowExposure ? 1 : 0);

  console.log(`\n${BOLD}${YELLOW}══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${totalIssues > 0 ? RED : GREEN}  RESULT: ${totalIssues > 0 ? '⚠  ISSUES FOUND' : '✓ CLEAN'}${RESET}`);
  console.log(`${BOLD}${YELLOW}══════════════════════════════════════${RESET}\n`);

  if (totalIssues > 0) {
    console.log(`${YELLOW}⚠  Security findings were detected above.${RESET}`);
    console.log(`${YELLOW}   Remove generated/private artifacts from Git, rotate any exposed credentials, then rerun this scanner.${RESET}`);
    if (gitTokenFound) {
      console.log(`${RED}🚨 CRITICAL: Git remote URL contains an embedded token!${RESET}`);
      console.log(`${YELLOW}   Fix: git remote set-url origin https://github.com/dlnraja/com.tuya.zigbee.git${RESET}`);
      console.log(`${RED}   Also revoke the token at: https://github.com/settings/tokens${RESET}`);
    }
    console.log('');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(`${RED}Security scanner crashed: ${err.message}${RESET}`);
  process.exit(2);
});
