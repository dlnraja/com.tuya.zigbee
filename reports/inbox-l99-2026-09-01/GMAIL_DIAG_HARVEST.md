# Gmail diagnostic harvest — 2026-09-01

Silent only. **Never** Homey forum POST / PM / AI paste (T157628).  
Lock **manufacturerName + productId** only. Never invent pid. Dual-app: `BOTH` | `MASTER_ONLY`.

Generated: **2026-09-01T01:00Z** · Tip on disk: **9.0.759** · Auth: **L3 local** (IMAP/OAuth secrets missing)

---

## 1. Harvest path

| Step | Result |
|------|--------|
| `node .github/scripts/gmail-auth-cascade.js` | L0 plugin not signaled · L1 IMAP missing · L2 OAuth missing · **L3 local ready** → `Recommended: L3_local` |
| `fetch-gmail-diagnostics.js` (`DRY_RUN=true`, `GMAIL_DIAG_AUTO_IMPLEMENT=false`) | **OK** — mode `local`, 100 records read, **70** processed (30 already-seen skipped) |
| By type | diagnostic 58 · crash_report 2 · interview 10 |
| Auto-implement | disabled (correct) |
| Side outputs | `.github/state/diagnostics-report.json` · `gmail-crash-patterns.json` · `reports/gmail-forum-2026-09-01/TREAT.md` |
| Recursive treat (prior L99) | 820 sources · 376 cases · **123 actionable** · 635 gmail bodies · `reports/diag-recursive-treat-2026-09-01/` |
| Crash pattern gate | **verdict ok** · `unknownFatals: []` · `watch: []` · all hits `knownFixed` |

**Note:** Live IMAP/OAuth unavailable this session — harvest is offline from prior CI/local state. Do not treat truncated scrape tokens (`_TZ3210_w0qqde`, `_TZ321C_fkziha`, `ZG-102Z-IAS-Zone-*`) as new productIds.

---

## 2. Most recent diagnostics (prefer ≥2026-08-20)

### 2a. Homey portal / Athom API diags (found=true)

| UUID (short) | When UTC | App | Homey | Symptom / note | Couple (only if present) | Overlap |
|--------------|----------|-----|-------|----------------|--------------------------|---------|
| `e3bf7ffc` | 2026-08-31 | **9.0.743** | 13.4.1 | “Smart Thermostat working” | *(none in msg — wall_thermostat FCU OK)* | Closed loop for #532 AC |
| `724d4bc9` | 2026-08-31 | 9.0.741 | 13.4.1 | Still Unknown Device | **ABSENT** in post | Salvagr / #533 curtain path |
| `a000e0a5` | 2026-08-31 | 9.0.730 | 13.4.1 | Still detecting as Unknown | **ABSENT** | Same cluster as #533 |
| `4217d5e3` | 2026-08-30 | 9.0.719 | 13.4.1 | Presence 24G always unknown | User text: `_TZE204_clrdrnya` *(pid not in msg — known couple is +TS0601)* | Portal + forum VicHY |
| `e5d19878` / `b3bd114a` / `c137a5d7` | 2026-08-30 | 9.0.719 | 13.4.1 | Detected as Zigbee / Unknown | **ABSENT** | #533 / radiator mis-match |
| `7a6f2ca1` / `c40705a1` | 2026-08-30 | 9.0.714 | 13.4.1 | Unknown / Moes 4-way not recognized | meter91 path → `_TZ3000_zgyzgdua`+**TS0044** (from prior harvest, not this UUID body) | Portal + Gmail 55e3e591 |
| `60959c24` | 2026-08-29 | **9.0.688** | 13.4.1 | Dimmer OK, “none of controls work” | `_TZE284_m1cvyneb`+**TS0601** → `wall_dimmer_tuya` | Portal stack + DynCap humidity on DP2 |
| `8c49c683` | 2026-08-29 | 9.0.678 | 13.4.1 | App crashing / AC not functioning | *(none)* wall_thermostat | Superseded by `e3bf7ffc` @ 9.0.743 |

### 2b. Gmail / recursive bodies (UUIDs with couples + app)

| UUID | App | Couple(s) | Symptom | Fix map |
|------|-----|-----------|---------|---------|
| `3a1f196d` | 9.0.626 | `_TZE284_6ocnqlhn`+**TS0601** | Tongou TO-Q-SYS-JZT not recognized / wrong driver | **P2207/P2229** `din_rail_meter`; forbid `smart_rcbo` |
| `55e3e591` | 9.0.617 | `_TZ3000_zgyzgdua`+**TS0044** | Scene / flow / physical | **scene_switch_4** + **0xFD** PhysicalButtonMixin |
| `0cea6870` | 9.0.617 | contact IAS couples + water (`TZ3210_p68kms0l`+TS0207) + SOS | Water / button / contact pulse | **IAS coerce** ≥9.0.621 · `shouldSkipIasOnlyEf00Tx` |
| `9cbf9eb6` | 9.0.621 | `_TZ3000_xffhmvhv`+**TS004F** | Nobø only button 1 usable | `button_wireless_4` · FLOW-GUARD / hashed resolve |
| `ace66ff9` | 9.0.558 | `_TZ3000_0dumfk2z`+**TS0215A** · water soft | SOS no press in Flow | SOS physical + wake enroll (**BOTH**) |
| `ec514112` | 9.0.558 | water + SOS | Waterdetector not responding | IAS coerce + SOS debounce |
| `f647d35b` | (treat) | `_TZE284_6ocnqlhn`+TS0601 · `_TZ3000_xffhmvhv`+TS004F | Tongou + flow spam + Athom hang | din_rail + button_wireless_4 + P139 wait |
| `60959c24` | 9.0.688 | `_TZE284_m1cvyneb`+TS0601 | Controls dead / DynCap humidity on brightness DP2 | Wall dimmer DP profile / peer-thrash (**P2314–P2350**) |

Portal UUID list also in `.github/state/inbox-diag-harvest/latest.json` (16 UUIDs). Several short codes (`0cea6870`, `3a1f196d`, `4b1a0dc9`, …) are **Gmail-only** (Athom apps-api 404) — overlap is by UUID string in Gmail body, not portal crash API.

### 2c. L3 rolling harvest couples (2026-08-30/31 batch)

Cartesian couples with **both** mfr+pid present (interview noise IAS-Zone/CIE stripped):

| Couple | Hits | Likely driver (compose) | Notes |
|--------|-----:|-------------------------|-------|
| `_TZE284_iadro9bf`+TS0601 | 4 | `presence_sensor_radar` | Already in compose |
| `HOBEIAN`+ZG-102Z | 4 | `contact_sensor` | IAS contact; fake pids `ZG-102Z-IAS-Zone-*` ignored |
| `_TZ3000_b4awzgct`+TS0041 | 4 | `button_wireless_1` | Known SH-SC07 sibling |
| `_TZE204_gkfbdvyx`+TS0601 | 2 | `presence_sensor_radar` | Already in compose |
| `_TZ3000_zutizvyk`+TS0203 | 2 | `sensor_contact_zigbee` / contact family | Verify routing |
| `_TZ3000_an5rjiwd`+TS0041 / +TS0044 | 2+2 | `button_wireless_4` lists mfr | **Do not invent** which pid user has without interview |
| `_TZ3000_gwkzibhs`+TS004F | 2 | `smart_knob_rotary` (compose has TS004F) | Confirm not mis-paired as button_wireless_4 |
| `_TZ3210_w0qqde0g`+TS011F | 2 | mfr on `button_wireless_2`; TS011F is plug-class | **Investigate couple** — possible mis-route; do not invent alternate pid |
| `_TZ3000_famkxci2`+TS0043 | 2 | `button_wireless_3` | Present in compose |
| `_TZ321C_fkzihaxe8`+TS0225 | 2 | `presence_sensor_radar` | Present in compose |
| `_TZ3000_wkai4ga5` / `_TZ3000_5tqxpine` | 2 | pid **ABSENT** in this harvest | Known lock: `wkai4ga5`+**TS0044** → `scene_switch_4` — **do not invent TS0042** |
| `_TZ3000_ysdv91bk` / `_TZ3000_blhvsaqf` | 1 | BSEED **zcl_only** | pid ABSENT — leave alone |

“New FP” strings from fetch (`ZG-102Z-IAS-Zone-*`, truncated `_TZ3210_w0qqde`, `_TZ321C_fkziha`) = **noise** — not sacred couples.

---

## 3. Cross-check vs shipped fixes (P2286–P2360)

| Patch / theme | Status on tip 9.0.759 | Still seeing in diags? | Action |
|---------------|----------------------|------------------------|--------|
| **P2286–P2288** publish / soft-expect / sacred-keep | Shipped BOTH | Athom `processing_failed` / socket hang still in treat | Ops only — no bump-loop (P139) |
| **Tongou** `_TZE284_6ocnqlhn`+TS0601 → `din_rail_meter` | Shipped (P2207/P2229) | `3a1f196d` @ **9.0.626** (stale) | User: update Test + **re-pair** |
| **scene_switch_4 0xFD** `_TZ3000_zgyzgdua`+TS0044 | Shipped | `55e3e591` @ 9.0.617 (stale) | Update ≥9.0.738+ + re-pair |
| **IAS zoneStatus coerce** | ≥9.0.621 BOTH | `0cea6870` @ 9.0.617; older SOS/water | Update + wake/re-pair sleepy |
| **`shouldSkipIasOnlyEf00Tx`** | Shipped BOTH | Recurring in treat on contact/SOS/water | Verify on tip; no new code unless fresh ≥9.0.750 diag |
| **Foreign driver ID** `ZG9101SAC_HP` **P2351** | `safe-get-driver-patch` shipped BOTH | Not in this L3 batch / crash gate watch empty | Monitor only |
| **MCU P2360** Formats / seq10 / brightness 0–1000 / FORCE_UPDATE | Shipped (master; reliability BOTH) | No new MCU crash UUID this harvest | Soak |
| **Wall dimmer** m1cvyneb DP2≠humidity | Tip ≥9.0.744 | `60959c24` @ **9.0.688** shows DynCap humidity | Update + re-pair |
| **#533 Moes curtain** `_TZE204_5slehgeo`+TS0601 **P2348/P2356** | Shipped | Unknown-device portal diags @ 9.0.714–741 | Update ≥9.0.744+ + re-pair |
| **Presence** `_TZE204_clrdrnya`+TS0601 | Exact mfr in tip | `4217d5e3` @ 9.0.719 | Update + re-pair |
| **Crash patterns P100–P148** | All `knownFixed` | Residual hits in old artifacts only | No new fatal class |

**Crash gate (2026-09-01):** `unknownFatals=[]`, `watch=[]`, verdict **ok**.

---

## 4. What still needs code?

Most recent user pain is **stale Homey Test** (users on 9.0.558–9.0.719 while tip is 9.0.759), not missing tip patches.

### Needs code / investigation (not “update only”)

| # | Item | Dual | Why still open |
|---|------|------|----------------|
| 1 | `_TZ3210_w0qqde0g`+**TS011F** couple audit | **BOTH** | Harvest shows plug pid with mfr also listed on `button_wireless_2` — verify sacred route (plug_energy_monitor / smartplug vs button); **do not invent** another pid |
| 2 | `_TZ3000_gwkzibhs`+**TS004F** knob vs 4-button | **BOTH** | Compose: `smart_knob_rotary`; confirm interview so users are not stuck on wrong class |
| 3 | `_TZ3000_an5rjiwd` multi-pid (TS0041 **and** TS0044 in same mail) | **BOTH** | Keep couple-aware; do not collapse to one pid; verify each pid’s driver |
| 4 | SOS press → Flow (`ace66ff9`, `_TZ3000_0dumfk2z`+TS0215A) if still broken on tip | **BOTH** | Shipped wake/physical path — needs **fresh** diag on ≥9.0.750 before more code |
| 5 | DynCap / peer thrash on `wall_dimmer_tuya` if still maps DP2→humidity on tip | **BOTH** | Evidence only on 9.0.688; re-check if new ≥9.0.750 report |
| 6 | GitHub **#533** post-P2356 soak (position sync / settings) | **BOTH** | Runtime shipped; confirm user on tip before more diffs |
| 7 | Truncated scrape tokens (`_TZ3210_w0qqde`, `_TZ321C_fkziha`) | **MASTER_ONLY** (CI parse) | Harden harvest parser to drop truncated mfrs — not device locks |
| 8 | Live IMAP secrets for next harvest | **MASTER_ONLY** (CI) | L1/L2 missing locally — CI secrets path for fresh mail |

### No new code (shipped — user/ops)

- Tongou din_rail_meter lock · scene_switch_4 0xFD · IAS coerce · EF00 IAS skip · P2351 foreign driver · P2360 MCU · clrdrnya presence · m1cvyneb dimmer · 5slehgeo curtain  
- Athom `processing_failed` / socket hang → **wait / soft-expect**, no republish spam  
- mfr-only lines (`wkai4ga5`, BSEED zcl_only without pid) → **do not invent pid**

---

## 5. Top 10 actionable items

1. **Audit `_TZ3210_w0qqde0g`+TS011F** (BOTH) — sacred couple vs button_wireless_2 listing; lock correct plug/energy driver only if verified.  
2. **Confirm `_TZ3000_gwkzibhs`+TS004F** → `smart_knob_rotary` (BOTH) — prevent button_wireless_4 mispair.  
3. **Keep `_TZ3000_an5rjiwd` couple-split** TS0041/TS0044 (BOTH) — no mfr-only prune.  
4. **Tongou users on ≤9.0.626** (`3a1f196d`) — update Test + re-pair `din_rail_meter` (no forum reply).  
5. **meter91 / zgyzgdua+TS0044** on ≤9.0.617 — update + re-pair `scene_switch_4`.  
6. **PresentSky / m1cvyneb** (`60959c24` @ 9.0.688) — update ≥9.0.744+ + re-pair; only reopen DynCap if tip still shows humidity on DP2.  
7. **VicHY / clrdrnya** (`4217d5e3` @ 9.0.719) — update + re-pair `presence_sensor_radar` (pid TS0601 from known lock, not invented from this UUID alone).  
8. **#533 Salvagr Unknown Device** cluster (portal 9.0.714–741) — update ≥9.0.744+; watch position/settings soak (P2356).  
9. **SOS Flow press** (`ace66ff9` / `0dumfk2z`+TS0215A) — request/await tip-version diag before further BOTH patches.  
10. **Restore L1 IMAP (or L2 OAuth) for CI/local** (MASTER_ONLY ops) — L3 is stale for “since yesterday” mail; crash gate is green but cannot see brand-new UUID bodies without secrets.

---

## 6. Policy reminders

- Publish = Homey App Store Test. **Do not post** = no Community / PM.  
- Never invent productId; pid ABSENT stays ABSENT.  
- Report only — **not committed**.
