const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node clean_json_comments.js <file1> [file2 ...]');
  process.exit(1);
}

args.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cleanedContent = content.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
    fs.writeFileSync(filePath, cleanedContent);
    console.log(`Cleaned ${filePath}`);
  } catch (error) {
    console.error(`Error cleaning ${filePath}: ${error.message}`);
  }
});
