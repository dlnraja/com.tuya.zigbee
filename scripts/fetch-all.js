const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'fetch-z2m.js',
  'fetch-blakadder.js',
  'fetch-homey-forum.js'
];

scripts.forEach(script => {
  try {
    console.log(`Running ${script}...`);
    execSync(`node ${path.join(__dirname, script)}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error running ${script}:`, error.message);
  }
});
