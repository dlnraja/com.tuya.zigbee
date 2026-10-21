#!/usr/bin/env node
'use strict';
/**
 * P2936 — one reusable cross-research pass for every incoming request (needs-info items, issues,
 * forum reports, Homey Gmail diags, crash logs, CI reports). AI-free by default, bounded, cached,
 * incremental. Spirit of the homey-deep-cross-research skill: cross every source before deciding.
 *
 * Evidence per item (each source is optional; missing ones are recorded as "skipped"):
 *   forum post + replies + the author's other posts (Discourse public JSON, cached), GitHub issue +
 *   comments (gh / GITHUB_TOKEN), screenshot OCR (cache + tesseract when present), Homey Gmail diag
 *   cache (.github/state/diagnostics-report.json, data/diag-ids.json), git history (log -S),
 *   reference index (Z2M, ZHA, deCONZ DDF, Blakadder, tuya-local, Johan app), optional web search
 *   (XR_WEB=google-cse with GOOGLE_CSE_KEY/GOOGLE_CSE_CX, daily cap XR_WEB_CAP, default 0 = off),
 *   optional AI (XR_AI=1 + key, cap XR_AI_CAP; off by default, never paid overage).
 *
 * Verdicts: place (exact couple confirmed by >=1 reliable reference, single target driver) |
 *           covered (couple already matched by one driver) | provisional (ids come from evidence but
 *           no reference confirms them; host = universal_zigbee, flagged) | lead (ranked candidates,
 *           links) | no-action.
 * Never invents ids: every id must appear verbatim in evidence text or OCR.
 *
 *   node scripts/research/cross-research.js --items=needs-info|issues|forum|diags|all
 *        [--apply] [--max=N] [--ref=<dir>] [--offline] [--json=out.json]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const ref = require('./lib/ref-index');
const prov = require('./lib/provisional');

const ROOT = path.join(__dirname, '../..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FLAG = (k) => process.argv.includes(`--${k}`);
const CACHE = path.join(ROOT, '.cache/xr');
const REF = arg('ref', process.env.XR_REF || path.join(ROOT, '.cache/xr-ref'));
const OFFLINE = FLAG('offline');
const lc = (s) => String(s || '').toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// ---------- bounded cached fetch ----------
let netCalls = 0; const NET_CAP = Number(process.env.XR_NET_CAP || 600);
function cached(key, ttlDays, fn) {
  const f = path.join(CACHE, key.replace(/[^a-z0-9._-]/gi, '_').slice(0, 180));
  if (fs.existsSync(f) && (Date.now() - fs.statSync(f).mtimeMs) < ttlDays * 864e5) return Promise.resolve(readJson(f, null));
  if (OFFLINE || netCalls >= NET_CAP) return Promise.resolve(null);
  netCalls++;
  return fn().then((v) => { if (v != null) { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(f, JSON.stringify(v)); } return v; }).catch(() => null);
}
function getJson(url, headers = {}) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'user-agent': 'tuya-zigbee-cross-research', accept: 'application/json', ...headers }, timeout: 20000 }, (r) => {
      if (r.statusCode === 429) { r.resume(); return rej(new Error('429')); }
      if (r.statusCode !== 200) { r.resume(); return res(null); }
      let b = ''; r.on('data', (c) => { b += c; }); r.on('end', () => { try { res(JSON.parse(b)); } catch { res(null); } });
    }).on('error', rej).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
function getBin(url, file) {
  return new Promise((res) => {
    https.get(url, { headers: { 'user-agent': 'tuya-zigbee-cross-research' }, timeout: 20000 }, (r) => {
      if (r.statusCode >= 300 && r.headers.location) { r.resume(); return getBin(new URL(r.headers.location, url).href, file).then(res); }
      if (r.statusCode !== 200) { r.resume(); return res(false); }
      const w = fs.createWriteStream(file); r.pipe(w); w.on('finish', () => res(true));
    }).on('error', () => res(false));
  });
}
const strip = (h) => String(h || '').replace(/<aside class="quote[\s\S]*?<\/aside>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
const imgs = (h) => [...String(h || '').matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/emoji|avatar|user_avatar/.test(u)).slice(0, 4)
  .map((u) => (u.startsWith('//') ? `https:${u}` : u.startsWith('/') ? `https://community.homey.app${u}` : u));

// ---------- evidence collectors ----------
const FORUM = 'https://community.homey.app';
async function forumUnits(topic, num, author) {
  const units = [];
  const p = await cached(`forum-${topic}-${num}.json`, 30, () => getJson(`${FORUM}/posts/by_number/${topic}/${num}.json`));
  if (!p) return { units, skipped: 'forum' };
  units.push({ via: 'forum-post', url: `${FORUM}/t/${topic}/${num}`, text: strip(p.cooked), images: imgs(p.cooked) });
  if (p.reply_count) {
    const rs = await cached(`forum-replies-${p.id}.json`, 30, () => getJson(`${FORUM}/posts/${p.id}/replies.json`));
    for (const r of rs || []) units.push({ via: 'forum-reply', url: `${FORUM}/t/${topic}/${r.post_number}`, text: strip(r.cooked), images: imgs(r.cooked) });
  }
  const u = author || p.username;
  if (u) { // same user's other posts (bounded 30): ids are often given later or in another thread
    const ua = await cached(`forum-user-${u}.json`, 14, () => getJson(`${FORUM}/user_actions.json?username=${encodeURIComponent(u)}&filter=5&limit=30`));
    for (const a of ((ua && ua.user_actions) || []).slice(0, 30)) units.push({ via: 'forum-same-user', url: `${FORUM}/t/${a.topic_id}/${a.post_number}`, text: strip(a.excerpt) });
  }
  return { units };
}
function gh(args) { try { return JSON.parse(execFileSync('gh', args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 }).toString()); } catch { return null; } }
async function issueUnits(repo, n) {
  const j = await cached(`gh-${repo}-${n}.json`, 7, async () => gh(['issue', 'view', String(n), '-R', repo, '--json', 'title,body,comments,author']));
  if (!j) return { units: [], skipped: 'github' };
  const url = `https://github.com/${repo}/issues/${n}`;
  const units = [{ via: 'github-issue', url, text: `${j.title}\n${j.body || ''}`, images: [...String(j.body || '').matchAll(/https:\/\/[^\s)"]+\.(?:png|jpe?g)|https:\/\/github\.com\/user-attachments\/assets\/[\w-]+/g)].map((m) => m[0]).slice(0, 4) }];
  for (const c of j.comments || []) units.push({ via: 'github-comment', url, text: c.body || '' });
  return { units, author: j.author && j.author.login };
}
let ocrBudget = Number(process.env.XR_OCR_CAP || 120);
const OCR_CACHE = readJson(path.join(ROOT, 'data/leads/forum-image-ocr.json'), { entries: [] }).entries || [];
const OCR_GH = readJson(path.join(ROOT, 'data/leads/image-ocr.json'), { entries: [] }).entries || [];
let hasTess = null;
async function ocr(url) {
  const key = `ocr-${Buffer.from(url).toString('base64url').slice(-120)}.json`;
  return cached(key, 365, async () => {
    if (hasTess === null) { try { execFileSync('tesseract', ['--version'], { stdio: 'ignore' }); hasTess = true; } catch { hasTess = false; } }
    if (!hasTess || ocrBudget-- <= 0) return null;
    const tmp = path.join(require('os').tmpdir(), `xr-${process.pid}-${Date.now()}`);
    if (!(await getBin(url, tmp))) return null;
    try { return { text: execFileSync('tesseract', [tmp, '-', '--psm', '6'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 }).toString() }; } catch { return null; } finally { try { fs.unlinkSync(tmp); } catch { /* */ } }
  });
}
function diagUnits(author, terms) {
  // Homey Gmail diag reports (only Homey-generated mails are ingested by gmail-diagnostics.yml).
  const out = [];
  const d1 = readJson(path.join(ROOT, '.github/state/diagnostics-report.json'), null);
  const d2 = readJson(path.join(ROOT, 'data/diag-ids.json'), { reports: [] });
  const recs = [].concat((d1 && (d1.diagnostics || d1.reports || d1.items)) || [], d2.reports || []);
  for (const r of recs) {
    const blob = JSON.stringify(r);
    if ((author && lc(blob).includes(lc(author))) || terms.some((t) => t.length > 6 && blob.includes(t))) out.push({ via: 'gmail-diag', url: r.url || r.logId || 'gmail', text: blob.slice(0, 20000) });
  }
  return out.slice(0, 10);
}
function gitUnits(terms) {
  const out = [];
  for (const t of terms.slice(0, 4)) {
    try {
      const s = execFileSync('git', ['log', '--all', '-i', '--format=%h %s', '-n', '5', `--grep=${t}`], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 }).toString();
      if (s.trim()) out.push({ via: 'git-history', url: `git:${t}`, text: s });
    } catch { /* */ }
  }
  return out;
}
let webBudget = Number(process.env.XR_WEB_CAP || 0);
async function webUnits(q) {
  if (process.env.XR_WEB !== 'google-cse' || !process.env.GOOGLE_CSE_KEY || webBudget <= 0) return [];
  webBudget--;
  const j = await cached(`web-${q}.json`, 30, () => getJson(`https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CSE_KEY}&cx=${process.env.GOOGLE_CSE_CX}&q=${encodeURIComponent(q + ' zigbee _TZ')}`));
  return ((j && j.items) || []).slice(0, 5).map((i) => ({ via: 'web', url: i.link, text: `${i.title} ${i.snippet}` }));
}

// ---------- deduction ----------
const STOP = new Set('the and for with this that have from zigbee tuya device devices sensor switch homey smart when what does not work working unknown please help thanks hello app version add support will can there they just like with also been into only some more other than then your about after would could should which while have them using used'.split(' '));
function keywords(text) {
  const t = String(text || '');
  const models = [...t.matchAll(/\b([A-Z][A-Z0-9]{1,8}[-_ ]?[A-Z0-9]{2,10}(?:-[A-Z0-9]{1,6})?)\b/g)].map((m) => m[1]).filter((m) => /\d/.test(m) && !/^TS\d/.test(m) && !/^(?:V\d|\d|IMG|DSC|PXL|TZ\d|TZE|SDK|BCM|HTTP|USB|ESP|UTF|ISO|RFC|AES|MAC|IP\d)/i.test(m));
  const brands = [...t.matchAll(/\b(moes|aubess|lonsonho|girier|zemismart|bseed|avatto|nous|lidl|silvercrest|blitzwolf|loratap|tuya|immax|neo|benexmart|haozee|tze200|lsc|sonoff|aqara|xiaomi|ikea|heiman|owon|frient|nedis|woox|tenky|evvr|ewelink|zigfred|hobeian|siterwell|saswell|beca|avatar|mhcozy|ihseno|zbeacon|smartwings|giex|ultralink|elivco|ledron|gledopto|miboxer|milight|wenzhi|meian|ajax|nexxt|zooz)\b/gi)].map((m) => lc(m[1]));
  const kinds = [...lc(t).matchAll(/\b(thermostat|trv|radiator|valve|curtain|blind|shutter|roller|dimmer|plug|socket|button|remote|knob|scene|siren|smoke|leak|water|soil|presence|radar|mmwave|motion|pir|door|window|contact|vibration|temperature|humidity|lcd|co2|air quality|pm2\.?5|energy|meter|breaker|relay|fan|heater|light|bulb|strip|garage|lock|irrigation|gas|illuminance|lux)\b/g)].map((m) => m[1]);
  return { models: [...new Set(models)].slice(0, 6), brands: [...new Set(brands)].slice(0, 4), kinds: [...new Set(kinds)].slice(0, 4) };
}
function rankCandidates(index, kw, wifi) {
  if (!kw.models.length && !kw.brands.length) return [];
  const scored = [];
  for (const r of index.records) {
    if (!!r.wifi !== !!wifi && r.src === 'tuya-local' && !wifi) continue;
    let s = 0;
    for (const m of kw.models) if (r.text.includes(lc(m))) s += 5;
    for (const b of kw.brands) if (r.text.includes(b)) s += 1;
    for (const k of kw.kinds) if (r.text.includes(k)) s += 1;
    if (s >= 6) scored.push({ s, r });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, 5).map(({ s, r }) => ({ score: s, src: r.src, url: r.url, mfrs: r.mfrs.slice(0, 6), pids: r.pids.slice(0, 3), text: r.text.slice(0, 120) }));
}

// ---------- decision ----------
function driverIndex() {
  const drivers = new Map();
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const z = (readJson(path.join(ROOT, 'drivers', d, 'driver.compose.json'), {}) || {}).zigbee;
    if (z) drivers.set(d, { mfrs: new Set((z.manufacturerName || []).map(lc)), pids: new Set((z.productId || []).map((p) => String(p).toUpperCase())) });
  }
  return drivers;
}
function coveredBy(drv, mfr, pid) { const o = []; for (const [d, z] of drv) if (z.mfrs.has(lc(mfr)) && z.pids.has(String(pid).toUpperCase())) o.push(d); return o; }
const GENERIC = new Set(prov.HOSTS);
/** Pure: choose ONE target driver for an exact couple using sibling manufacturerNames of the confirming references. */
function chooseDriver(drv, look, mfr, pid) {
  const P = String(pid).toUpperCase(); const votes = new Map();
  for (const r of look.byCouple.get(`${mfr}|${pid}`.toLowerCase()) || []) {
    if (r.src === 'johan' && r.driver) { /* Johan's driver ids differ; use siblings only */ }
    for (const sib of r.mfrs) {
      if (lc(sib) === lc(mfr)) continue;
      for (const d of coveredBy(drv, sib, P)) if (!GENERIC.has(d)) votes.set(d, (votes.get(d) || 0) + 1);
    }
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { why: 'no sibling manufacturerName of the reference is on a specific driver with this productId' };
  if (ranked.length > 1 && ranked[1][1] * 2 > ranked[0][1]) return { why: `siblings split between ${ranked.slice(0, 3).map((x) => x.join(':')).join(', ')}` };
  return { driver: ranked[0][0], votes: ranked[0][1] };
}
function decideItem(drv, look, ev) {
  const res = { couples: [], candidates: ev.candidates || [] };
  for (const [mfr, pid, unit] of ev.couples) {
    const cov = coveredBy(drv, mfr, pid).filter((d) => !GENERIC.has(d));
    const refs = (look.byCouple.get(`${mfr}|${pid}`.toLowerCase()) || []).slice(0, 4).map((r) => r.url);
    if (cov.length) { res.couples.push({ mfr, pid, verdict: 'covered', driver: cov[0], conf: 1, refs, evidence: unit }); continue; }
    if (refs.length) {
      const c = chooseDriver(drv, look, mfr, pid);
      const mfrElsewhere = [...drv.entries()].filter(([d, z]) => z.mfrs.has(lc(mfr)) && !GENERIC.has(d)).map(([d]) => d);
      if (c.driver && !mfrElsewhere.some((d) => d !== c.driver && [...drv.get(d).pids].some((p) => drv.get(c.driver).pids.has(p)))) {
        res.couples.push({ mfr, pid, verdict: 'place', driver: c.driver, conf: Math.min(0.95, 0.7 + 0.05 * c.votes), refs, evidence: unit }); continue;
      }
      res.couples.push({ mfr, pid, verdict: 'provisional', conf: 0.6, refs, why: c.why || 'would create a dual couple', evidence: unit }); continue;
    }
    res.couples.push({ mfr, pid, verdict: 'provisional', conf: 0.4, refs: [], why: 'ids from evidence, no reference confirms the pairing yet', evidence: unit });
  }
  const order = ['place', 'provisional', 'covered'];
  const top = order.find((v) => res.couples.some((c) => c.verdict === v));
  res.hints = ev.hints || [];
  res.verdict = top || (res.candidates.length || ev.mfrsOnly.length || (ev.hints || []).length ? 'lead' : 'no-action');
  res.confidence = res.couples.length ? Math.max(...res.couples.map((c) => c.conf)) : res.candidates.length ? 0.2 : 0;
  return res;
}

// ---------- pipeline ----------
let DRV = new Map();
async function gather(item, index, look) {
  const units = []; const skipped = [];
  let m;
  if ((m = /^forum:(\d+)#(\d+)$/.exec(item.id))) { const r = await forumUnits(m[1], m[2], item.author); units.push(...r.units); if (r.skipped) skipped.push(r.skipped); await sleep(250); }
  if ((m = /^(johan|dlnraja)-issue:(\d+)$/.exec(item.id))) { const r = await issueUnits(m[1] === 'johan' ? 'JohanBendz/com.tuya.zigbee' : 'dlnraja/com.tuya.zigbee', m[2]); units.push(...r.units); if (r.skipped) skipped.push(r.skipped); }
  if (item.text) units.push({ via: item.via || 'item', url: item.link || item.id, text: item.text });
  for (const e of OCR_CACHE.concat(OCR_GH)) if (e.id === item.id || (item.id.startsWith('johan-issue:') && String(e.issue) === item.id.split(':')[1])) units.push({ via: 'ocr-cache', url: e.link || item.id, text: `${(e.mfrs || []).join(' ')} ${(e.pids || []).join(' ')}`, pairOnly: (e.mfrs || []).length === 1 });
  for (const u of units.slice(0, 6)) for (const im of u.images || []) { const o = await ocr(im); if (o && o.text) units.push({ via: 'ocr', url: im, text: o.text }); }
  const allText = units.map((u) => u.text).join('\n');
  const kw = keywords(allText);
  const terms = [...kw.models, ...ref.all(ref.MFR_RE, allText)];
  units.push(...diagUnits(item.author, terms), ...gitUnits(terms));
  if (!ref.all(ref.MFR_RE, allText).length && (kw.models.length || kw.brands.length)) units.push(...await webUnits([...kw.brands, ...kw.models].join(' ')));
  // exact couples = mfr + pid in the SAME unit (never cross-joined between unrelated texts)
  const couples = []; const mfrsOnly = new Set(); const pidsOnly = new Set(); const hints = new Set();
  for (const u of units) {
    // git history and the author's OTHER posts are hints only (may be about another device): never a couple source
    if (u.via === 'git-history' || u.via === 'forum-same-user' || u.via === 'web' || (u.via === 'gmail-diag' && !item.id.startsWith('diag:'))) { ref.all(ref.MFR_RE, u.text).forEach((x) => hints.add(x)); continue; }
    const ms = ref.all(ref.MFR_RE, u.text); const ps = ref.all(ref.PID_RE, u.text).map((p) => p.toUpperCase());
    for (const mf of ms) {
      const pp = ps.length ? ps : [];
      const confirmed = (p) => look.byCouple.has(lc(`${mf}|${p}`)) || coveredBy(DRV, mf, p).length;
      // one mfr + one pid in the unit = the user's pairing; several mfrs listed with one pid = confirmed pairings only
      if (pp.length === 1 && (ms.length === 1 || confirmed(pp[0]))) couples.push([mf, pp[0], `${u.via} ${u.url}`]);
      // several productIds in one text: keep only pairings a reference or our drivers already confirm (no cross-join guess)
      else if (pp.length > 1) for (const p of pp) { if (look.byCouple.has(lc(`${mf}|${p}`)) || coveredBy(DRV, mf, p).length) couples.push([mf, p, `${u.via} ${u.url} (multi-pid, confirmed pairing)`]); }
      else if (!pp.length) mfrsOnly.add(mf);
    }
    if (!ms.length) ps.forEach((p) => pidsOnly.add(p));
  }
  // mfr without pid: the pid is taken from a reference ONLY when every reference agrees on one pid
  for (const mf of mfrsOnly) {
    const pids = new Set((look.byMfr.get(lc(mf)) || []).flatMap((r) => r.pids));
    if (pids.size === 1) couples.push([mf, [...pids][0], 'mfr in evidence + unique productId in references']);
  }
  const seen = new Set(); const uniq = couples.filter(([a, b]) => { const k = lc(`${a}|${b}`); if (seen.has(k)) return false; seen.add(k); return true; });
  const wifi = /wifi|wi-fi|tuya local|cloud/i.test(allText) && !uniq.length;
  return { units: units.map((u) => ({ via: u.via, url: u.url })).slice(0, 40), skipped, couples: uniq.slice(0, 8), mfrsOnly: [...mfrsOnly], pidsOnly: [...pidsOnly],
    hints: [...hints].slice(0, 10), kw, candidates: uniq.length ? [] : rankCandidates(index, kw, wifi), wifi };
}

function loadItems(kind) {
  const cp = readJson(path.join(ROOT, 'data/leads/sweep-checkpoint.json'), { items: [] });
  const out = [];
  if (kind === 'needs-info' || kind === 'all') out.push(...cp.items.filter((i) => ['needs-info', 'pending'].includes(i.status)));
  if (kind === 'issues' || kind === 'all') {
    const l = gh(['issue', 'list', '-R', process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee', '--state', 'open', '--limit', '100', '--json', 'number,title,body,author']) || [];
    for (const i of l) out.push({ id: `dlnraja-issue:${i.number}`, author: i.author && i.author.login, status: 'open' });
  }
  if (kind === 'forum' || kind === 'all') {
    const ocrL = readJson(path.join(ROOT, 'data/leads/forum-image-ocr.json'), {});
    for (const e of (ocrL.entries || []).slice(-60)) if (!out.some((o) => o.id === e.id)) out.push({ id: e.id, author: e.author, status: 'forum' });
  }
  if (kind === 'diags' || kind === 'all') {
    for (const r of readJson(path.join(ROOT, 'data/diag-ids.json'), { reports: [] }).reports || []) out.push({ id: `diag:${r.id}`, text: JSON.stringify(r), via: r.kind || 'gmail-diag', link: r.url, status: 'diag' });
  }
  return out;
}

async function main() {
  const kind = arg('items', 'needs-info'); const max = Number(arg('max', 1000));
  const index = ref.build(REF, path.join(ROOT, '.cache/xr-ref-index.json'));
  if (!index.records.length) console.warn(`[xr] reference index empty (XR_REF=${REF}); run scripts/research/fetch-refs.sh`);
  const look = ref.lookup(index); const drv = driverIndex(); DRV = drv;
  const items = loadItems(kind).slice(0, max);
  const results = [];
  for (const it of items) {
    const ev = await gather(it, index, look);
    const d = decideItem(drv, look, ev);
    results.push({ id: it.id, prev: it.status, ...d, sources: ev.units, skipped: ev.skipped, keywords: ev.kw });
    if (results.length % 25 === 0) console.log(`[xr] ${results.length}/${items.length} (net ${netCalls})`);
  }
  const sum = {}; for (const r of results) sum[r.verdict] = (sum[r.verdict] || 0) + 1;
  if ((index.delta || []).length) { // upstream delta: new references may confirm provisional couples / old leads
    const df = path.join(ROOT, 'data/leads/upstream-delta.json');
    const prevD = readJson(df, { runs: [] });
    prevD.runs = [{ at: new Date().toISOString(), newMfrs: index.delta.length, sample: index.delta.slice(0, 50) }, ...prevD.runs].slice(0, 20);
    fs.writeFileSync(df, `${JSON.stringify(prevD, null, 1)}\n`);
  }
  const slim = results.map((r) => ({ id: r.id, verdict: r.verdict, confidence: r.confidence,
    couples: (r.couples || []).map((c) => ({ mfr: c.mfr, pid: c.pid, verdict: c.verdict, driver: c.driver, conf: c.conf, refs: c.refs.slice(0, 3), evidence: c.evidence, why: c.why })),
    candidates: (r.candidates || []).slice(0, 3).map((c) => ({ score: c.score, src: c.src, url: c.url, mfrs: c.mfrs.slice(0, 3), pids: c.pids })),
    hints: (r.hints || []).slice(0, 5), sources: [...new Set((r.sources || []).map((u) => u.via))], skipped: r.skipped }));
  const report = { generated: new Date().toISOString(), kind, refsPresent: index.present, netCalls, summary: sum, results: slim };
  const out = arg('json', path.join(ROOT, 'data/leads/cross-research-report.json'));
  fs.writeFileSync(out, `${JSON.stringify(report)}\n`);
  console.log('[xr] summary', sum);
  if (FLAG('apply')) {
    const a = prov.applyResults(ROOT, results, { maxPlace: Number(arg('max-place', 50)), maxProv: Number(arg('max-prov', 50)) });
    console.log('[xr] applied', a);
    prov.updateCheckpoint(ROOT, results);
  }
  const pr = prov.promoteDemote(ROOT, look, FLAG('apply'));
  console.log('[xr] provisional promote/demote', pr);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { decideItem, chooseDriver, coveredBy, keywords, rankCandidates, driverIndex };
