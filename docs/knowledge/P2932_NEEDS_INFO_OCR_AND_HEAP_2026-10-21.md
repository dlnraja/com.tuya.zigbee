# P2932 — needs-info OCR pass, Aqara RTCGQ13LM, startup heap (21/10/2026)

## OCR pass over the needs-info items (367 items)
- Tooling: the project's tesseract path (`scripts/scanners/issue-image-ocr.js` extract), run per item. Added preprocessing: grayscale, inverted dark themes, 2-3x upscale, psm 6 + 11. Tolerant id matching catches the usual OCR slips (`1Z3000`→`_TZ3000`, l/1/i).
- No AI vision key is configured on the box, so the optional AI pass was not run. Instead, 47 screenshots that show identity fields were checked by eye on contact sheets.
- Yield: 79 of 367 items have images, the rest are diagnostics-report ids only (not readable from here). 10 items are now resolved, all already covered by an existing driver, among them 3 where the OCR read the id wrong and the right one was confirmed on the web (deCONZ PR #7051 `_TZE204_sxm7l9xa`, Z2M #20977 `_TZE200_icka1clh`). 1 new lead (Aqara DJT11LM).
- Lesson: tesseract misses small light-grey values in Homey's settings screens (e.g. `_TZ3000_wkai4ga5`). A cropped, upscaled image works; a visual check is the reliable fallback.

## Aqara RTCGQ13LM (P2929)
LUMI × lumi.motion.agl04 is on motion_sensor. ep1 now declares 0 and 1030, and UnifiedSensorBase maps occupancySensing.occupancy to alarm_motion natively. Pinned. LUMI|TS0601 (shared with device_generic_tuya_universal) is a reviewed dual that is only theoretical.

## Startup heap (P2931): 29.0 → 25.8 MB
- `lib/utils/lazyRequire.js` returns a stand-in that loads the module on first new, call, property read or instanceof. Optional modules stay null when the file is missing.
- Applied only where the module is used inside methods: EF00 manager, battery router/handler in fusion hooks, IO protocol and cluster helpers, SmartLife auth / cloud API / local client, SmartDriverAdaptation, DataRecoveryManager, the radar config tables, BatteryMasterEngine, TuyaCameraClient.
- Not applied to anything that is extended, or used at module scope: DiagnosticLogsCollector mixin, DeviceFusionHooks prototype patch.
- ButtonEventRouter was already off the startup path.
- Real devices still load these modules on first use. The saving is for installs that never use a path (no WiFi, no EF00, no radar), and it frees margin under the 30 MB CI budget.
