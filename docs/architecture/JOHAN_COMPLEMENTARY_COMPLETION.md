# Johan Bendz complementary completion (P2570)

Johan announced stepping back from [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) maintenance. This app **does not replace** his store listing — we **silently complete** useful fingerprints / DP libraries / case variants as **complementary enrichments** (P2520).

## Rules

| Do | Don’t |
|----|-------|
| Read-only dump (`tools/ci/johan-dump.js`) | Write/comment on Johan repo |
| Union mfr case forms + OEM TZE200/204/284 siblings | Wipe or shrink compose arrays |
| Resolve `(mfr,pid)` via registry / existing compose / mfs | Invent pid or TS0601→`generic_tuya` |
| Keep `TuyaDataPointsJohan` / `TuyaHelpersJohan` | Forum auto-reply about handover |
| BOTH reliability FP locks → stable backport | Copy App ID / wholesale trees |

## Commands

```bash
node tools/ci/johan-dump.js --incremental
node tools/ci/p2570-johan-complementary-enrich.js          # dry-run
node tools/ci/p2570-johan-complementary-enrich.js --apply
npm run check:p2570
npm run check:p2520
```

## Runtime already retained from Johan

- `lib/tuya/TuyaDataPointsJohan.js` — versioned DP maps (thermostat/TRV/curtain/…)
- `lib/tuya/TuyaHelpersJohan.js` — schedule/helpers

## Attribution

Public changelogs/commits: generic wording only (“improved device coverage”). Never “from JohanBendz” in forum posts (T157628 + attribution rules).
