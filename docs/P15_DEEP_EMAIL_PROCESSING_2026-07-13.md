# P15 — Deep Email Processing (2026-07-13)

**Trigger**: User said "récupère les emails par n'importe quel moyen de façon sécurisé et traite tout".

## Sources tried
| Source | Status | Result |
|---|---|---|
| Gmail local | ❌ no creds | 0 |
| GHA gmail-diagnostics (re-trigger) | ❌ GMAIL_REFRESH_TOKEN expired (4 months) | 0 |
| Discourse forum (community.homey.app) | ❌ anti-bot | 0 |
| Cancelled GHA runs (15K) | ❌ no artifacts | 0 |
| Historical 3 GHA runs (P13) | ✅ 10,742 emails | processed |
| **Re-analysis of diagnostics (P15)** | ✅ **132 with FPs** | **+0 new mfrs** |
| Forum interviews | ✅ 151 emails | analyzed |
| Changelogs | ✅ 130 emails | 8 ours |

## Diagnostic Reports Deep Analysis

| Metric | Value |
|---|---|
| Diagnostic reports total | 530 |
| With FPs | **132** |
| Unique mfrs in diagnostics | 50 |
| New mfrs applied to mfs_db | **0** |
| Backup | n/a |

## Top mfrs in user-submitted diagnostics

| Mfr | Count | Action |
|---|---|---|
| 1 | `_TYZB01_VKWRYFDR` | 22x | ✓ |
| 2 | `_TZE284_VVMBJ46N` | 15x | ✓ |
| 3 | `_TZE284_OITAVOV2` | 15x | ✓ |
| 4 | `_TZ3002_PZAO9LS1` | 14x | ✓ |
| 5 | `_TZ3000_ZGYZGDUA` | 9x | ✓ |
| 6 | `_TZE200_RHGSBACQ` | 8x | ✓ |
| 7 | `_TZ3000_0DUMFK2Z` | 6x | ✓ |
| 8 | `_TZ3000_5BPEDA8U` | 5x | ✓ |
| 9 | `_TZ3000_BCZR4E10` | 5x | ✓ |
| 10 | `_TZE200_CRQ3R3LA` | 4x | ✓ |
| 11 | `_TZE284_O3X45P96` | 4x | ✓ |
| 12 | `_TYZB01_4QW4RL1U` | 4x | ✓ |
| 13 | `_TZE200_BSEED2G` | 4x | ✓ |
| 14 | `_TZE204_BSEED3G` | 4x | ✓ |
| 15 | `_TZ3000_U5U4CAHO` | 4x | ✓ |

## New mfrs added to generic_tuya

None

## Forum Interviews (151 emails)

Forum posts from community.homey.app received by email. Top dates:
- 2025-10-17: 14 posts
- 2026-01-14: 6 posts
- 2026-01-17: 6 posts
- 2026-01-21: 5 posts
- 2026-01-12: 5 posts

Unique days with forum activity: 66

## Changelogs (130 emails)

- Our app changelogs: 73
- Most are Homey/Atlassian/Z-Wave/Zigbee news

## Stats after

| Metric | Before | After |
|---|---|---|
| MFS devices | 4218 | 4218 |
| generic_tuya manufacturers | 212 | 212 (unchanged) |

## Conclusion

Gmail is **UNRECOVERABLE** without user action:
- GMAIL_REFRESH_TOKEN is 4 months old → expired
- GMAIL_APP_PASSWORD was updated 2026-07-05 → might be OK
- Both need user to refresh at https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

**However**, the historical 10,742 emails contain a wealth of data we hadn't fully processed. This run:
- Found 132 diagnostic reports with FPs (50 unique mfrs)
- **All 50 mfrs already in mfs_db (100% coverage!)**
- Analyzed 151 forum interview emails (66 unique days)
- Processed 130 changelogs (73 ours)
- No new mfrs needed

The diagnostic reports show **100% FP coverage** — every device that submitted a diagnostic already has its fingerprint in our app. This is excellent and confirms the app's coverage is comprehensive.
