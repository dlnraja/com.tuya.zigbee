// extract-crash-details.js — extract full stack traces from crashes
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.github/state/gmail-2026-07-13-FRESH/.github/state/diagnostics-report.json', 'utf8'));
const crashes = data.diagnostics.filter(e => e.type === 'crash_report');
console.log('Total crash reports:', crashes.length);

// Group by error pattern + extract first 3 stack traces for each
const byPattern = new Map();
for (const c of crashes) {
  const errs = c.errs || [];
  for (const e of errs) {
    const norm = String(e).replace(/\d+:\d+/g, 'X:X').replace(/0x[0-9a-f]+/gi, '0xX').substring(0, 100);
    if (!byPattern.has(norm)) byPattern.set(norm, { count: 0, traces: [], sample: e });
    byPattern.get(norm).count++;
    if (byPattern.get(norm).traces.length < 2) {
      const stack = c.crashInfo?.stackTraces?.[0];
      if (stack) byPattern.get(norm).traces.push(stack.substring(0, 600));
    }
  }
}

const sorted = [...byPattern.entries()].sort((a,b) => b[1].count - a[1].count);
console.log('\n=== TOP 15 CRASH PATTERNS WITH STACK TRACES ===');
for (let i = 0; i < Math.min(15, sorted.length); i++) {
  const [pattern, info] = sorted[i];
  console.log('\n--- ' + (i+1) + '. ' + info.count + 'x ---');
  console.log('  Pattern: ' + pattern);
  if (info.traces.length) {
    console.log('  Stack trace:');
    console.log('    ' + info.traces[0].split('\n').slice(0, 8).join('\n    '));
  }
}

// Save the analysis
const summary = {
  meta: { generatedAt: new Date().toISOString() },
  totalCrashes: crashes.length,
  topPatterns: sorted.slice(0, 30).map(([p, info]) => ({ pattern: p, count: info.count, sample: info.sample, stack: info.traces[0] }))
};
fs.writeFileSync('.github/state/crash-details.json', JSON.stringify(summary, null, 2));
console.log('\n\nSaved to .github/state/crash-details.json');
