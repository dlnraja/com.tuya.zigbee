const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌿 GIT SIMPLE');

const branches = ['master', 'tuya-light'];
branches.forEach(b => {
  const dir = `./backup/${b}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  console.log(`✅ ${b}`);
});

console.log('✅ Done');
