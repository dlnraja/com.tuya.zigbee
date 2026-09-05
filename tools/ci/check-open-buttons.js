const fs = require('fs');

const STATE_FILE = '.github/state/temporal-cross-reference.json';

// Garde défensive : l'état CI est gitignored et peuplé par les crawlers GHA.
// En local il est généralement absent → SKIP explicite au lieu de crasher (ENOENT).
if (!fs.existsSync(STATE_FILE)) {
  console.log('[check-open-buttons] SKIP: artefact CI absent en local (' + STATE_FILE + ') — rien à analyser.');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

// Find OPEN button issues
const openButton = data.issues.filter(i => i.state === 'OPEN');
console.log('=== OPEN button issues ===');
for (const i of openButton) {
  console.log('#' + i.number + ' (' + (i.age_days || '?') + 'd old) ' + i.title);
}
