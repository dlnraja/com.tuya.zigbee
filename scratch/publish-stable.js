// scratch/publish-stable.js - Automated publish for stable-v5
const { spawn } = require('child_process');

const child = spawn('npx', ['homey', 'app', 'publish'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

// Answer prompts sequentially
const answers = ['y', 'n']; // Yes to guidelines, No to version update
let answerIndex = 0;

child.stdout?.on('data', (data) => {
  const text = data.toString();
  if (text.includes('guidelines') && text.includes('(y/N)')) {
    child.stdin.write('y\n');
  } else if (text.includes('version number') && text.includes('(Y/n)')) {
    child.stdin.write('n\n');
  }
});

child.on('close', (code) => {
  console.log(`Publish exited with code ${code}`);
  process.exit(code || 0);
});

// Timeout after 5 minutes
setTimeout(() => {
  console.log('Publish timed out after 5 minutes');
  child.kill();
  process.exit(1);
}, 300000);