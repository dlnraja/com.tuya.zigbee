# Grok Bot → Cursor continuation (2026-08-22)

Imported from `AppData/Roaming/Grok Bot` (sanitized) + `Documents/homey/*.md` handoffs.
**No secrets. No forum posts. No CloudAgent.**

## Robots / sessions mapped

| Grok thread theme | Status in this Cursor session |
|-------------------|-------------------------------|
| Silent forum 140352 #2189/#2190 | Done — highest still **#2190**; couple rule honored |
| meter91 `zgyzgdua`+TS0044 0xFD / EP1–4 | **Shipped** master Test ≥9.0.619 (`scene_switch_4`) — user must update+re-pair |
| Peter IAS leftover EF00 / zoneStatus | **Shipped** (`shouldSkipIasOnlyEf00Tx`, coerce, `_ensureIasBound`) |
| Stable id `.stable` | **Done** `com.dlnraja.tuya.zigbee.stable` / Tuya Unified |
| Stable k4ej IAS 1280 | **Done** (+ drop mfr-as-pid) |
| Stable Publish Athom | Draft **#13** `processing_failed` — P139 **fail-closed** (run 32532163896). Need **new version** draft, not spam #13 |
| PulseAutomix / AscendOS | Out of Homey scope this pass — noted only |
| multi-silent-new-fps pollution | **Refuse** invent locks |

## Continue here (Homey only)

1. Master Auto-Publish of docs/9.0.621 → watch → sync tip
2. Stable: bump **5.12.89** once → push → Publish `.stable` (fresh build, not retry #13)
3. Keep forum silent; meter91/Peter = update Test + re-pair
4. Do not lock FP from polluted scanner dumps

## Files

- `reports/grok-bot-import/extract-*.md` — user prompts from Grok
- `FROM_THE_BEGINNING.md`, `NEXT_PATCHES.md`, `FORUM_LATEST_2190.md`, …
- Importer: `tools/ci/import-grok-bot-prompts.js`
