const fs = require('fs');
const path = require('path');

function findChangelogs(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file.startsWith('.git')) continue;
    
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findChangelogs(fullPath);
    } else if (file.toLowerCase().includes('changelog')) {
      console.log(`Found: ${fullPath}`);
    }
  }
}

findChangelogs('.');
