# Portal diag harvest — 2026-09-01

SHADOW only — no forum / PM posts. No secrets or raw dumps committed.

## Tip versions (Athom portal, refreshed this run)

| Track | App ID | Local compose | Portal tip | Notes |
|-------|--------|---------------|------------|-------|
| Master Test | `com.dlnraja.tuya.zigbee` | **9.0.759** | **#3070 v9.0.757 [test]** | **#3072 v9.0.760** + **#3071 v9.0.758** = `processing_failed` (socket hang up) — P139, do not spam republish |
| Stable Test | `com.dlnraja.tuya.zigbee.stable` | **5.12.110** | **#46 v5.12.110 [test]** | Tip OK |

“Fixed on tip 9.0.760 / 5.12.110” → treat as: **code present on master tip Test ≥9.0.757** and **Stable Test 5.12.110** (9.0.760 itself never entered Test).

Evidence: `.github/state/dashboard-monitor-report.json`, `.github/state/dashboard-monitor-both.json`.

---

## How portal / Athom diagnostics are fetched

| Layer | Script / npm | Auth | What it pulls |
|-------|--------------|------|---------------|
| Builds / Test tip | `scripts/automation/dashboard-monitor.js` (`npm run versions:report`, `dashboard:both`) | athom-cli delegation → `AthomAppsAPI.getBuilds` (fallback `HOMEY_PAT`) | Build list, states, crash counters |
| Dual tip summary | `tools/ci/dashboard-both-apps.js`, `tools/ci/dashboard-state-summary.js` | same | Master + Stable reports |
| Version crash watcher | `scripts/ci/version-health-check.js` | `homey-apps-api-client` | Flags tip `test/live` with crashes + recent `processing_failed` |
| Crash / user diag by UUID | `scripts/ci/fetch-homey-app-diag-by-uuid.js` | refresh → apps JWT; probes apps-api crash/diagnostic paths + **`getCrashes` per recent build** | Writes `.github/state/homey-app-diag/<uuid>.json` + `.sanitized.json` |
| UUID harvest (forum/state → Athom) | `tools/ci/inbox-diag-uuid-harvest.js` (`diag:inbox-uuids`, optional `--fetch`) | same when `--fetch` | Lists UUIDs; fetch optional |
| Portal crash list (this harvest) | `reports/inbox-l99-2026-09-01/_portal-crash-harvest.js` | `homey-apps-api-client` | Tip builds → `getCrashes` → `.github/state/portal-crash-harvest.json` (privacy-redacted; Log IDs may be over-redacted) |
| Gmail channel (not portal UI) | `.github/scripts/fetch-gmail-diagnostics.js` (`diag:gmail`) | IMAP/OAuth secrets | `.github/state/diagnostics-report.json` |
| Aggregate / treat | `collect-diagnostics.js`, `diag-recursive-inbox-automate.js`, `recursive-diag-interview-treat.js` | local state | Cross-ref only |
| Cartography | `docs/HOMEY_DEV_PORTAL_MAP.md` | — | SPA endpoints: `apps-api…/build`, crashes on build detail |

Manual user “Diagnostic code” UUIDs usually land as **apps-api crash rows** with `Log ID: <uuid>` (not a dedicated public diagnostic GET).

---

## Commands run this session (safe / no commit)

| Command | Result |
|---------|--------|
| `node scripts/automation/dashboard-monitor.js --latest --json` | **OK** — tip refresh |
| `node tools/ci/dashboard-both-apps.js` | **OK** — master + stable |
| `node tools/ci/dashboard-state-summary.js` | **OK** (stale both-json until both re-ran) |
| `node scripts/ci/version-health-check.js` | **Exit 1** expected — many recent `processing_failed` (socket hang up) |
| `node scripts/automation/version-intelligence-report.js` | **OK** — also rewrote `docs/WORKING_VERSIONS_REFERENCE.md` (local only) |
| `node tools/ci/inbox-diag-uuid-harvest.js --max=8` | **OK** — 16 UUIDs listed, **fetch=0** (dry) |
| `node reports/inbox-l99-2026-09-01/_portal-crash-harvest.js` | **OK** — 7 crash rows on tip window |
| `node scripts/ci/fetch-homey-app-diag-by-uuid.js 05867379-…` | **OK** — FOUND build **3065 / 9.0.750** |
| `node scripts/ci/fetch-homey-app-diag-by-uuid.js 2b0b4e4f-…` | **OK** — FOUND build **3059 / 9.0.743** |
| Gmail live fetch (`diag:gmail`) | **Not run** — needs secrets; used existing `diagnostics-report.json` as adjunct only |
| Forum post / PM | **Not run** |

---

## Newest portal crashes / diags (last ~7 days)

Source of truth: Athom `getCrashes` + sanitized files under `.github/state/homey-app-diag/`. Homey **13.4.1** on all below.

### A. Fresh tip window (harvested 2026-09-01)

| When (UTC) | UUID | App ver | Symptom | Couple (mfr+pid) | Drivers in log | Tip fix? |
|------------|------|---------|---------|------------------|----------------|----------|
| 2026-08-31 13:16 | `05867379-dabd-4299-bb1a-cad53fa57189` | **9.0.750** | “Time out after 10000ms / Data device not updated” | **ABSENT** (do not invent) | `curtain_motor` | **OPEN** — TX claims success but hybrid reports **Active protocols: none**; `TuyaEF00Manager not available` |
| 2026-08-31 10:03 | `2b0b4e4f-971e-4e1f-8d32-09d255e232d0` | **9.0.743** | “TS0044 + _TZ3000_zgyzgdua driver unknown” | **`_TZ3000_zgyzgdua`+`TS0044`** (from user message) | boot noise; couple → `scene_switch_4` | **LOCKED in tip code** — user must update Test ≥9.0.757 + **re-pair**; no new portal crash on 9.0.755–757 |
| 2026-08-31 09:22 | *(auto crash, no Log ID)* | **9.0.743** | `Invalid Driver ID: ZG9101SAC_HP` | n/a (foreign driver id) | serializer / `ManagerDrivers` | **FIXED in tip** — `lib/utils/safe-get-driver-patch.js` + `app.js` P2351; also on Stable `app.js` / 5.12.110 |
| 2026-08-31 09:18 | *(auto crash)* | **9.0.730** | same `ZG9101SAC_HP` | n/a | same | same P2351 |
| 2026-08-31 08:58 | `e3bf7ffc-61dd-4529-be19-9e23e6823b1e` | **9.0.743** | “Smart Thermostat working” | ABSENT | `wall_thermostat` | Noise / positive — DP24/36 RX OK |
| 2026-08-31 07:11 | `724d4bc9-229b-46ba-bad7-fc61af93865d` | **9.0.741** | “Still Unknown Device” | ABSENT | wifi drivers boot only | **Not actionable for FP** until couple appears |
| 2026-08-31 06:53 | `a000e0a5-5287-4612-b1a9-f77ed8c0d5d9` | **9.0.730** | “Still detecting as Unknow Device” | ABSENT | wifi boot / LIVE-DATA reject | same |

Evidence paths:

- `.github/state/homey-app-diag/05867379-dabd-4299-bb1a-cad53fa57189.sanitized.json`
- `.github/state/homey-app-diag/2b0b4e4f-971e-4e1f-8d32-09d255e232d0.sanitized.json`
- `.github/state/homey-app-diag/e3bf7ffc-61dd-4529-be19-9e23e6823b1e.sanitized.json`
- `.github/state/homey-app-diag/724d4bc9-229b-46ba-bad7-fc61af93865d.sanitized.json`
- `.github/state/homey-app-diag/a000e0a5-5287-4612-b1a9-f77ed8c0d5d9.sanitized.json`
- `.github/state/portal-crash-harvest.json` (stack heads; UUID fields may be privacy-over-redacted)

### B. Earlier in window (still ≤7d, portal-fetched)

| UUID | Ver | Symptom | Couple | Tip? |
|------|-----|---------|--------|------|
| `60959c24-a0e6-4159-8cf1-12f9ba5df612` | 9.0.688 | wall dimmer paired but controls dead; “Could not reach device” | mfr `_TZE284_m1cvyneb` only in text — sacred couple is **`_TZE284_m1cvyneb`+`TS0601`** (do not invent other pids) | **Partially fixed** (P2322 handshake / `_txCapability`) on tip — verify after update+re-pair; brightness 0–1000 |
| `8c49c683-294c-4965-ade1-e165c56a06e9` | 9.0.678 | “App Crashing and AC not functioning” | ABSENT | `RangeError: Maximum call stack size exceeded` on `wall_thermostat` — **watch**; no recurrence on 9.0.743+ tip harvest |
| `8cc4aef0-a486-4cb1-badd-087ed84f43da` | 9.0.677 | Zigbee Smart AC Thermostat #532 | ABSENT | same family as above |
| `a095345e-08a4-4d5e-b3b1-adbc30ff12a2` | 9.0.699 | “Only ON Mode working #532” | ABSENT | `wall_thermostat` |
| `c40705a1-…` / older TS0044 notes | ≤9.0.714 | meter91 family | `_TZ3000_zgyzgdua` seen | covered by `scene_switch_4` lock |

---

## Actionable NEW / open items

1. **`curtain_motor` timeout / stale UI** — UUID `05867379…` on **9.0.750** (newest portal user diag).  
   - Evidence: `.github/state/homey-app-diag/05867379-dabd-4299-bb1a-cad53fa57189.sanitized.json`  
   - Weakness: hybrid protocol all disabled / no RX while DP-TX “success”; no mfr+pid in sanitized log → need next diag with settings or interview.  
   - Classify likely **BOTH** if reliability fix.  
   - **Not proven fixed** on 9.0.757 / 5.12.110.

2. **`_TZ3000_zgyzgdua`+`TS0044` “driver unknown”** — UUID `2b0b4e4f…` on **9.0.743**.  
   - Evidence: same sanitized path; lock in `drivers/scene_switch_4/driver.compose.json` + `docs/knowledge/device-truth.json`.  
   - Action: confirm user on tip ≥9.0.757 + re-pair (Homey cannot hot-swap).  
   - **Code fixed on tip**; symptom on stale build.

3. **`ZG9101SAC_HP` Invalid Driver ID** — auto crashes on **9.0.730 / 9.0.743**.  
   - Evidence: `.github/state/portal-crash-harvest.json` stack heads; fix `lib/utils/safe-get-driver-patch.js`, `app.js` (master + stable).  
   - **Fixed on tip Test 9.0.757 and Stable 5.12.110**; no tip crashes on 9.0.755–757 harvest.

4. **Unknown Device without couple** (`724d4bc9…`, `a000e0a5…`) — **blocked** until mfr+pid appears (Gmail/forum/interview). Do not invent pid.

5. **`_TZE284_m1cvyneb` controls dead** (`60959c24…`) — couple = **+`TS0601` → `wall_dimmer_tuya`** only. Re-verify TX path on tip after re-pair.

### Not NEW couples from portal tip

No new sacred couples invented. Only verified pair in tip window: **`_TZ3000_zgyzgdua`+`TS0044`**.

---

## Gmail adjunct (existing `diagnostics-report.json`, not portal SPA)

Refreshed timestamp `2026-09-01T00:59:57Z`, 70 entries (many state-batch timestamps). Couples seen in last-7d parse (mfr+pid only when both present) include:

- `_TZ3210_w0qqde0g`+`TS011F`
- `_TZ3000_famkxci2`+`TS0043`
- `_TZ3000_zutizvyk`+`TS0203`
- `_TZ3000_b4awzgct`+`TS0041`
- `_TZ3000_an5rjiwd`+`TS0041` / `TS0044` (two pids — treat as separate couples)
- `_TZ3000_gwkzibhs`+`TS004F`
- `_TZE284_iadro9bf`+`TS0601`
- `_TZE204_gkfbdvyx`+`TS0601`
- `HOBEIAN`+`ZG-102Z` (ignore fake `ZG-102Z-CIE-Enrollment-*` / `IAS-Zone-*` pseudo-pids)

OCR-truncated mfrs (`_TZ321C_fkzihaxe8`, truncated `_TZ3210_w0qqde`) need verify before lock. Evidence: `.github/state/diagnostics-report.json`.

---

## Dual-app classify (for follow-up fixes)

| Item | Class |
|------|-------|
| P2351 foreign driver soft-fail | **BOTH** (already on stable) |
| scene_switch_4 TS0044 / 0xFD | **BOTH** |
| curtain_motor hybrid RX/timeout | **BOTH** if reliability; else investigate first |
| wall_dimmer MCU TX / brightness | **BOTH** |
| wall_thermostat stack / AC #532 | **MASTER_ONLY** until root cause proven on stable path |

---

## Notes / caveats

- Tip **9.0.760 did not publish** (Athom socket hang). Judge “tip fixed” against **9.0.757 Test** + local **9.0.759** compose.
- `privacy-redactor` may over-redact Log IDs inside JSON harvest; prefer filename / `uuid` field on sanitized diag files.
- Helper scripts under `reports/inbox-l99-2026-09-01/_*.js` are local analysis aids; not committed unless requested.
- No forum posting performed.
