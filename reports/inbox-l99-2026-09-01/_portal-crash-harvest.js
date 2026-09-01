'use strict';
/**
 * Safe Athom portal crash harvest (local only, privacy-redacted).
 * Usage: node reports/inbox-l99-2026-09-01/_portal-crash-harvest.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
process.chdir(ROOT);

async function main() {
  const client = require(path.join(ROOT, '.github', 'scripts', 'homey-apps-api-client'));
  const privacy = require(path.join(ROOT, '.github', 'scripts', 'privacy-redactor'));
  const api = await client.createClient({ log: (m) => console.log('[auth]', m) });
  const APP_ID = 'com.dlnraja.tuya.zigbee';
  const builds = await client.getBuilds(api, APP_ID, { limit: 80 });
  const sorted = [...builds].filter((b) => b && b.id).sort((a, b) => Number(b.id) - Number(a.id));
  const tip = sorted.slice(0, 30);
  console.log('tip builds:');
  for (const b of tip) {
    console.log(`#${b.id} ${b.version} ${b.state} crashes=${b.crashes || 0}`);
  }

  const withCrashes = tip.filter((b) => (b.crashes || 0) > 0);
  const recentTest = tip.filter((b) => ['test', 'live'].includes(b.state)).slice(0, 12);
  const targets = [...new Map([...withCrashes, ...recentTest, ...tip.slice(0, 15)].map((b) => [b.id, b])).values()].slice(0, 20);

  const out = [];
  for (const b of targets) {
    try {
      const crashes = await api.api.getCrashes({
        $token: api.token,
        appId: APP_ID,
        buildId: String(b.id),
        query: { limit: 30 },
      });
      const list = Array.isArray(crashes) ? crashes : (crashes?.data || crashes?.crashes || []);
      console.log(`build ${b.id} v${b.version}: fetched ${list.length}`);
      for (const c of list) {
        const stack = String(c.stack || c.message || '');
        const logIdMatch =
          stack.match(/Log ID:\s*([0-9a-f-]{36})/i) ||
          String(c.message || '').match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        out.push({
          buildId: b.id,
          version: b.version,
          state: b.state,
          crashId: c.id || c.crashId || null,
          createdAt: c.createdAt || c.created || null,
          homeyVersion: c.homeyVersion || null,
          userMessage: String(c.comments || c.userMessage || c.message || '')
            .replace(/\s+/g, ' ')
            .slice(0, 240),
          logId: logIdMatch ? logIdMatch[1] : null,
          stackHead: stack.replace(/\s+/g, ' ').slice(0, 280),
        });
      }
    } catch (e) {
      console.log(`getCrashes fail ${b.id}:`, String(e.message || e).slice(0, 140));
    }
  }

  out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const dest = path.join(ROOT, '.github', 'state', 'portal-crash-harvest.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const safe = privacy.redactObject({
    generatedAt: new Date().toISOString(),
    appId: APP_ID,
    tipLatest: tip.slice(0, 8).map((b) => ({ id: b.id, version: b.version, state: b.state, crashes: b.crashes || 0 })),
    count: out.length,
    crashes: out,
  });
  privacy.assertNoLeaks(safe, dest);
  fs.writeFileSync(dest, `${JSON.stringify(safe, null, 2)}\n`);
  console.log('wrote', dest, 'n=', out.length);
  for (const r of out.slice(0, 40)) {
    console.log(JSON.stringify({
      v: r.version,
      at: r.createdAt,
      log: r.logId,
      msg: r.userMessage.slice(0, 100),
      head: r.stackHead.slice(0, 120),
    }));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
