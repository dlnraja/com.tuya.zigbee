'use strict';
// P3255e (t834u chunk 4): scraping workflows keep output in artifacts/job summary; repo commits only with vars.SCRAPE_COMMIT == '1'.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const WF = path.join(__dirname, '..', '..', '.github', 'workflows');
const SCRAPERS = ['blakadder-fetch', 'forum-poll', 'upstream-thread-miner', 'homey-store-peer-probe', 'monthly-tuya-intelligence',
  'oss-lan-source-enrich', 'johan-thread-intel', 'l99-inbox-intelligence', 'peer-complementary-enrich', 'market-couples-intake'];
const COMMIT = /git (push|commit)|git-push-retry|safe-auto-commit\.js/;

describe('P3255e scrape output to artifacts only', () => {
  for (const w of SCRAPERS) {
    const f = path.join(WF, `${w}.yml`);
    (fs.existsSync(f) ? it : it.skip)(`${w}: commit steps gated, artifact upload present`, () => {
      const doc = yaml.load(fs.readFileSync(f, 'utf8'));
      let art = 0;
      for (const job of Object.values(doc.jobs || {})) for (const st of job.steps || []) {
        if (String(st.uses || '').startsWith('actions/upload-artifact@')) art++;
        const run = String(st.run || '').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
        if (COMMIT.test(run) && !/^Apply \+ commit/.test(st.name || '')) assert.ok(String(st.if || '').includes("vars.SCRAPE_COMMIT == '1'"), `${w}: ${st.name}`);
      }
      assert.ok(art > 0, `${w}: no artifact upload`);
    });
  }
});
