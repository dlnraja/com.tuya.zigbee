# P183 — Knowledge corpus sweep: rules, history, changelogs (2026-08-16)

A read of the whole written corpus — ~594 markdown files, `CORE_RULES.md` (79
numbered rules), `.cursorrules`, `AGENTS.md`, `AI_CONTEXT_MANDATE.md`,
`PROJECT_INDEX.md`, 21 files under `docs/rules/`, 226 reports, both changelogs —
cross-referenced against the full git history (27,353 commits across 24 branches,
2020-05-17 to 2026-08-16; ~6,829 once rebase and cherry-pick duplicates are
collapsed).

The point was not to summarise the documentation. It was to find where the
documentation is **wrong, contradictory, or unenforced**, because those are the
places a future change goes bad.

## 1. A documented rule was instructing agents to reintroduce a known bug

`docs/rules/ZIGBEE_TUYA_RULES.md` contained two statements that directly
contradict current doctrine, and one that contradicted itself:

| Line | Said | Contradicts |
|---|---|---|
| 112 | rule 29: "`[[device]]` in ALL language variants" | `.cursorrules` and `CORE_RULES` R10 ban `[[device]]` in `titleFormatted` — it forces Homey to show a manual device picker |
| 96 | "Do NOT remove `measure_battery` from mains devices" | `.cursorrules`, `LAYERS_CAPABILITY_PROTOCOL.md` and P181 all require stripping it |
| 70 vs 96 | line 70 says strip battery capabilities on mains, line 96 says do not | itself |

The `[[device]]` one is the dangerous entry: an agent following the rule table
would reintroduce a bug the project already paid for. Both are now corrected in
place, with the mains case stated precisely — a dual-power device with a real
backup cell keeps `measure_battery`; a pure mains device must not.

## 2. The repo's own auto-fix would corrupt the manifest

`scripts/validate/homey-mandatory-check.js` prints *"Run with --fix to
auto-correct fixable issues"* whenever the M08 version check fails. That fix
rewrote all three manifests with `JSON.stringify(j, null, 2)`.

`package.json` and `.homeycompose/app.json` really are 2-space indented, but the
generated root `app.json` is **one compact line of 3.6 MB**. Pretty-printing it
produces a **6.5 MB, 251,265-line file** — and it still passes the publish size
gate, because that gate measures the *compacted* size. So the sanctioned remedy
would have silently shipped a near-doubled manifest with an unreviewable diff.

I know the failure mode first-hand: I triggered it earlier in this session by
rewriting `app.json` the same way, and had to restore the compact form in a
follow-up commit.

The fix now detects each file's existing shape and re-emits in it. Verified
byte-identical round-trips on all three manifests.

This matters more than it looks: M08 is the single most repeated mechanical
defect in project history — **61 commits over 8 months**, four of them on
2026-08-16 alone.

## 3. Rules enforcement is now measurable

New `tools/ci/rules-enforcement-matrix.js` (`npm run rules:matrix`) maps each
machine-checkable rule to the gate enforcing it, then **verifies the mapping**:
the source document must exist, the gate file must exist, and where a signature
is given it must still appear in that gate. A renamed or gutted gate fails here
rather than going quiet.

Current state: **47 rules tracked, 36 enforced (77%), 0 broken references.**

The eleven unenforced ones are recorded with the reason, and they are honest
gaps rather than oversights:

| Rule | Why it is not enforced |
|---|---|
| Z7 CaseInsensitiveMatcher mandatory | nothing scans for ad-hoc `toLowerCase` on manufacturer strings |
| F7 backlight string values | no gate inspects backlight comparisons |
| F8 mixin order | needs class-expression parsing |
| S5 duplicate module basenames | `dead-module-audit` finds orphans, not duplicates |
| P7 size ceiling ratchet | the gate reads a threshold; nothing stops it being raised |
| C3 CI must not write to `drivers/` | policy only |
| C4 automation must not author runtime code | needs commit-authorship inspection |
| M3, D1, D2, D3 | wording and branch policy — human judgement |

## 4. What the git history says about where defects come from

Four defect signatures recur in **all eleven active months**: crash/lifecycle
guards, sacred-couple collisions, SOS/IAS-Zone enrollment, and flow-card ID
validity. A defect that returns every month is a missing gate, not bad luck.

Two findings are worth recording because they change how to prioritise:

**The most-edited file in the repo is a build output.** `app.json` (3,119
modifications) and `.homeychangelog.json` (2,609) top the churn list, and roughly
2,000 commits are bot state-file writes with no review value. Real changes are
buried in that noise.

**The two most-edited scripts exist only to defend against the project's own
automation.** `tools/ci/re-inject-manual-fixes.js` (34 edits, 31 human) and
`tools/ci/anti-bot-regression-gate.js` (27 edits, 100% human). Behind them is the
largest loop in the history: automation stripped manually-added fingerprints and
a human re-applied them, **37 commits over 12 days**, fought nine separate times
between P61 and P135c. By 2026-08-14 the mitigation had itself become the bug —
`re-inject-manual-fixes.js` started stripping the TS004F remotes it existed to
protect.

There is good news the reports had not stated plainly: **bot commits touching
runtime code have essentially stopped** — 68 in 2026-06, 33 in 2026-07, **1 in
2026-08**. The P90/P92.98/P94 gates worked. What is missing is anything that
keeps them working, which is rule C4 above.

One methodological caution for future mining: `[skip ci]` is **not** a bot
marker. 1,533 human commits carry it, and a leading `vX.Y.Z` subject is majority
human (3,909 of 6,628). Only `vX.Y.Z: N drivers, N FPs [skip ci]` and the robot
emoji are reliable. A CI rule keyed on `[skip ci]` would misfire about a third of
the time.

## 5. Documentation staleness

Every headline number in the corpus disagrees with every other one:

| Source | Drivers | Version | Fingerprints |
|---|---|---|---|
| `CORE_RULES.md` | 430 | v9.0.53 | 4,304 |
| `AGENTS.md` | 430 / 431 | v9.0.478 | 5,471 |
| `AI_CONTEXT_MANDATE.md` | — | 7.x.x on master | — |
| live | 431 | 9.0.551 | 3,835 |

`AI_CONTEXT_MANDATE.md` also still describes master as the `7.x.x` line and
claims a separate `com.dlnraja.tuya.zigbee.stable` App ID, when both tracks share
one — the exact condition that lets a stable publish overwrite the master Test
build. `.cursorrules` opens by instructing the agent to read three files at
`c:/Users/HP/Desktop/homey app/tuya_repair/…`, a path from a different machine.

I have not mass-edited these counts. They drift again the moment a bot bumps a
version, so hardcoding fresh numbers just resets the clock. The durable fix is to
stop stating them in prose, which is a separate change worth doing deliberately.

Also removed: `npm run test:old` invoked
`scripts/validation/validate-driver-schemas.js`, which does not exist anywhere in
the repo. Replaced with `npm run rules:matrix`.

## 6. Changelog and user-feedback signal

From `.homeychangelog.json` and `CHANGELOG.md`, the dominant user-visible
categories are crash/lifecycle guards, fingerprint routing, battery correctness
and button reliability — matching the git signatures.

Entries describing a fix that later recurred: TS004F remote routing (fixed in
v5.x, broken again by the re-inject bot at 9.0.496), linear battery formulas,
`setTimeout`/`_destroyed` crashes, and `titleFormatted` — which **flip-flopped**,
having once been changed *to add* `[[device]]` for publish validation before the
current ban. That flip-flop is precisely what the stale rule in section 1 was
still preserving.

Top user-reported symptoms across the forum reports are, in order: wrong device
type after pairing, app crashes and high RAM, buttons or SOS not firing, battery
stuck at a wrong percentage, and remotes not responding. Every one of those maps
to a defect class now covered by a gate, except "wrong device type after
pairing", which remains a sacred-couple triage problem.

## 7. Highest-value work still open

1. **Sacred-couple monotonicity gate** — fail the build when a `(mfr, pid)` →
   driver mapping present in the previous commit disappears without an allowlist
   entry. This is a declarative assertion rather than another repair script, and
   it addresses the 94-commit strip/re-apply loop plus the "restore lost
   manufacturer IDs" cluster. Highest value by a wide margin.
2. **Rule C4** — reject commits authored by a bot identity that modify
   `lib/**`, `drivers/**/device.js` or `app.js`. Locks in the 68 → 1 improvement.
3. **Rule S5** — duplicate module basenames at different paths, which has caused
   an app-crash-on-startup.
4. **Rule P7** — ratchet the publish size ceiling downward only.

## Commands

```bash
npm run rules:matrix
node tools/ci/rules-enforcement-matrix.js --strict
node scripts/validate/homey-mandatory-check.js --fix   # now format-preserving
```
