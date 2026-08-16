# P200 — Homey timer API match (appCommand / zclState)

**Date:** 2026-08-16  
**Class:** BOTH (crash / reliability)  
**Tracks:** `master` + surgical `stable-v5`

## Investigation

After P199 (presence/contact intervals), a fleet scan found **27 drivers** still pairing:

- create: `this.homey.setTimeout(...)`
- clear: global `clearTimeout(...)`

Homey Pro timer handles are not interchangeable with Node globals → silent no-op clears and leaked pending flags (`_appCommandPending`, `_zclState.pending`).

## Fix

Batch migrate to `safeSetTimeout` / `safeClearTimeout` from `lib/utils/safe-timers.js` for:

- `this._appCommandTimeout`
- `this._zclState.timeout[ep]`

Also repaired 6 files where `'use strict'` had been mid-file after import insertion.

## Regression

`test/critical/p200-homey-timer-api-match.test.js` — sample asserts + full drivers/ scan for raw clears.

## Publish policy

- Master: Auto-Publish on push (expect 9.0.566+ soak).
- Stable: Publish Stable soak-first → skip draft while Homey Test is 9.x (shared App ID).
