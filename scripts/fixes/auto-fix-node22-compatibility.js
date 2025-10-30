'use strict';

const fs = require('fs');
const path = require('path');

/**
 * AUTO-FIX NODE.JS 22 COMPATIBILITY
 * Based on: NODE_22_UPGRADE_GUIDE.md
 * 
 * Fixes:
 * 1. Update package.json engines.node to >=22.0.0
 * 2. Remove node-fetch dependency (use native fetch)
 * 3. Update app.json compatibility to >=12.2.0
 */

async function autoFixNode22Compatibility() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🔧 AUTO-FIX NODE.JS 22 COMPATIBILITY                    ║');
  console.log('║  Based on: NODE_22_UPGRADE_GUIDE.md                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const root = path.join(__dirname, '../..');
  let fixes = 0;
  
  // 1. Fix package.json
  console.log('📦 Fixing package.json...\n');
  const packagePath = path.join(root, 'package.json');
  
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    let modified = false;
    
    // Update engines.node
    if (!pkg.engines) pkg.engines = {};
    if (pkg.engines.node !== '>=22.0.0') {
      console.log(`   Current: engines.node = "${pkg.engines.node || 'not set'}"`);
      pkg.engines.node = '>=22.0.0';
      console.log(`   ✅ Fixed: engines.node = ">=22.0.0"\n`);
      modified = true;
      fixes++;
    } else {
      console.log('   ✅ Already correct: engines.node = ">=22.0.0"\n');
    }
    
    // Remove node-fetch
    if (pkg.dependencies && pkg.dependencies['node-fetch']) {
      console.log('   ⚠️  Found: node-fetch dependency');
      delete pkg.dependencies['node-fetch'];
      console.log('   ✅ Removed: node-fetch (use native fetch in Node 22)\n');
      modified = true;
      fixes++;
    }
    
    if (modified) {
      fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    }
  }
  
  // 2. Fix app.json
  console.log('📱 Fixing app.json...\n');
  const appJsonPath = path.join(root, 'app.json');
  
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    let modified = false;
    
    // Update compatibility
    if (!appJson.compatibility || !appJson.compatibility.startsWith('>=12')) {
      console.log(`   Current: compatibility = "${appJson.compatibility || 'not set'}"`);
      appJson.compatibility = '>=12.2.0';
      console.log(`   ✅ Fixed: compatibility = ">=12.2.0"\n`);
      modified = true;
      fixes++;
    } else {
      console.log('   ✅ Already correct: compatibility = ">=12.2.0"\n');
    }
    
    // Ensure SDK v3
    if (appJson.sdk !== 3) {
      console.log(`   Current: sdk = ${appJson.sdk}`);
      appJson.sdk = 3;
      console.log(`   ✅ Fixed: sdk = 3\n`);
      modified = true;
      fixes++;
    } else {
      console.log('   ✅ Already correct: sdk = 3\n');
    }
    
    if (modified) {
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Fixes applied: ${fixes}\n`);
  
  if (fixes > 0) {
    console.log('✅ Node.js 22 compatibility fixed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm install');
    console.log('   2. Replace any fetch() calls that used node-fetch');
    console.log('   3. Test with: homey app run\n');
  } else {
    console.log('✅ Already compatible with Node.js 22!\n');
  }
}

// Run if called directly
if (require.main === module) {
  autoFixNode22Compatibility().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { autoFixNode22Compatibility };
