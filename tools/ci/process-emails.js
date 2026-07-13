// process-emails.js — aggregate + analyze ALL email data from GHA gmail-diagnostics runs
const fs = require('fs');
const path = require('path');
const dir = '.github/state';

const sources = [
  { name: '2026-06-29 18:32 (1.5MB)', dir: 'diagnostics-jun-29-big' },
  { name: '2026-06-29 17:33 (135KB)', dir: 'diagnostics-jun-29-medium' },
  { name: '2026-06-28 22:26 (5KB)',  dir: 'diagnostics-jun-28' }
];

const allEmails = [];
const allErrors = [];
const stats = {
  byType: {},
  byDate: {},
  uniqueSenders: new Set(),
  uniqueFps: new Set(),
  uniquePids: new Set(),
  uniqueIssues: new Set(),
  uniqueDevices: new Set()
};

for (const src of sources) {
  const base = path.join(dir, src.dir);
  if (!fs.existsSync(base)) continue;
  function walk(d) {
    const out = [];
    if (!fs.existsSync(d)) return out;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) out.push(...walk(p));
      else if (e.name.endsWith('.json') && (e.name === 'diagnostics-report.json' || e.name === 'summary.json')) out.push(p);
    }
    return out;
  }
  for (const f of walk(base)) {
    console.log('Reading', f);
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (data.diagnostics) {
      for (const e of data.diagnostics) {
        e._source = src.name;
        allEmails.push(e);
        stats.byType[e.type] = (stats.byType[e.type] || 0) + 1;
        if (e.date) {
          const d = e.date.substring(0, 10);
          stats.byDate[d] = (stats.byDate[d] || 0) + 1;
        }
        if (e.from) stats.uniqueSenders.add(e.from);
        if (e.fps) {
          for (const m of e.fps.mfr || []) stats.uniqueFps.add(m);
          for (const p of e.fps.pid || []) stats.uniquePids.add(p);
        }
        if (e.ghInfo?.issueNum) stats.uniqueIssues.add(e.repo + '#' + e.ghInfo.issueNum);
        if (e.devices) for (const d of e.devices) stats.uniqueDevices.add(d);
      }
    }
    if (data.errors) for (const e of data.errors) allErrors.push(e);
  }
}

// Dedupe by id (some runs re-process)
const seen = new Set();
const dedup = allEmails.filter(e => {
  if (seen.has(e.id)) return false;
  seen.add(e.id);
  return true;
});

// Save aggregate
const out = {
  meta: { totalEmails: allEmails.length, uniqueEmails: dedup.length, sources: sources.length, generatedAt: new Date().toISOString() },
  stats: {
    byType: stats.byType,
    byDate: stats.byDate,
    uniqueSenders: [...stats.uniqueSenders].length,
    uniqueFps: [...stats.uniqueFps].length,
    uniquePids: [...stats.uniquePids].length,
    uniqueIssues: [...stats.uniqueIssues],
    uniqueDevices: [...stats.uniqueDevices].length
  },
  emails: dedup,
  errors: allErrors
};
fs.writeFileSync(path.join(dir, 'emails-aggregate.json'), JSON.stringify(out, null, 2));
console.log('\n=== AGGREGATE STATS ===');
console.log('Total emails processed:', allEmails.length);
console.log('Unique (by id):', dedup.length);
console.log('By type:', stats.byType);
console.log('Unique senders:', stats.uniqueSenders.size);
console.log('Unique FPs:', stats.uniqueFps.size);
console.log('Unique PIDs:', stats.uniquePids.size);
console.log('Unique issues:', stats.uniqueIssues.size);
console.log('Unique devices:', stats.uniqueDevices.size);
console.log('Date range:', Object.keys(stats.byDate).sort()[0], '→', Object.keys(stats.byDate).sort().pop());
console.log('\nSaved to .github/state/emails-aggregate.json');
