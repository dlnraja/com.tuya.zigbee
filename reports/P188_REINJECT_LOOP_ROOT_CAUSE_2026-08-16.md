# P188 — The re-inject loop, caught live and cut at the source (2026-08-16)

P183 reconstructed the largest defect loop in the project's history from commit
archaeology: automation strips manually-added fingerprints, a human re-applies
them, repeat. 37 commits over 12 days, fought nine separate times between P61 and
P135c. It was described as historical.

It reproduced inside an hour today, which turned it from a story into evidence.

## What happened

| Time (UTC) | Commit | Action |
|---|---|---|
| 16:29 | `4b334d90b` (mine) | removed `_TZ3210_jaap6jeb` from `contact_sensor`, `_TZ3000_qeuvnohg` from `lcdtemphumidsensor_plug_energy`, added `qeuvnohg` to `din_rail_switch` |
| 16:41 | `13d24a528` (auto-fix-all bot) | put both back **and** removed `qeuvnohg` from `din_rail_switch` |

One bot commit, the exact inverse of the registry, all three corrections undone
twelve minutes later. The cross-source triage flagged it immediately: `humanGaps`
went 0 → 1, because `_TZ3000_qeuvnohg` appears in the forum scan and was now
claimed by no driver at all.

## Root cause: two sources of truth

`data/user-misattribution-registry.json` records, per case, the `canonicalDriver`
a couple belongs to and the `forbiddenDrivers` it must never appear in. That file
is the human decision record.

`tools/ci/anti-bot-regression-gate.js` — the gate whose entire purpose is to stop
this — defended a **separate, hand-maintained `FORBIDDEN` array** in its own
source. A case added to the registry was therefore never actually enforced. The
registry said one thing; the gate checked another; the enrichment scripts obeyed
neither.

That also explains the shape of the historical loop. Each round added another
entry to a hardcoded list somewhere, which is why it had to be fought nine times
instead of once.

## The fix

The gate now derives its rules from the registry in addition to its own list, so
every existing and future case is defended by the act of recording it.

This cuts the loop rather than repairing after it. `auto-fix-and-publish.yml`
runs the gate twice — after the injectors, **before** the "Commit fixes" step — so
the bot's own job fails instead of pushing the regression.

Verified on the next run:

```
FAILED STEP: 🛡️ Anti-bot gate (post-enrich)
  ❌ FORBIDDEN registry:din-relay-vbfp8eyv-qeuvnohg:lcdtemphumidsensor_plug_energy
  ❌ FORBIDDEN registry:rgb-bulb-jaap6jeb:contact_sensor
  FAILED: 2 regression(s)
```

The enrichment scripts still attempt the re-injection on every run. They are now
stopped at the gate instead of reaching master.

## The trade-off, stated plainly

**`🤖 Auto-Fix + Publish Pipeline` will stay red until the injector itself is
fixed.** That is deliberate. Having just spent this session fixing a CI that was
red on 26 of 27 runs, I am not going to pretend a permanently-red workflow is
comfortable — but the two cases differ in kind. That one was red for a stale
reason and told you nothing. This one is red because it is correctly refusing to
commit a known-wrong change, and it names which one.

Failing loudly beats corrupting silently, and the failure is now attributable to
a specific step rather than showing up weeks later as a user pairing the wrong
device.

## Next step: identify the injector

The gate detects; it does not yet prevent. The pipeline runs several scripts that
can write manufacturerName arrays:

- `scripts/validation/auto-fix-all.js`
- `tools/ci/re-inject-manual-fixes.js` (runs **twice**)
- `tools/ci/bidirectional-enricher.js`
- `tools/ci/infer-enrich-from-incomplete.js`
- `tools/ci/apply-p101-sacred-lot2.js`
- `scripts/automation/fix-fingerprint-conflicts.js`

None hardcodes `jaap6jeb` or `qeuvnohg`, so the placement is derived from data.
`re-inject-manual-fixes.js` is the prime suspect: it exists to re-add manual
fixes, and P183 already recorded it turning on its own users — on 2026-08-14 it
began stripping the TS004F remotes it was written to protect.

The durable fix is for whichever script writes a manufacturerName to consult the
registry before doing so, exactly as the gate now does. Until then the gate holds
the line.

## Commands

```bash
node tools/ci/anti-bot-regression-gate.js
node tools/ci/align-mfs-db-intelligent.js --check
node tools/ci/cross-source-user-report-triage.js
```
