// Debug: print event types distribution
const fs = require('fs');
const path = require('path');
const file = 'C:/Users/Dell/.codex/sessions/2026/07/10/rollout-2026-07-10T16-50-12-019f4c81-f46a-7763-a44d-a6ddb8d56a0e.jsonl';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n').filter((l) => l.trim());

const types = {};
const sampleByType = {};
for (const line of lines) {
  let event;
  try { event = JSON.parse(line); } catch { continue; }
  const t1 = event.type;
  const t2 = event.payload?.type;
  const key = `${t1 || '?'}/${t2 || '?'}`;
  types[key] = (types[key] || 0) + 1;
  if (!sampleByType[key]) {
    sampleByType[key] = JSON.stringify(event).substring(0, 300);
  }
}

console.log('Event type distribution:');
const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]);
for (const [t, c] of sorted) {
  console.log(' ', t.padEnd(50), c);
}

console.log('\nSample for top types:');
for (const [t] of sorted.slice(0, 5)) {
  console.log('\n', t, ':');
  console.log('  ', sampleByType[t].substring(0, 200));
}
