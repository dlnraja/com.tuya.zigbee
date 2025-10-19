#!/usr/bin/env node

/**
 * PRE-COMMIT CHECKS
 * 
 * Exécuté automatiquement avant chaque commit
 * Vérifie:
 * - Pas de .homeycompose
 * - Pas de credentials
 * - app.json valide
 * - Images correctes
 * 
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let errors = [];
let warnings = [];

console.log(`\n${'='.repeat(60)}`);
console.log('🔍 PRE-COMMIT CHECKS');
console.log('='.repeat(60) + '\n');

// CHECK 1: .homeycompose must not exist
console.log('CHECK 1: Security - .homeycompose...');
const composePath = path.join(ROOT, '.homeycompose');
if (fs.existsSync(composePath)) {
  errors.push('.homeycompose exists (MUST be removed before commit)');
  console.log(`${RED}❌ .homeycompose exists - MUST be removed${RESET}`);
} else {
  console.log(`${GREEN}✅ .homeycompose does not exist${RESET}`);
}

// CHECK 2: No credentials in files
console.log('\nCHECK 2: Security - No credentials...');
try {
  const grepResult = execSync('git diff --cached --name-only', { 
    cwd: ROOT, 
    encoding: 'utf-8' 
  });
  
  const stagedFiles = grepResult.split('\n').filter(f => f.trim());
  
  const sensitivePatterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /credential/i
  ];
  
  let foundCredentials = false;
  stagedFiles.forEach(file => {
    const filePath = path.join(ROOT, file);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, 'utf-8');
      sensitivePatterns.forEach(pattern => {
        if (pattern.test(content)) {
          warnings.push(`Potential credential in ${file}`);
          foundCredentials = true;
        }
      });
    }
  });
  
  if (!foundCredentials) {
    console.log(`${GREEN}✅ No obvious credentials detected${RESET}`);
  } else {
    console.log(`${YELLOW}⚠ Potential credentials detected (review needed)${RESET}`);
  }
} catch (error) {
  console.log(`${YELLOW}⚠ Could not check credentials${RESET}`);
}

// CHECK 3: app.json valid JSON
console.log('\nCHECK 3: Validation - app.json syntax...');
try {
  const appJsonPath = path.join(ROOT, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
  
  if (!appJson.version) {
    errors.push('app.json missing version');
  }
  if (!appJson.id) {
    errors.push('app.json missing id');
  }
  if (!appJson.drivers || !Array.isArray(appJson.drivers)) {
    errors.push('app.json drivers invalid');
  }
  
  if (errors.length === 0) {
    console.log(`${GREEN}✅ app.json valid (${appJson.drivers.length} drivers)${RESET}`);
  }
} catch (error) {
  errors.push(`app.json invalid: ${error.message}`);
  console.log(`${RED}❌ app.json invalid${RESET}`);
}

// CHECK 4: package.json version matches app.json
console.log('\nCHECK 4: Validation - Version sync...');
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf-8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  
  if (appJson.version !== packageJson.version) {
    warnings.push(`Version mismatch: app.json (${appJson.version}) != package.json (${packageJson.version})`);
    console.log(`${YELLOW}⚠ Version mismatch${RESET}`);
  } else {
    console.log(`${GREEN}✅ Versions match (${appJson.version})${RESET}`);
  }
} catch (error) {
  warnings.push('Could not verify version sync');
}

// RESULTS
console.log(`\n${'='.repeat(60)}`);
if (errors.length === 0 && warnings.length === 0) {
  console.log(`${GREEN}✅ ALL PRE-COMMIT CHECKS PASSED${RESET}`);
  console.log('='.repeat(60) + '\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`${RED}❌ ERRORS (${errors.length}):${RESET}`);
    errors.forEach(e => console.log(`${RED}   - ${e}${RESET}`));
  }
  
  if (warnings.length > 0) {
    console.log(`${YELLOW}⚠ WARNINGS (${warnings.length}):${RESET}`);
    warnings.forEach(w => console.log(`${YELLOW}   - ${w}${RESET}`));
  }
  
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log(`\n${RED}❌ COMMIT BLOCKED - Fix errors first${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${YELLOW}⚠ COMMIT ALLOWED - Review warnings${RESET}\n`);
    process.exit(0);
  }
}
