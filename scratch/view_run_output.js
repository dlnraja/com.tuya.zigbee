const { execSync } = require('child_process');

try {
  const output = execSync('node .github/scripts/validate-drivers.js', { encoding: 'utf8' });
  const lines = output.split('\n');
  let print = false;
  for (const line of lines) {
    if (line.includes('Check 4')) print = true;
    if (line.includes('Check 5')) print = false;
    if (print) console.log(line);
  }
} catch (err) {
  const stdout = err.stdout || '';
  const lines = stdout.split('\n');
  let print = false;
  for (const line of lines) {
    if (line.includes('Check 4')) print = true;
    if (line.includes('Check 5')) print = false;
    if (print) console.log(line);
  }
}
