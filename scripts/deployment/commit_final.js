#!/usr/bin/env node
'use strict';

/**
 * COMMIT FINAL
 * Git add + commit + push automatique
 * Auto-converted from .bat
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

async function run() {
  try {
    console.log('🚀 Commit Final...\n');

    // Git add
    console.log('📝 Git add...');
    execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });

    // Git commit
    console.log('💾 Git commit...');
    try {
      execSync('git commit -m "feat: Ultimate organization - 71 scripts organized + Complete validation SDK/Guidelines/Forum"', { 
        cwd: ROOT, 
        stdio: 'inherit' 
      });
    } catch (err) {
      console.log('Nothing to commit or already committed');
    }

    // Git push
    console.log('📤 Git push...');
    execSync('git push origin master', { cwd: ROOT, stdio: 'inherit' });

    console.log('\n✅ Commit Final completed!');

    // Auto-delete .bat if exists
    const batPath = path.join(ROOT, 'commit_final.bat');
    if (fs.existsSync(batPath)) {
      fs.unlinkSync(batPath);
      console.log('🗑️  Deleted commit_final.bat');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
