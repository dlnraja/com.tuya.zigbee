const fs = require('fs');

console.log('🧠 REORGANIZE SHORT');

// Create organized dirs
['git', 'backup', 'enrich', 'validate'].forEach(d => {
  const dir = `./organized/${d}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
});

// Move scripts by category
const scripts = fs.readdirSync('.').filter(f => f.endsWith('.js'));
let moved = 0;

scripts.forEach(s => {
  let targetDir = './organized/backup';
  if (s.includes('GIT')) targetDir = './organized/git';
  else if (s.includes('ENRICH')) targetDir = './organized/enrich';
  else if (s.includes('VALID')) targetDir = './organized/validate';
  
  try {
    fs.renameSync(s, `${targetDir}/${s}`);
    moved++;
  } catch(e) {}
});

console.log(`✅ ${moved} scripts organized`);
