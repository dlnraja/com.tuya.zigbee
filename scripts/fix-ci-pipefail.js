const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('| wc -l)') && !lines[i].includes('|| true') && !lines[i].includes('|| echo 0')) {
      lines[i] = lines[i].replace('| wc -l)', '| wc -l || true)');
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Fixed ${filePath}`);
  }
}

fixFile('.github/workflows/syntax-check.yml');
fixFile('.github/workflows/code-quality.yml');
