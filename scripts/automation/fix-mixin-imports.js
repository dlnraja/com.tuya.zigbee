// scripts/automation/fix-mixin-imports.js
const fs = require('fs');
const path = require('path');
const driversDir = path.resolve(__dirname, '../../drivers');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix PhysicalButtonMixin path
  if (content.includes("require('../../lib/tuya/PhysicalButtonMixin')")) {
    content = content.replace(/require\(['"]\.\.\/\.\.\/lib\/tuya\/PhysicalButtonMixin['"]\)/g, "require('../../lib/mixins/PhysicalButtonMixin')");
    changed = true;
  }

  // Fix VirtualButtonMixin path
  if (content.includes("require('../../lib/tuya/VirtualButtonMixin')")) {
    content = content.replace(/require\(['"]\.\.\/\.\.\/lib\/tuya\/VirtualButtonMixin['"]\)/g, "require('../../lib/mixins/VirtualButtonMixin')");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[MIXIN] Updated imports in: ${path.relative(driversDir, filePath)}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name === 'device.js') {
      processFile(fullPath);
    }
  }
}

console.log('Updating mixin import paths...');
walk(driversDir);
console.log('Update complete.');
