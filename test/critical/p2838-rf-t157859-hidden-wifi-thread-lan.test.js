'use strict';

/**
 * P2838 Contre quoi: T157859#22 RF lessons (hidden Wi-Fi + Thread LAN)
 * must stay in rf-channel-coexistence helper — never lost / never forum POST.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const rf = require(path.join(ROOT, 'lib/utils/rf-channel-coexistence'));

describe('P2838 RF T157859#22 hidden Wi-Fi + Thread LAN', () => {
  it('exports briefs with tip 157859/22 source', () => {
    const h = rf.hiddenWifiInterferenceBrief();
    assert.equal(h.id, 'P2838');
    assert.equal(h.sourceTopic, 157859);
    assert.equal(h.sourcePost, 22);
    assert.ok(h.examples.length >= 2);
    assert.ok(h.symptoms.some((s) => /ChannelAccessFailure/i.test(s)));
    assert.ok(h.actions.some((a) => /hidden SSID/i.test(a)));
  });

  it('Thread LAN dependency — radio OK can still be unavailable', () => {
    const t = rf.threadLanDependencyBrief();
    assert.equal(t.radioOkButUnavailable, true);
    assert.ok(t.reasons.some((r) => /IPv6|border router/i.test(r)));
    assert.ok(t.symptoms.some((s) => /waves|sleepy/i.test(s)));
  });

  it('formatCoexistenceTips + protocol brief include P2838 wording', () => {
    const tips = rf.formatCoexistenceTips();
    assert.ok(tips.some((x) => /hidden/i.test(x)));
    const brief = rf.protocolSelectionBrief();
    assert.ok(/LAN|border/i.test(brief.thread.coexistenceRisk));
    assert.ok(brief.tips.some((x) => /P2838|ChannelAccessFailure/i.test(x)));
  });

  it('human guide documents P2838 bullets', () => {
    const md = fs.readFileSync(path.join(ROOT, 'docs/guides/RF_CHANNEL_COEXISTENCE.md'), 'utf8');
    assert.ok(/P2838/.test(md));
    assert.ok(/ChannelAccessFailure/.test(md));
    assert.ok(/hidden 2\.4 GHz/i.test(md));
  });
});
