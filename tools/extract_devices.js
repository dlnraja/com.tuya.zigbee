const fs = require('fs');
const path = require('path');

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function main() {
  const researchDir = path.join(process.cwd(), 'research');
  if (!fs.existsSync(researchDir)) fs.mkdirSync(researchDir);
  const forum = readJsonl(path.join(researchDir, 'forum_for_tuya_zigbee.jsonl'));
  const set = new Set();
  for (const post of forum) {
    const arr = post.detected_entities || [];
    arr.forEach((e) => set.add(e));
  }
  const out = Array.from(set).sort();
  fs.writeFileSync(path.join(researchDir, 'device_candidates.json'), JSON.stringify(out, null, 2));
  console.log(`Extracted ${out.length} unique device identifiers.`);
}

main();


