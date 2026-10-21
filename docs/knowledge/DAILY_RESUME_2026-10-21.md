# Daily resume 2026-10-21

Branch `master` (Universal Tuya Test 9.0.x). Change numbers **P2918** (automation) and **P2919** (devices).
All text is our own wording; upstream items are cited by number, link and author only.

## P2918 — data-only auto-commits no longer refused by unrelated tree edits

Symptom: since 2026-10-20 the forum-poll job could not commit `data/leads/forum-image-ocr.json`
(run 39513142380). `safe-auto-commit.js` runs the shared rules gates whenever a commit touches `data/`, and the
compose-sync gate saw a compose-only case variant on `switch_2gang` (`_TZ3000_TONRAPSK`) that an earlier scan step of
the same job had written but that was not part of the commit. The differential check then compared against a clean
stash and blamed the data-only commit.

Fix: before the gate, unstaged and untracked changes outside the index are set aside with
`git stash --keep-index --include-untracked`, the gate judges the staged change alone, and the set-aside edits are
restored right after (they were never committed by this step anyway). The summary lists the set-aside paths so the
writer can be traced. Test: `test/ci/p2918-safe-auto-commit-isolation.test.js` (fails without the fix).

Still a lead: which forum-poll scan step writes the all-uppercase variant into `switch_2gang` compose only (not one
of `apply-forum-silent-multi`, which compares case-insensitively). Runtime matching already normalises case, so the
variant adds nothing; the writer should stop adding case variants.

## P2919 — sweep chunk (30 oldest needs-info)

`data/leads/sweep-checkpoint.json`, key `dailyResume20261021`. Needs-info 554 → 531 after this chunk (the automatic
history sweep keeps adding items). Result: 3 fixed, 2 already fixed, 2 deferred leads, 15 no action, 8 still
needs-info with a fresh note.

Placed (one reliable source each: the Homey interview or device settings posted in the issue, exact strings):

| Couple | Driver | Upstream |
|---|---|---|
| `HEIMAN` / `SmokeSensor-EF-3.0` | `smoke_detector_advanced` (native IAS zone; Heiman HS1SA family already there) | JohanBendz #190 |
| `Samotech` / `SM311` | `dimmer_1_gang` (native OnOff + Level, router) | JohanBendz #284 (HenryMD18) |
| `eWeLight` / `ZB-DL01` (0-10 V dimmer) | `dimmer_1_gang` (native OnOff + Level) | JohanBendz #422 (keesverruijt) |

Users: pair the device again (it was unknown before). Paired devices are not touched. Port to stable-v5 and
bastien-home after the master soak.

Already fixed: PJ-MGW1203 clamp meter (#318, `_TZE204/_TZE284_cjbofhxw` on `power_clamp_meter`), forum 26439#1636
(`_TZE200_jthf7vb6` on `water_leak_sensor`).

Deferred leads with exact identity: HEIMAN `RC-EF-3.0` keyfob (#100, needs IAS ACE command handling) and Heiman
`WarningDevice` siren (#447, needs a native IAS WD siren driver; the current `siren` driver class does not fit).

Upstream issues #27, #236 and #269 are deleted (HTTP 410) and closed out as no action.
