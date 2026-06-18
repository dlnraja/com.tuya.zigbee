#!/usr/bin/env node
/**
 * security-check.js - Security & Vulnerability Verification
 * ==========================================================
 * Checks:
 *   1. Hardcoded secrets (API keys, tokens, passwords)
 *   2. eval() usage (code injection risk)
 *   3. Prototype pollution (Object.assign with user input)
 *   4. Path traversal (unsanitized path.join with user data)
 *   5. Dangerous function usage (Function(), new Function)
 *   6. Environment variable exposure
 *   7. Sensitive file detection (.env, credentials, keys)
 *   8. GitHub token exposure in git config
 *   9. Unsafe regex (ReDoS potential)
 *  10. Email/PII leak detection in source code
 *
 * Usage: node scripts/automation/security-check.js
 * Exit code: 0 = clean, 1 = critical issues, 2 = warnings
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const LIB_DIR = path.join(ROOT, 'lib');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// ── ANSI colors ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ── Report ───────────────────────────────────────────────────────
const report = {
  errors: [],
  warnings: [],
  info: [],
  stats: {
    filesScanned: 0,
    hardcodedSecrets: 0,
    evalUsage: 0,
    prototypePollution: 0,
    pathTraversal: 0,
    dangerousFunctions: 0,
    envExposure: 0,
    sensitiveFiles: 0,
    gitTokenLeaks: 0,
    unsafeRegex: 0,
    emailLeaks: 0,
  },
};

function log(msg) { console.log(`${CYAN}[SECURITY]${RESET} ${msg}`); }
function err(msg) { report.errors.push(msg); console.error(`${RED}[CRITICAL]${RESET} ${msg}`); }
function warn(msg) { report.warnings.push(msg); console.warn(`${YELLOW}[WARN]${RESET} ${msg}`); }

// ── Excluded paths ───────────────────────────────────────────────
const EXCLUDED_DIRS = [
  'node_modules', '.git', 'backup', '.archive', 'tmp', 'dumps',
  '.github/state', '.github/scripts/temp', 'data', 'reports',
];
const EXCLUDED_FILES = ['package-lock.json', '.env.example'];

function shouldExclude(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (EXCLUDED_FILES.some(f => rel.endsWith(f))) return true;
  return EXCLUDED_DIRS.some(d => rel.startsWith(d + path.sep) || rel.includes(path.sep + d + path.sep));
}

// ── Collect JS files ─────────────────────────────────────────────
function collectJsFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.some(d => entry.name === d || entry.name === d.split('/')[0])) {
          files.push(...collectJsFiles(fullPath));
        }
      } else if ((entry.name.endsWith('.js') || entry.name.endsWith('.json')) && !shouldExclude(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (e) { /* skip */ }
  return files;
}

// ── 1. Hardcoded Secrets ─────────────────────────────────────────
function checkHardcodedSecrets(files) {
  log('Phase 1: Scanning for hardcoded secrets...');

  const secretPatterns = [
    {
      name: 'GitHub token (ghp_, gho_, ghx_, ghu_, ghs_)',
      regex: /gh[pousrx]_[A-Za-z0-9_]{36,}/g,
      severity: 'critical',
    },
    {
      name: 'API key assignment',
      regex: /(?:api[_-]?key|apikey|api_key)['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]/gi,
      severity: 'high',
    },
    {
      name: 'AWS access key',
      regex: /AKIA[0-9A-Z]{16}/g,
      severity: 'critical',
    },
    {
      name: 'Google API key',
      regex: /AIza[0-9A-Za-z_-]{35}/g,
      severity: 'critical',
    },
    {
      name: 'Discord bot token',
      regex: /[Mm][Nn][Dd][Cc]_[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g,
      severity: 'critical',
    },
    {
      name: 'Slack token',
      regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g,
      severity: 'critical',
    },
    {
      name: 'Homey PAT token',
      regex: /homey[_\-][A-Za-z0-9_-]{20,}/gi,
      severity: 'high',
    },
    {
      name: 'Bearer token',
      regex: /Bearer\s+[A-Za-z0-9._-]{40,}/g,
      severity: 'high',
    },
    {
      name: 'Private key header',
      regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
      severity: 'critical',
    },
    {
      name: 'JWT token (eyJ...)',
      regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g,
      severity: 'high',
    },
    {
      name: 'Connection string with credentials',
      regex: /(?:mongodb|postgres|mysql|redis|amqp):\/\/[^:]+:[^@]+@[^/\s]+/gi,
      severity: 'critical',
    },
    {
      name: 'Tuya secret/key assignment',
      regex: /(?:tuya[_-]?(?:secret|key|token|api[_-]?secret))['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]/gi,
      severity: 'high',
    },
    {
      name: 'Hardcoded password',
      regex: /password['"]?\s*[:=]\s*['"](?!\*|your-|example|<|placeholder|xxx)[^'"]{4,}['"]/gi,
      severity: 'high',
    },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      for (const pattern of secretPatterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            // Skip obvious placeholders and documentation
            if (match.includes('example') || match.includes('placeholder') ||
                match.includes('YOUR_') || match.includes('xxx') ||
                match.includes('<') || rel.endsWith('.md')) continue;

            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            const msg = `Hardcoded ${pattern.name} in ${rel}:${lineNum}: ${match.substring(0, 30)}...`;

            if (pattern.severity === 'critical') {
              err(msg);
            } else {
              warn(msg);
            }
            report.stats.hardcodedSecrets++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 2. eval() Usage ──────────────────────────────────────────────
function checkEvalUsage(files) {
  log('Phase 2: Checking for eval() usage...');

  const evalPatterns = [
    { regex: /\beval\s*\(/g, name: 'eval()' },
    { regex: /\bnew\s+Function\s*\(/g, name: 'new Function()' },
    { regex: /\bsetTimeout\s*\(\s*['"][^'"]+['"]/g, name: 'setTimeout with string' },
    { regex: /\bsetInterval\s*\(\s*['"][^'"]+['"]/g, name: 'setInterval with string' },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      for (const pattern of evalPatterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            err(`${pattern.name} in ${rel}:${lineNum} - code injection risk`);
            report.stats.evalUsage++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 3. Prototype Pollution ───────────────────────────────────────
function checkPrototypePollution(files) {
  log('Phase 3: Checking for prototype pollution risks...');

  const patterns = [
    { regex: /Object\.assign\s*\(\s*(?:target|obj|result|config|options|merge)[^)]*,\s*(?:req|body|query|params|input|data)/gi, name: 'Object.assign with user input' },
    { regex: /\.__proto__\s*=/g, name: '__proto__ assignment' },
    { regex: /constructor\s*\[['"](?:prototype|__proto__)['"]\]/g, name: 'constructor prototype access' },
    { regex: /\bmerge\s*\([^)]*(?:req|body|query|params|input|data)/gi, name: 'merge function with user input' },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      for (const pattern of patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            warn(`${pattern.name} in ${rel}:${lineNum}`);
            report.stats.prototypePollution++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 4. Path Traversal ────────────────────────────────────────────
function checkPathTraversal(files) {
  log('Phase 4: Checking for path traversal risks...');

  const patterns = [
    { regex: /path\.join\s*\([^)]*(?:req|body|query|params|input|filename|file|dir)[^)]*\)/gi, name: 'path.join with user input' },
    { regex: /\.\.\//g, name: 'relative path reference' },
    { regex: /fs\.(readFile|writeFile|unlink|access|stat|mkdir)\s*\([^)]*(?:req|body|query|params)/gi, name: 'fs operation with user input' },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      // Only check actual runtime files, not scripts
      if (rel.startsWith('scripts' + path.sep)) continue;

      for (const pattern of patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            // Skip relative path references in require() - these are normal
            if (pattern.name === 'relative path reference') {
              const lineNum = content.substring(0, content.indexOf(match)).split('\n')[content.substring(0, content.indexOf(match)).split('\n').length - 1];
              if (lineNum && lineNum.includes('require(')) continue;
            }

            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            warn(`${pattern.name} in ${rel}:${lineNum}`);
            report.stats.pathTraversal++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 5. Dangerous Function Usage ──────────────────────────────────
function checkDangerousFunctions(files) {
  log('Phase 5: Checking for dangerous function usage...');

  const patterns = [
    { regex: /\bprocess\.exit\s*\(\s*[^1)]/g, name: 'process.exit() (non-error)' },
    { regex: /\bchild_process\b.*\bexec\b/g, name: 'child_process.exec (use execSync with timeout)' },
    { regex: /\bspawnSync\b.*(?:shell|exec)/g, name: 'spawnSync with shell' },
    { regex: /\bfs\.(?:chmod|chown)\b/g, name: 'fs.chmod/chown (permissions change)' },
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      for (const pattern of patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            warn(`${pattern.name} in ${rel}:${lineNum}`);
            report.stats.dangerousFunctions++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 6. Environment Variable Exposure ─────────────────────────────
function checkEnvExposure(files) {
  log('Phase 6: Checking for environment variable exposure...');

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      // Check for process.env usage with sensitive names
      const envMatches = content.match(/process\.env\.([A-Z_]+)/g);
      if (envMatches) {
        for (const match of envMatches) {
          const envName = match.replace('process.env.', '');
          const sensitivePatterns = /TOKEN|SECRET|KEY|PASSWORD|PASS|CREDENTIAL|AUTH|PAT|PAT_/i;
          if (sensitivePatterns.test(envName)) {
            // Check if it's used safely (not logged, not exposed in response)
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            const line = content.split('\n')[lineNum - 1] || '';

            if (line.includes('console.log') || line.includes('this.log') || line.includes('JSON.stringify')) {
              err(`Sensitive env var ${envName} exposed via logging in ${rel}:${lineNum}`);
              report.stats.envExposure++;
            } else {
              warn(`Sensitive env var ${envName} used in ${rel}:${lineNum} - verify not exposed`);
              report.stats.envExposure++;
            }
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 7. Sensitive File Detection ──────────────────────────────────
function checkSensitiveFiles() {
  log('Phase 7: Scanning for sensitive files...');

  const sensitivePatterns = [
    '.env', '.env.local', '.env.production', '.env.development', '.env.staging',
    'credentials.json', 'token.json', 'oauth2.keys.json',
    'config.json', 'secrets.json', 'homey-auth.json',
    'client_secret.json', '.netrc', '.npmrc',
    '*.p12', '*.pfx', '*.keystore', '*.key', '*.pem',
  ];

  const allFiles = [...collectJsFiles(ROOT)];

  for (const f of allFiles) {
    const basename = path.basename(f);
    const rel = path.relative(ROOT, f);

    for (const pattern of sensitivePatterns) {
      if (basename === pattern || (pattern.startsWith('*') && basename.endsWith(pattern.slice(1)))) {
        err(`Sensitive file found: ${rel} - must not be committed`);
        report.stats.sensitiveFiles++;
      }
    }
  }

  // Also check for .env files specifically
  try {
    const rootFiles = fs.readdirSync(ROOT);
    for (const f of rootFiles) {
      if (f.startsWith('.env') && f !== '.env.example') {
        const fp = path.join(ROOT, f);
        try {
          const stat = fs.statSync(fp);
          if (stat.isFile()) {
            err(`Environment file committed: ${f} - add to .gitignore`);
            report.stats.sensitiveFiles++;
          }
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* skip */ }
}

// ── 8. Git Token Exposure ────────────────────────────────────────
function checkGitTokenExposure() {
  log('Phase 8: Checking for git token exposure...');

  try {
    const gitConfigPath = path.join(ROOT, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const content = fs.readFileSync(gitConfigPath, 'utf8');

      // Check for embedded tokens in URLs
      const urlMatches = content.match(/https:\/\/[^@]*:[^@]*@github\.com/g);
      if (urlMatches) {
        for (const match of urlMatches) {
          err(`GitHub token found in .git/config remote URL: ${match.substring(0, 40)}...`);
          report.stats.gitTokenLeaks++;
        }
      }

      // Check for other token patterns
      const tokenPatterns = content.match(/gh[pousrx]_[A-Za-z0-9_]{36,}/g);
      if (tokenPatterns) {
        for (const match of tokenPatterns) {
          err(`GitHub PAT found in .git/config: ${match.substring(0, 10)}...`);
          report.stats.gitTokenLeaks++;
        }
      }
    }
  } catch (e) { /* skip */ }

  // Check git remote URLs via CLI
  try {
    const remoteUrl = execSync('git remote get-url origin 2>&1', { encoding: 'utf8', cwd: ROOT }).trim();
    if (remoteUrl.includes('@') && remoteUrl.includes(':') && !remoteUrl.startsWith('git@')) {
      // HTTPS URL with embedded credentials
      const match = remoteUrl.match(/https:\/\/[^:]+:([^@]+)@/);
      if (match) {
        err(`Credentials embedded in git remote URL`);
        report.stats.gitTokenLeaks++;
      }
    }
  } catch (e) { /* git not available or no remote */ }
}

// ── 9. Unsafe Regex (ReDoS) ─────────────────────────────────────
function checkUnsafeRegex(files) {
  log('Phase 9: Checking for potentially unsafe regex patterns...');

  // Patterns that can cause ReDoS (catastrophic backtracking)
  const dangerousRegexPatterns = [
    /\/(?:[^\/\\]|\\.)*\([^)]*\*[^)]*\)(?:[^\/\\]|\\.)*\//g,  // Nested quantifiers
    /\/(?:[^\/\\]|\\.)*\+[^\/\\]*\+[^\/\\]*\//g,              // Multiple + without anchors
    /\(\?:\.\*\)\+/g,                                           // (?:.*)+ pattern
    /\(\.\*\)\+/g,                                              // (.*)+ pattern
    /\(\?:[^)]*\)\{[0-9,]+\}/g,                                // Non-capturing group with large quantifier
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      for (const pattern of dangerousRegexPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            warn(`Potentially unsafe regex in ${rel}:${lineNum}: ${match.substring(0, 50)}`);
            report.stats.unsafeRegex++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 10. Email/PII Leak Detection ─────────────────────────────────
function checkEmailLeaks(files) {
  log('Phase 10: Checking for email/PII leaks in source code...');

  const patterns = [
    { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, name: 'Email address' },
    { regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, name: 'Phone number' },
    { regex: /\b\d{3}-\d{2}-\d{4}\b/g, name: 'SSN pattern' },
  ];

  // Allow list: known developer emails, common placeholder emails
  const allowList = [
    'dlnraja@gmail.com',
    'test@example.com',
    'user@example.com',
    'noreply@github.com',
    'no-reply@github.com',
    'support@athom.com',
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      // Skip documentation and markdown
      if (rel.endsWith('.md') || rel.includes('.github')) continue;

      for (const pattern of patterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            // Check allow list
            if (allowList.some(allowed => match.toLowerCase().includes(allowed.toLowerCase()))) continue;

            const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
            warn(`${pattern.name} found in ${rel}:${lineNum}: ${match}`);
            report.stats.emailLeaks++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── Main ─────────────────────────────────────────────────────────
function main() {
  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  Security Check${RESET}`);
  console.log(`${BOLD}============================================${RESET}\n`);

  const startTime = Date.now();

  // Collect files
  const files = [...collectJsFiles(LIB_DIR), ...collectJsFiles(DRIVERS_DIR)];
  const appFile = path.join(ROOT, 'app.js');
  if (fs.existsSync(appFile)) files.push(appFile);

  report.stats.filesScanned = files.length;
  log(`Scanning ${files.length} files for security issues...\n`);

  // Run all checks
  checkHardcodedSecrets(files);
  checkEvalUsage(files);
  checkPrototypePollution(files);
  checkPathTraversal(files);
  checkDangerousFunctions(files);
  checkEnvExposure(files);
  checkSensitiveFiles();
  checkGitTokenExposure();
  checkUnsafeRegex(files);
  checkEmailLeaks(files);

  // ── Summary ──────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  SECURITY REPORT${RESET}`);
  console.log(`${BOLD}============================================${RESET}`);
  console.log(`  Files scanned:            ${report.stats.filesScanned}`);
  console.log(`  -----------------------------------------`);
  console.log(`  Hardcoded secrets:        ${RED}${report.stats.hardcodedSecrets}${RESET}`);
  console.log(`  eval() usage:             ${RED}${report.stats.evalUsage}${RESET}`);
  console.log(`  Prototype pollution:      ${YELLOW}${report.stats.prototypePollution}${RESET}`);
  console.log(`  Path traversal risks:     ${YELLOW}${report.stats.pathTraversal}${RESET}`);
  console.log(`  Dangerous functions:      ${YELLOW}${report.stats.dangerousFunctions}${RESET}`);
  console.log(`  Env var exposure:         ${YELLOW}${report.stats.envExposure}${RESET}`);
  console.log(`  Sensitive files:          ${RED}${report.stats.sensitiveFiles}${RESET}`);
  console.log(`  Git token leaks:          ${RED}${report.stats.gitTokenLeaks}${RESET}`);
  console.log(`  Unsafe regex:             ${YELLOW}${report.stats.unsafeRegex}${RESET}`);
  console.log(`  Email/PII leaks:          ${YELLOW}${report.stats.emailLeaks}${RESET}`);
  console.log(`  -----------------------------------------`);
  console.log(`  ${RED}Critical: ${report.errors.length}${RESET}`);
  console.log(`  ${YELLOW}Warnings: ${report.warnings.length}${RESET}`);
  console.log(`  Completed in ${elapsed}s\n`);

  if (report.errors.length > 0) {
    console.log(`${RED}${BOLD}RESULT: FAIL - ${report.errors.length} critical security issue(s) found${RESET}`);
    process.exit(1);
  } else if (report.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}RESULT: WARN - ${report.warnings.length} security warning(s) found${RESET}`);
    process.exit(2);
  } else {
    console.log(`${GREEN}${BOLD}RESULT: PASS - No security issues detected${RESET}`);
    process.exit(0);
  }
}

main();
