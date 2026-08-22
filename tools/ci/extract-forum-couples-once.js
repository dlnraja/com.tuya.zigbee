'use strict';
/** Extract actionable mfr+pid couples from forum silent digest + new-fps */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const digest = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/state/forum/multi-silent-digest.json'), 'utf8'));
const newFps = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/state/forum/multi-silent-new-fps.json'), 'utf8'));

const couples = new Map();
function add(mfr, pid, meta) {
  if (!mfr || !pid) return;
  const m = String(mfr).trim();
  const p = String(pid).trim();
  if (!/^_T[ZYC]/i.test(m) && !/^HOBEIAN/i.test(m) && !/^TZ\d/i.test(m)) return;
  if (!/^(TS\d|ZB\d|ERS|SWS)/i.test(p) && p.length < 4) return;
  if (/ABC123|XXXX|example|needs_device/i.test(m + p)) return;
  const k = `${m}|${p}`;
  if (!couples.has(k)) couples.set(k, { mfr: m, pid: p, sources: [], issues: new Set() });
  const e = couples.get(k);
  e.sources.push(meta);
  (meta.issues || []).forEach((i) => e.issues.add(i));
}

for (const t of digest.topics || []) {
  for (const a of t.actionable || []) {
    const mfrs = a.mfrs || [];
    const pids = a.pids || [];
    if (mfrs.length && pids.length) {
      for (const m of mfrs) for (const p of pids) {
        add(m, p, { topic: t.id, post: a.post_number, user: a.username, issues: a.issues });
      }
    } else if (mfrs.length) {
      for (const m of mfrs) {
        add(m, '(pid-missing)', { topic: t.id, post: a.post_number, user: a.username, issues: a.issues, warn: 'pid-missing' });
      }
    }
  }
}

const fpsList = Array.isArray(newFps) ? newFps : (newFps.items || newFps.candidates || []);
for (const f of fpsList) {
  const pids = f.pids || [f.productId || f.modelId || f.pid].filter(Boolean);
  for (const p of pids) add(f.manufacturerName || f.mfr, p, { source: 'new-fps', by: f.by });
}

const out = [...couples.values()].map((e) => ({
  mfr: e.mfr,
  pid: e.pid,
  issues: [...e.issues],
  sourceCount: e.sources.length,
  sources: e.sources.slice(0, 5),
})).sort((a, b) => b.sourceCount - a.sourceCount);

const dir = path.join(ROOT, 'reports/forum-verify-2026-08-22');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'couples-extracted.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  coupleCount: out.length,
  withPid: out.filter((c) => c.pid !== '(pid-missing)').length,
  top: out.filter((c) => c.pid !== '(pid-missing)').slice(0, 25),
}, null, 2));
