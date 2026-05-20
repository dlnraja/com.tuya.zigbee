const { execSync } = require('child_process');

try {
  const output = execSync('node .github/scripts/validate-drivers.js', { encoding: 'utf8' });
  console.log("Success:\n", output);
} catch (err) {
  const stdout = err.stdout || '';
  const stderr = err.stderr || '';
  console.log("=== STDOUT ===");
  console.log(stdout);
  console.log("=== STDERR ===");
  console.log(stderr);
}
