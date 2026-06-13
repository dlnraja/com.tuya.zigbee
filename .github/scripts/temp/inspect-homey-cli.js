@Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');
const path = require('path');

const globalHomey = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey');
console.log('Global homey path:', globalHomey);
console.log('Exists:', fs.existsSync(globalHomey));

if (fs.existsSync(globalHomey)) {
  const searchInDir = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules') {
          searchInDir(fullPath);
        }
      } else if (file.endsWith('.js') || file.endsWith('.json')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('delegation') || content.includes('Delegation')) {
          console.log(`Found in: ${fullPath}`);
          // Print lines containing delegation
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('delegation') || line.includes('Delegation')) {
              console.log(`  Line ${idx+1}: ${line.trim().slice(0, 120)}`);
            }
          });
        }
      }
    }
  };
  searchInDir(globalHomey);
}
