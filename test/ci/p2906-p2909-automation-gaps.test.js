'use strict';
// P2906–P2909 (2026-10-20): shared rules-gates in the publish paths + unified-ci, own-repo history
// sweep, ledger intake for diagnostics and forum posts, forum catch-up past lastSeen.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const wf = (f) => fs.readFileSync(path.join(ROOT, '.github/workflows', f), 'utf8');
const G = require('../../tools/ci/discovery-lineage-enrich-gate.js');
const RG = require('../../scripts/ci/rules-gates.js');

describe('P2906 publish paths + unified-ci use the shared rules-gates action', () => {
  const expect = {
    'auto-fix-and-publish.yml': ['anti-bot', 'p2138', 'native-matrix', 'regression-lessons'],
    'auto-publish-on-push.yml': ['anti-bot', 'p2138', 'flow-title', 'regression-lessons'],
    'unified-ci.yml': ['regression-lessons', 'anti-bot', 'p2138', 'p214'],
    'publish-stable.yml': ['regression-lessons', 'anti-bot', 'p2138'],
  };
  for (const [f, ids] of Object.entries(expect)) {
    it(`${f} selects ${ids.join(',')} in hard steps`, () => {
      const y = wf(f);
      for (const id of ids) {assert.ok(G.hardRulesGatesSelects(y, id), `${f} must hard-run ${id}`);}
    });
  }
  it('no direct copy of a rules gate is left in master-only publish paths and unified-ci', () => {
    for (const f of ['auto-fix-and-publish.yml', 'auto-publish-on-push.yml', 'unified-ci.yml']) {
      const y = wf(f);
      for (const g of RG.RULES_GATES.filter((x) => x.id !== 'flow-title')) {
        const direct = new RegExp(`run:\\s*node ${g.file.replace(/[.]/g, '\\.')}`);
        assert.ok(!direct.test(y), `${f} still runs ${g.file} directly`);
      }
    }
  });
  it('auto-fix keeps --strip on the post-enrich anti-bot gate', () => {
    const y = wf('auto-fix-and-publish.yml');
    assert.match(y, /only: anti-bot\n\s+strip: 'true'/);
  });
  it('publish-stable keeps a direct fallback for branches without the shared runner', () => {
    const y = wf('publish-stable.yml');
    assert.match(y, /hashFiles\('scripts\/ci\/rules-gates\.js'\) == ''/);
    assert.match(y, /run: node tools\/ci\/regression-lessons-gate\.js/);
    assert.match(y, /node tools\/ci\/anti-bot-regression-gate\.js\n\s+node tools\/ci\/p2138-sacred-couple-matrix-gate\.js/);
  });
  it('runner keeps a bounded full log of a failing gate', () => {
    assert.ok(RG.LOG_LINES >= 100 && RG.LOG_LINES <= 1000);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rg-'));
    fs.mkdirSync(path.join(tmp, 'g'));
    fs.writeFileSync(path.join(tmp, 'g/x.js'), 'for (let i=0;i<300;i++) console.log("line"+i); process.exitCode = 3;');
    // WHY(P2924): process.exit() could cut a piped stdout under CPU load (flake seen at line85); exitCode lets it flush.
    const r = RG.runGate({ id: 'x', file: 'g/x.js' }, { cwd: tmp });
    assert.strictEqual(r.status, 'fail');
    assert.strictEqual(r.log.split('\n').length, RG.LOG_LINES);
    assert.match(r.log, /line299$/);
  });
});

describe('P2907 history sweep advances our own repo', () => {
  const S = require('../../scripts/progress/advance-sweep.js');
  const ledger = { record(L, k, v) { L.items[k] = { ...L.items[k] || {}, ...v }; return L.items[k]; } };
  const mkGet = (issues, tip) => async (url) => {
    if (/issues\?state=all/.test(url)) {return tip ? [{ number: tip }] : [];}
    const m = /issues\/(\d+)(\/comments)?/.exec(url);
    const n = Number(m[1]);
    if (m[2]) {return [{ user: { login: 'github-actions[bot]', type: 'Bot' }, body: '_TZ3000_zzzzzzzz TS0001' }, { user: { login: 'someone' }, body: 'hi' }];}
    return issues[n] || { error: true, status: 404 };
  };
  const base = () => ({ cp: { items: [], github: { johan: { next: 1 }, dlnraja: { next: 1 } } }, deep: { next: {}, done: {} }, L: { items: {} } });
  const opts = (get) => ({ get, pause: async () => {}, offline: false, dry: false });

  it('moves github.dlnraja.next and records dlnraja-issue keys', async () => {
    const { cp, deep, L } = base();
    const issues = {
      1: { number: 1, state: 'closed', title: 'x', body: 'nothing', comments: 0 },
      2: { number: 2, state: 'open', title: 'y', body: 'nothing', comments: 2 },
    };
    const r = await S.sweepOwnRepo(cp, deep, L, ledger, 2, opts(mkGet(issues, 2)));
    assert.strictEqual(r.advanced.length, 2);
    assert.strictEqual(cp.github.dlnraja.next, 3);
    assert.strictEqual(deep.next.dlnraja, 3);
    assert.ok(cp.items.some((it) => it.id === 'dlnraja-issue:1'));
    assert.ok(/github\.com\/dlnraja\/com\.tuya\.zigbee\/issues\/2/.test(cp.items.find((it) => it.id === 'dlnraja-issue:2').sources[0]));
  });
  it('stops at the newest number without skipping future issues', async () => {
    const { cp, deep, L } = base();
    cp.github.dlnraja.next = 5;
    const r = await S.sweepOwnRepo(cp, deep, L, ledger, 10, opts(mkGet({}, 4)));
    assert.strictEqual(r.atTip, true);
    assert.strictEqual(cp.github.dlnraja.next, 5);
  });
  it('a deleted number below the tip is passed as no-action', async () => {
    const { cp, deep, L } = base();
    const r = await S.sweepOwnRepo(cp, deep, L, ledger, 1, opts(mkGet({}, 9)));
    assert.strictEqual(r.advanced[0].status, 'no-action');
    assert.strictEqual(cp.github.dlnraja.next, 2);
  });
  it('rate limit keeps the cursor', async () => {
    const { cp, deep, L } = base();
    await S.sweepOwnRepo(cp, deep, L, ledger, 3, opts(async () => ({ rateLimited: true })));
    assert.strictEqual(cp.github.dlnraja.next, 1);
  });
  it('open threads keep their ledger status, done is never downgraded', async () => {
    const { cp, deep, L } = base();
    L.items['dlnraja-issue:1'] = { status: 'pending' };
    L.items['dlnraja-issue:2'] = { status: 'done', commit: 'abc1234' };
    const issues = {
      1: { number: 1, state: 'open', title: 'a', body: '', comments: 0 },
      2: { number: 2, state: 'closed', title: 'b', body: 'please add _TZE200_abcdefgh TS0601', comments: 0 },
    };
    await S.sweepOwnRepo(cp, deep, L, ledger, 2, opts(mkGet(issues, 2)));
    assert.strictEqual(L.items['dlnraja-issue:1'].status, 'pending');
    assert.strictEqual(L.items['dlnraja-issue:2'].status, 'done');
    assert.strictEqual(L.items['dlnraja-issue:2'].commit, 'abc1234');
  });
  it('bot comments are left out of identity extraction', () => {
    assert.strictEqual(S.isBotLogin({ login: 'github-actions[bot]' }), true);
    assert.strictEqual(S.isBotLogin({ login: 'x', type: 'Bot' }), true);
    assert.strictEqual(S.isBotLogin({ login: 'dlnraja' }), false);
  });
  it('johan-thread-intel passes the own-repo chunk and the larger forum chunk', () => {
    const y = wf('johan-thread-intel.yml');
    assert.match(y, /--dl-chunk=/);
    assert.match(y, /SWEEP_FORUM_CHUNK \|\| '180'/);
  });
});

describe('P2908 ledger intake (diagnostics + forum posts)', () => {
  const I = require('../../scripts/progress/ledger-intake.js');
  const lib = require('../../scripts/lib/ledger.js');
  const entry = {
    id: 'msg-1', type: 'crash_report', date: 'Mon, 19 Oct 2026', appVersion: '9.0.1567', from: 'someone@example.com',
    subj: 'private subject', couples: [{ mfr: '_TZE200_abcdefgh', pid: 'TS0601' }],
    xref: [{ fingerprint: '_TZE200_abcdefgh', supported: false }], errs: ['TypeError x'],
  };
  it('records a diag:<hash> finding without mail text or sender', () => {
    const L = { items: {} };
    const r = I.recordDiagnostics({ diagnostics: [entry] }, L, {});
    assert.strictEqual(r.stats.new, 1);
    const key = `diag:${lib.hash('msg-1')}`;
    const e = L.items[key];
    assert.strictEqual(e.status, 'pending');
    assert.deepStrictEqual(e.couples, ['_TZE200_abcdefgh|TS0601']);
    assert.deepStrictEqual(e.unsupported, ['_TZE200_abcdefgh']);
    const s = JSON.stringify(e);
    assert.ok(!/@|private subject/.test(s));
  });
  it('is idempotent and re-applies the queue without churn', () => {
    const L = { items: {} };
    const r1 = I.recordDiagnostics({ diagnostics: [entry] }, L, {});
    const before = JSON.stringify(L);
    const r2 = I.recordDiagnostics({ diagnostics: [] }, L, { queue: r1.queue });
    assert.strictEqual(r2.stats.same, 1);
    assert.strictEqual(JSON.stringify(L), before);
  });
  it('never touches an entry closed by someone else and caps writes per run', () => {
    const L = { items: { [`diag:${lib.hash('msg-1')}`]: { status: 'done', by: 'human' } } };
    const r = I.recordDiagnostics({ diagnostics: [entry, { ...entry, id: 'msg-2' }, { ...entry, id: 'msg-3' }] }, L, { max: 1 });
    assert.strictEqual(r.stats.protected, 1);
    assert.strictEqual(r.stats.new, 1);
    assert.strictEqual(r.stats.capped, 1);
    assert.strictEqual(r.queue.length, 3);
  });
  it('forum posts: forum-post:<t>/<n>, skips posts the history sweep already holds', () => {
    const L = { items: { 'forum:140352#10': { status: 'done' }, 'forum-post:140352/12': { status: 'blocked', source: 'pc' } } };
    const items = [
      { topic: 140352, post: 10, status: 'pending', author: 'a' },
      { topic: 140352, post: 11, status: 'pending', author: 'b', link: 'https://community.homey.app/t/140352/11', mfrs: ['_TZ3000_abcdefgh'], missing: [{ mfr: '_TZ3000_abcdefgh', pid: 'TS0001' }] },
      { topic: 140352, post: 12, status: 'already-fixed' },
    ];
    const st = I.recordForumPosts(items, L, {});
    assert.deepStrictEqual([st.sweep, st.new, st.protected], [1, 1, 1]);
    const e = L.items['forum-post:140352/11'];
    assert.strictEqual(e.status, 'pending');
    assert.strictEqual(e.author, 'b');
    assert.deepStrictEqual(e.missing, ['_TZ3000_abcdefgh|TS0001']);
    assert.strictEqual(L.items['forum-post:140352/12'].source, 'pc');
    const again = I.recordForumPosts(items, L, {});
    assert.strictEqual(again.same, 1);
  });
  it('gmail-diagnostics wires the intake, a gated commit and the queue cache', () => {
    const y = wf('gmail-diagnostics.yml');
    assert.match(y, /ledger-intake\.js diag/);
    assert.match(y, /safe-auto-commit\.js --id=gmail-diag-ledger/);
    assert.match(y, /diag-ledger-queue-\$\{\{ github\.run_id \}\}/);
  });
});

describe('P2909 forum catch-up past lastSeen', () => {
  const C = require('../../scripts/scanners/forum-catch-up.js');
  const identity = require('../../scripts/progress/lib/sweep-identity.js');
  // Fake topic: post ids 1001..1050 = post numbers 1..50.
  const mkGet = (count, { limitAfter = Infinity } = {}) => {
    let calls = 0;
    return async (p) => {
      calls++;
      if (calls > limitAfter) {return { rateLimited: true, status: 429 };}
      if (/\/t\/\d+\.json$/.test(p)) {return { highest_post_number: count, post_stream: { stream: Array.from({ length: count }, (_, i) => 1001 + i) } };}
      const ids = [...p.matchAll(/post_ids\[\]=(\d+)/g)].map((m) => Number(m[1]));
      return { post_stream: { posts: ids.map((id) => ({ id, post_number: id - 1000, username: 'u', cooked: id === 1045 ? '<p>please add _TZE200_qqqqqqqq TS0601</p>' : '<p>hello</p>' })) } };
    };
  };
  const deps = (get) => ({ getJson: get, sleep: async () => {}, delayMs: 0, seed: 10, identity });

  it('first sight seeds before the tip, then reads every post past the cursor in pages', async () => {
    const cur = {};
    const r = await C.catchUpTopic(1, cur, 100, deps(mkGet(50)));
    assert.strictEqual(r.read, 10);
    assert.strictEqual(cur.lastSeenPost, 50);
    assert.strictEqual(cur.lastSeenId, 1050);
    assert.ok(r.items.some((it) => it.post === 45 && it.status === 'pending'));
  });
  it('a bounded chunk leaves the rest for the next run (no gap)', async () => {
    const cur = { lastSeenId: 1000 };
    const r1 = await C.catchUpTopic(1, cur, 25, deps(mkGet(50)));
    assert.strictEqual(r1.read, 25);
    assert.strictEqual(r1.left, 25);
    assert.strictEqual(cur.lastSeenId, 1025);
    const r2 = await C.catchUpTopic(1, cur, 100, deps(mkGet(50)));
    assert.strictEqual(r2.read, 25);
    assert.strictEqual(cur.lastSeenId, 1050);
  });
  it('a 429 keeps the cursor at the last fully read page', async () => {
    const cur = { lastSeenId: 1000 };
    const r = await C.catchUpTopic(1, cur, 50, deps(mkGet(50, { limitAfter: 2 })));
    assert.strictEqual(r.rateLimited, true);
    assert.strictEqual(cur.lastSeenId, 1020);
  });
  it('run() writes cursor + ledger, rotates satellites, dry writes nothing', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fcu-'));
    const statePath = path.join(tmp, 'lastseen.json');
    let L = { items: {} };
    let saved = 0;
    const ledger = { load: () => L, save: () => { saved++; } };
    const dry = await C.run({ dry: true, satellites: 1, seed: 10, delayMs: 0, getJson: mkGet(50), sleep: async () => {}, ledger, statePath });
    assert.ok(!fs.existsSync(statePath));
    assert.strictEqual(saved, 0);
    assert.ok(dry.topics.length >= 2);
    L = { items: {} };
    const r = await C.run({ satellites: 1, seed: 10, delayMs: 0, getJson: mkGet(50), sleep: async () => {}, ledger, statePath });
    const st = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.ok(Object.keys(st.topics).length >= 2);
    assert.strictEqual(st.rotate, 1);
    assert.ok(r.ledger.new >= 1);
    assert.ok(Object.keys(L.items).some((k) => /^forum-post:\d+\/45$/.test(k)));
  });
  it('forum-poll runs the catch-up and commits only the cursor + ledger', () => {
    const y = wf('forum-poll.yml');
    assert.match(y, /scripts\/scanners\/forum-catch-up\.js/);
    assert.match(y, /--id=forum-ledger[\s\S]*--paths="data\/leads\/forum-lastseen\.json data\/progress\/ledger\.json"/);
  });
});
