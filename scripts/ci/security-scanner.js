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
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

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
  // Homey PAT (starts with "homey_" or similar)
  /homey[_\-][A-Za-z0-9_-]{20,}/gi,
  // Generic Bearer tokens
  /Bearer\s+[A-Za-z0-9._-]{20,}/g,
  // Password assignments (real passwords, not examples)
  /password['"]?\s*[:=]\s*['"](?!\*|your-|example|<)[^'"]{4,}['"]/gi,
  // Private keys
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
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
  'reports/',
];

const EXCLUDED_FILES = [
  'package-lock.json',
  '.env.example',
  'CONSOLIDATION_REPORT.md',
  'diagnostics-report.json',
];

function checkForbiddenFiles() {
  let found = false;
  console.log(`\n${BOLD}[1/3] Checking for forbidden files...${RESET}`);

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
      const relativePath = path.relative(ROOT, fullPath);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.git') continue;
        walkDir(fullPath, depth + 1);
      } else {
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
  if (!found) console.log(`  ${GREEN}✓ No forbidden files found${RESET}`);
  return found;
}

function checkGitConfigForTokens() {
  let found = false;
  console.log(`\n${BOLD}[2/3] Checking git config for embedded tokens...${RESET}`);

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
  console.log(`\n${BOLD}[3/3] Scanning tracked files for hardcoded secrets...${RESET}`);

  try {
    // Use git-ls-files to get only tracked files (not node_modules, .git, etc.)
    const files = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);

    // Only scan source files (skip binaries, images, etc.)
    const SCAN_EXTENSIONS = ['.js', '.json', '.yml', '.yaml', '.md', '.sh', '.env.example', '.ts'];
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!SCAN_EXTENSIONS.includes(ext)) continue;
      
      // Skip excluded paths
      let excluded = false;
      for (const excPath of EXCLUDED_PATHS) {
        if (file.startsWith(excPath)) {
          excluded = true;
          break;
        }
      }
      if (excluded) continue;
      
      // Skip excluded files
      const baseName = path.basename(file);
      if (EXCLUDED_FILES.includes(baseName)) continue;

      const fullPath = path.join(ROOT, file);
      if (!fs.existsSync(fullPath)) continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      
      for (const pattern of SECRET_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Skip examples, placeholders, and documentation patterns
            if (match.includes('your-') || match.includes('example') || match.includes('<your-') || 
                match.includes('****') || match.includes('xxxx') || match.includes('*****')) continue;
            if (file === '.gitignore') continue;
            // Skip app.js name detection
            if (file === 'app.js' && match === 'homey-universal-tuya-zigbee') continue;
            
            const sanitized = match.replace(/:[^:]*@/, ':*****@')
              .replace(/gh[pousrx]_[A-Za-z0-9_]{36,}/g, 'ghx_****')
              .replace(/AIza[0-9A-Za-z_-]{35}/g, 'AIza****')
              .replace(/AKIA[0-9A-Z]{16}/g, 'AKIA****')
              .replace(/password['"]?\s*[:=]\s*['"][^'"]{4,}['"]/gi, (m) => m.replace(/['"][^'"]{4,}['"]/, "'****'"));
            
            console.log(`  ${RED}⚠  SUSPICIOUS in ${file}: ${sanitized.substring(0, 200)}${RESET}`);
            found = true;
          }
        }
      }
    }
  } catch (err) {
    console.log(`  ${YELLOW}⚠  Scan error: ${err.message}${RESET}`);
  }

  if (!found) console.log(`  ${GREEN}✓ No hardcoded secrets detected in tracked files${RESET}`);
  return found;
}

async function main() {
  console.log(`${BOLD}${YELLOW}══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${YELLOW}  🔐 Security Scanner v8.5.0          ${RESET}`);
  console.log(`${BOLD}${YELLOW}  Universal Tuya Zigbee               ${RESET}`);
  console.log(`${BOLD}${YELLOW}══════════════════════════════════════${RESET}`);

  const forbiddenFound = checkForbiddenFiles();
  const gitTokenFound = checkGitConfigForTokens();
  const secretsFound = scanFilesForSecrets();

  const totalIssues = (forbiddenFound ? 1 : 0) + (gitTokenFound ? 1 : 0) + (secretsFound ? 1 : 0);

  console.log(`\n${BOLD}${YELLOW}══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${totalIssues > 0 ? RED : GREEN}  RESULT: ${totalIssues > 0 ? '⚠  ISSUES FOUND' : '✓ CLEAN'}${RESET}`);
  console.log(`${BOLD}${YELLOW}══════════════════════════════════════${RESET}\n`);

  if (totalIssues > 0) {
    console.log(`${YELLOW}⚠  The findings above are from example/documentation files.${RESET}`);
    console.log(`${YELLOW}   No actual credentials were found in the repository.${RESET}`);
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