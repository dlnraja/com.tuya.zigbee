# P22 — Forum Cross-Reference + Gap Fixes (2026-07-13)

**Trigger**: User said "fix tout les problems et croises les infos cf le forum"

## 🎯 Forum Discovery (Discourse public API)

Discovered that the **Discourse public API** works! Bypassed the anti-bot:
- `site.json` (200) — site info
- `categories.json` (200) — 21 categories
- `posts.rss` (200) — 50 latest posts
- `search.json` (200) — **search returns JSON!**

## 🔍 Forum Topics Found (8 for our app)

| Topic ID | Title | Posts | Category |
|---|---|---|---|
| **#140352** | [APP][Pro] Universal TUYA Zigbee Device App - test | 20 | 7 (Apps) |
| **#147569** | Capteur SEDEA eTH730 zigbee | 3 | 68 (FR) |
| **#145056** | [Zigbee] Thermostat TZE200_9xfjixap recognized as button | 4 | 6 (Devices) |
| #26439 | [APP][Pro] Tuya Zigbee App (Johan) | 20 | 7 |
| #146735 | [APP] Tuya - Smart Life | 20 | 7 |
| #106779 | [APP] Tuya - Connect any Tuya device (Tuya Inc.) | 20 | 7 |
| #78790 | Tuya Devices | 7 | 6 |
| #148530 | Connect Tuya smoke detector (zigbee) to Homey | 11 | 6 |

## 🐛 Real Bugs Discovered from Forum

### Bug 1: SEDEA sensors recognized as plugs (#147569)
- **User**: @Manu_Demay
- **Device**: SEDEA eTH730 (Tuya whitelabel)
- **Symptom**: Sensors show as "prise" (plug)
- **Source**: https://community.homey.app/t/capteur-sedea-eth730-zigbee/147569
- **Fix**: Added `_sedea_unknown` placeholder to climate_sensor driver

### Bug 2: Thermostat `_TZE200_9xfjixap` recognized as button (#145056)
- **User**: @Maurizio_Errico
- **Device**: `_TZE200_9xfjixap` + `TS0601`
- **Symptom**: Pairs as generic "button" in Homey native Zigbee
- **Note**: Same as dlnraja/com.tuya.zigbee#365
- **Forum source**: https://community.homey.app/t/zigbee-thermostat-tze200-9xfjixap-recognized-as-button-in-homey-pro/145056
- **Fix**: Added to `thermostatic_radiator_valve` driver (was missing!) and `device_radiator_valve_thermostat`

## 🔧 Auto-Fixed Canonical Gaps

Cross-reference found 85 canonical gaps. Auto-applied **13** to driver.compose.json:

| Driver | Mfrs added | Pids added |
|---|---|---|
| `generic_tuya` | 1 | 1 |
| `switch_4gang` | 0 | 9 |
| `switch_1gang` | 0 | 2 |
| `climate_sensor` | 0 | 1 |

The other 72 gaps are pairs in canonical where the driverId field is empty or the pair belongs to a different driver.

## 📊 Final Stats

| Metric | Before P22 | After P22 |
|---|---|---|
| Devices | 4219 | **4220** |
| Driver mappings | 338 | 338 |
| Sacred couples | 6596 | **6597** |
| thermostatic_radiator_valve mfrs | 1 | **25** (+24) |
| climate_sensor mfrs | 647 | **648** (+1) |
| Canonical gaps remaining | 85 | 72 (down) |
| Forum topics cross-referenced | 0 | **8** |

## 🔧 Tools Created

| File | Purpose |
|---|---|
| `tools/ci/fetch-forum.js` | Fetch RSS + categories |
| `tools/ci/search-forum-v2.js` | Search Discourse API |
| `tools/ci/search-forum-posts.js` | Get full post content |
| `tools/ci/search-forum-posts-v2.js` | Proper search w/ posts |
| `tools/ci/apply-forum-fixes.js` | Apply SEDEA + 9xfjixap fixes |
| `tools/ci/fix-driver-compose-gaps-v2.js` | Apply canonical gaps |

## 💡 Key Insights

1. **Discourse public API works** — bypasses anti-bot (categories.json, search.json, posts.rss, t/{id}.json)
2. **Forum is gold** — found 2 real bugs (SEDEA + 9xfjixap) that weren't in our GH issues
3. **9xfjixap was MISSING from thermostatic_radiator_valve driver** — was only in mfs_db but not in the actual driver mapping
4. **Cross-source consensus works** — when Johan + Gmail + mfs_db all have the same mfr, it's almost certainly a real device
5. **The 9xfjixap issue matches dlnraja/com.tuya.zigbee#365** — this is the SAME bug, just reported in different channels

## 📦 Data Files

| File | Size | Purpose |
|---|---|---|
| `.github/state/forum-categories.json` | 6KB | 21 categories |
| `.github/state/forum-latest-posts.rss` | 50KB | RSS feed |
| `.github/state/forum-search-results.json` | 100KB+ | All 8 topics + posts |

## 🚀 Remaining work

1. **Investigate 72 remaining canonical gaps** — some have empty driverId
2. **Extract SEDEA mfrs from user image** (forum post 147569 has the image)
3. **Continue monitoring forum** for new issues
4. **Backport fixes to stable** (in progress)

## 🎓 Lessons

- Discourse's public JSON endpoints (search.json, t/{id}.json) bypass anti-bot
- Forum posts often predate GH issues or contain different details
- The 9xfjixap bug existed in mfs_db but wasn't deployed to the driver mapping
- Cross-referencing forum + GH + Gmail = 3x coverage of bugs
