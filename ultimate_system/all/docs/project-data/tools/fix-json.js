const jsonlint = require('jsonlint');
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, callback);
    } else if (stat.isFile() && path.extname(file) === '.json') {
      callback(filePath);
    }
  });
}

walk(projectRoot, (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = jsonlint.parse(content);
    const formatted = JSON.stringify(parsed, null, 2);
    fs.writeFileSync(filePath, formatted);
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error in ${filePath}: ${error.message}`);
  }
});
