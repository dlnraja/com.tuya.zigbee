'use strict';

const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);
const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const tipRe = /\b((?:9|5|1)\.\d+\.\d+)\b/g;

function extractBodies(raw) {
  try {
    const j = JSON.parse(raw);
    const msgs = j.messages || j.thread?.messages || [];
    return msgs.map((m) => ({
      date: m.date,
      subject: m.subject || '',
      body: m.plaintextBody || m.plaintext_body || m.snippet || '',
    }));
  } catch {
    const bodies = [];
    const re = /"plaintextBody":\s*"((?:\\.|[^"\\])*)"/g;
    let m;
    while ((m = re.exec(raw))) {
      try {
        bodies.push({ date: null, subject: '', body: JSON.parse(`"${m[1]}"`) });
      } catch { /* skip */ }
    }
    return bodies;
  }
}

const rows = [];
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  for (const item of extractBodies(raw)) {
    const b = item.body || '';
    const uuids = [...new Set((b.match(uuidRe) || []).map((u) => u.toLowerCase()))]
      .filter((u) => !u.startsWith('00000000'));
    const tips = [...new Set([...b.matchAll(tipRe)].map((x) => x[1]))];
    const app = /bastien/i.test(item.subject + b)
      ? 'bastien'
      : /stable/i.test(item.subject + b)
        ? 'stable'
        : 'universal';
    const commentMatch = b.match(/Comment from the user[:\s]*([\s\S]{0,500})/i)
      || b.match(/User comment[:\s]*([\s\S]{0,500})/i)
      || b.match(/Message[:\s]*([\s\S]{0,500})/i);
    const comment = (commentMatch ? commentMatch[1] : '').replace(/\s+/g, ' ').trim().slice(0, 280);
    const link = (b.match(/tools\.developer\.homey\.app[^\s)]+/i) || [''])[0];
    rows.push({
      file: path.basename(f),
      date: item.date,
      app,
      uuids,
      tips,
      comment,
      link,
    });
  }
}

const out = path.join(__dirname, 'HARVEST.json');
fs.writeFileSync(out, JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows, null, 2));
console.log('wrote', out, 'rows', rows.length);
