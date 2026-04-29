const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (['node_modules', '.git'].includes(path.basename(file))) return;
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const allFiles = getFiles(process.cwd());
const errors = [];

allFiles.forEach(file => {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
  } catch (e) {
    errors.push({
      file: path.relative(process.cwd(), file),
      error: e.stderr.toString().trim()
    });
  }
});

fs.writeFileSync('scratch/syntax_scan_results.json', JSON.stringify(errors, null, 2));
console.log(`Found ${errors.length} syntax errors.`);
