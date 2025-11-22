// tools/auto_fixer.js
// Node 18+ recommended
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_ONLY = process.argv.includes('--drivers-only');
const APPLY = process.argv.includes('--apply');

const patchesDir = path.join(ROOT, 'tools','patches');
if (!fs.existsSync(patchesDir)) fs.mkdirSync(patchesDir, { recursive: true });

// Native recursive file scanner (no glob dependency)
function scanFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, tools, .cache, .git
      if (!['node_modules', 'tools', '.cache', '.git'].includes(entry.name)) {
        scanFiles(fullPath, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.includes('.backup')) {
      files.push(fullPath);
    }
  }
  return files;
}

const scanDir = DRIVERS_ONLY ? path.join(ROOT, 'drivers') : ROOT;
const filePaths = scanFiles(scanDir);

const results = [];

function savePatch(filename, orig, modified) {
  const rel = path.relative(ROOT, filename);
  const patchPath = path.join(patchesDir, rel.replace(/[\/\\]/g,'__') + '.patch');
  const header = `--- ${rel}\n+++ ${rel} (patched)\n\n`;
  fs.writeFileSync(patchPath, header + '--- original ---\n' + orig + '\n--- patched ---\n' + modified, 'utf8');
  return patchPath;
}

function replaceAll(str, regex, replacer) {
  return str.replace(regex, typeof replacer === 'function' ? replacer : () => replacer);
}

function fixGetIeeeAddress(content) {
  // replace this.homey.zigbee.getIeeeAddress(this) -> await this.getIeeeAddress()
  return replaceAll(content,
    /this\.homey\.zigbee\.getIeeeAddress\s*\(\s*this\s*\)/g,
    'await this.getIeeeAddress()');
}

function fixRegisterAttrReportListener(content) {
  // Mark for manual replacement
  return replaceAll(content,
    /registerAttrReportListener\s*\(([\s\S]*?)\)\s*;/g,
    (m, p1) => {
      return `/* TODO: replaced registerAttrReportListener -> configureAttributeReporting
  Original args: ${p1.replace(/\n/g,' ')}
  Please review and map to configureAttributeReporting([{ cluster: CLUSTER.xxx | <id>, attribute: 'xxx', endpoint: <n>, minInterval, maxInterval, minChange }]) */
  // Example placeholder:
  // await this.configureAttributeReporting([{ cluster: 6, attribute: 'onOff', minInterval: 1, maxInterval: 3600, minChange: 1 }]);`;
    });
}

function fixRegisterCapability(content) {
  // Mark deprecated registerCapability - but only if it's the OLD style with cluster spec
  // Don't touch registerCapabilityListener
  return replaceAll(content,
    /(?:this|device)\.registerCapability\s*\(\s*(['"`][^'"]+['"`])\s*,\s*(\d+|CLUSTER\.[A-Za-z]+)\s*,/g,
    (m, cap, cluster) => {
      return `/* REFACTOR: registerCapability deprecated with cluster spec.
   Original: ${m}
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: ${cap}, Cluster: ${cluster}
*/
// this.registerCapability(${cap}, ${cluster},`;
    });
}

function fixSetCapabilityValueAwait(content) {
  // Add await if setCapabilityValue appears without await
  return content.split('\n').map(line => {
    if (line.match(/(^|\s)(?:this|device)\.setCapabilityValue\s*\(/) && 
        !line.includes('await') && 
        !line.trim().startsWith('return') &&
        !line.includes('=>') &&
        !line.includes('//')) {
      return line.replace(/(\b(?:this|device)\.setCapabilityValue\s*\()/, 'await $1');
    }
    return line;
  }).join('\n');
}

function fixCatchOnMaybeNull(content) {
  // Fix patterns like: this.getCapabilityValue(...).catch
  // But NOT Promise chains or await expressions
  return replaceAll(content,
    /this\.getCapabilityValue\(([^)]+)\)\.catch\(/g,
    'Promise.resolve(this.getCapabilityValue($1)).catch(');
}

(async function main(){
  console.log('🔍 Scanning', filePaths.length, 'files...\n');
  
  for (const file of filePaths) {
    const abs = path.resolve(ROOT, file);
    let content = fs.readFileSync(abs, 'utf8');
    let original = content;

    let modified = content;
    modified = fixGetIeeeAddress(modified);
    modified = fixRegisterAttrReportListener(modified);
    modified = fixRegisterCapability(modified);
    modified = fixCatchOnMaybeNull(modified);
    modified = fixSetCapabilityValueAwait(modified);

    if (modified !== original) {
      const patchPath = savePatch(abs, original, modified);
      results.push({ file: file, patch: patchPath });
      if (APPLY) {
        fs.writeFileSync(abs, modified, 'utf8');
        console.log('✅', file);
      } else {
        console.log('📝', file, '-> patch generated');
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Scan complete. Patches generated:', results.length);
  if (results.length) {
    console.log('\nModified files:');
    results.forEach(r => console.log('  -', r.file));
  } else {
    console.log('No automatic patches suggested.');
  }
  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN MODE - No files modified');
    console.log('To apply changes: node tools/auto_fixer.js --apply');
  } else {
    console.log('\n✅ Applied changes to', results.length, 'files');
    console.log('Review patches in tools/patches/ and run tests.');
  }
})();
