# Bastien Instagram harvest 2026-09-24 — Photos-1-001.zip

Silent treat. No forum POST. Source: `c:\Users\Dell\Downloads\Photos-1-001.zip` (33 images → IG DM Andrieu Bastien).

## Timeline (from screenshots)
| When | Bastien says | Status in tip |
|------|--------------|---------------|
| Earlier | TS0041/43 unknown; TS0042 too slow | Fixed tip ≥1.0.83 (pair) |
| Mid | TS0041 OK; TS0042/43 slow; blacks crash app; battery 0–84% TS0043 | P2707/P2710/P2714 |
| Night | RIP all buttons dead after battery algo | OOM LIVE-DATA **27b0bd04** → P2718/P2720 |
| Today | White btn fast-ish; black still slow; **~7s dead** between off↔on; app crash if too many presses | **P2721** |

## Root symptoms (lock couples — no invent)
| Couple | Role | Symptom |
|--------|------|---------|
| `_TZ3000_axpdxqgu`+`TS0041` | white / “Moïse” | mostly OK; wants still snappier |
| `_TZ3000_dzwgk7e2`+`TS0042` | black 2-btn | slow; crashes; slows TS0041 when used |
| `_TZ3000_vsxvaj9i`+`TS0043` | black 3-btn | slow; 0–84% battery UI; crashes |

## P2721 fix (BOTH + Bastien)
1. Snappy TSN dedup window **400ms** (was 5s — felt like “attendre 7s”)
2. Snappy Flow: **void** fire heuristic (no await) — Homey queue must not stall press2
3. Snappy report debounce capped ≤80ms

## User
1. Update **Zigbee Bastien** ≥ **1.0.93**
2. Restart app once
3. Rapid toggle same light with TS0041 then TS0042 — both should feel immediate
4. New diag if still ~7s dead

## Backlog (not this tip)
- “Mode history” / click counter (Bastien liked other app) — P2687 interaction ring exists on Universal; optional Bastien UX later
- Solo button still on foreign app — need interview mfr+pid if migrate
