'use strict';
const fs = require('fs');
const path = require('path');

const src = 'C:/Users/Dell/AppData/Roaming/Grok Bot/sand-client-persistence';
const outDir = path.join(__dirname, '..', '..', 'reports', 'grok-bot-import');
fs.mkdirSync(outDir, { recursive: true });

function decode(buf) {
  let text = buf.toString('utf8');
  const nulls = buf.filter((b) => b === 0).length;
  if (nulls > buf.length / 5) {
    text = buf.toString('utf16le');
    if (!/homey|tuya|\{/.test(text)) {
      text = Buffer.from(buf.filter((b) => b !== 0)).toString('utf8');
    }
  }
  return text.replace(/\u0000/g, '');
}

function extractQuoted(text, keyRole) {
  const out = [];
  const re = /"role"\s*:\s*"user"[\s\S]{0,80}?"content"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(text))) {
    out.push(m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t'));
  }
  if (!out.length) {
    const re2 = /"content"\s*:\s*"((?:\\.|[^"\\]){60,}?)"/g;
    while ((m = re2.exec(text))) {
      const s = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      if (/homey|tuya|forum|diag|publish|IAS|TS00|140352|stable/i.test(s)) out.push(s);
    }
  }
  return out;
}

const files = fs.readdirSync(src)
  .map((n) => path.join(src, n))
  .filter((f) => fs.statSync(f).isFile() && fs.statSync(f).size > 200);

const prompts = [];
for (const f of files) {
  const buf = fs.readFileSync(f);
  let text = decode(buf);
  if (!/homey|tuya|zigbee|140352|dlnraja|TS0044|stable-v5/i.test(text)) continue;
  text = text.replace(/[A-Za-z0-9+/=]{150,}/g, '[REDACTED_BLOB]');
  const msgs = extractQuoted(text);
  const out = `extract-${buf.length}.md`;
  let md = `# Grok Bot extract\n\nSize: ${buf.length}\n\n`;
  msgs.slice(0, 20).forEach((u, i) => {
    md += `### Prompt ${i + 1}\n\n${u.slice(0, 4000)}\n\n`;
  });
  if (!msgs.length) {
    md += '### Raw preview\n\n```\n' + text.slice(0, 3000) + '\n```\n';
  }
  fs.writeFileSync(path.join(outDir, out), md);
  prompts.push({ out, msgs: msgs.length });
}

const parent = 'C:/Users/Dell/Documents/homey';
for (const name of [
  'FROM_THE_BEGINNING.md',
  'NEXT_PATCHES.md',
  'FORUM_LATEST_2190.md',
  'FULL_SOURCE_SWEEP.md',
  'ZIGBEE_PARALLEL_CROSS.md',
  'DUAL_APP_AND_BRANCHES.md',
  'cursor-todos-import.md',
]) {
  const p = path.join(parent, name);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(outDir, name));
}

fs.writeFileSync(
  path.join(outDir, 'README.md'),
  `# Grok Bot + session import\n\nImported ${new Date().toISOString()}\n\n- Source: Grok Bot AppData persistence (sanitized, no secrets)\n- Plus Documents/homey handoffs from tonight\n- Continue work in Cursor master/stable clones — no forum posts\n\nExtracts: ${JSON.stringify(prompts, null, 2)}\n`
);

console.log(JSON.stringify({ prompts, files: fs.readdirSync(outDir) }, null, 2));
