const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Step 1: Generate list of all files
const allFiles = walkSync('.');
fs.writeFileSync('analysis/all-files.txt', allFiles.join('\n'));

// Step 2: List all drivers
const drivers = fs.readdirSync('src/drivers');
fs.writeFileSync('analysis/drivers-list.txt', drivers.join('\n'));

// Step 3: Check for tests
const testFiles = [];
allFiles.forEach(file => {
  if (file.includes('test') && file.endsWith('.js')) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('describe(')) {
      testFiles.push(file);
    }
  }
});
fs.writeFileSync('analysis/tests-list.txt', testFiles.join('\n'));

// Step 4: Find TODOs and FIXMEs
const todos = [];
allFiles.forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('TODO') || line.includes('FIXME')) {
        todos.push(`${file}:${index+1} ${line.trim()}`);
      }
    });
  }
});
fs.writeFileSync('analysis/todos.txt', todos.join('\n'));

// Step 5: Check outdated dependencies
execSync('npm outdated > analysis/npm-outdated.txt', { stdio: 'inherit' });

// Step 6: Run ESLint
execSync('npx eslint . > analysis/eslint-report.txt', { stdio: 'inherit' });

// Step 7: Validate Homey app
try {
  execSync('homey app validate > analysis/homey_validate.log', { stdio: 'inherit' });
} catch (error) {
  console.error('Homey validation failed');
}

// Utility function to list files
function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  });
  return filelist;
}
