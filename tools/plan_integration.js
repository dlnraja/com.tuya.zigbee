const fs = require('fs');
const path = require('path');

function main() {
  const researchDir = path.join(process.cwd(), 'research');
  const candidatesPath = path.join(researchDir, 'device_candidates.json');
  const candidates = fs.existsSync(candidatesPath)
    ? JSON.parse(fs.readFileSync(candidatesPath, 'utf8'))
    : [];
  const actions = candidates.map((id) => ({ type: 'ensure_fingerprint_guarded', identifier: id }));
  fs.writeFileSync(path.join(researchDir, 'integration_actions.json'), JSON.stringify(actions, null, 2));
  console.log(`Planned ${actions.length} integration actions.`);
}

main();


