const fs = require('fs');
const path = require('path');

function search(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'tmp') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath, query);
    } else if (stat.isFile()) {
      if (file.endsWith('.js') || file.endsWith('.json')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(query)) {
          console.log(`Found "${query}" in ${fullPath}`);
        }
      }
    }
  }
}

const query = process.argv[2] || 'remote_button_wireless_hybrid';
console.log(`Searching for "${query}"...`);
search(path.join(__dirname, '..'), query);
