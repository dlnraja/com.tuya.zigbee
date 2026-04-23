const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walk(filePath, callback);
      }
    } else if (file.endsWith('.js')) {
      callback(filePath);
    }
  });
}

const pattern1 = /trigger\(this\s+\{/g; // trigger(this, {
const pattern2 = /trigger\(this\s+\}/g; // trigger(this, } - used in ButtonDevice? const pattern3 = /trigger\(this\.catch/g ; // trigger(this.catch

let fixedCount = 0;

walk(ROOT, (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (pattern1.test(content)) {
    content = content.replace(/trigger\(this\s+\{/g, 'trigger(this, {');
    changed = true;
  }
  
  if (pattern2.test(content)) {
    content = content.replace(/trigger\(this\s+\}/g, 'trigger(this, }');
    changed = true;
  }

  // Specifically fix the presence_sensor_radar mess
  if (content.includes('trigger(this, {}).catch(() => { });')) {
    content = content.replace('trigger(this, {}).catch(() => { });', 'trigger(this, {}).catch(() => { });');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Fixed syntax in ${file}`);
    fixedCount++;
  }
});

console.log(`Total files fixed: ${fixedCount}`);
