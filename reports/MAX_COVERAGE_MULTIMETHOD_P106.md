# P106 — Max-coverage multi-method I/O enrichment (2026-08-11)

## Motive

User mandate: cover max cases/specificities with max alternative methods; study
reports, bug lists, docs, and code comments. Grounded in:

- `reports/HISTORICAL_ARCHAEOLOGY_ENRICH_P105.md` (deferred IAS / bare IO)
- `reports/VERSION_ERA_ENRICHMENT_2026-08-11.md` (magic / quirk / interview)
- `data/protocol_quirk_table.json` (init sequences + exotic clusters)
- `docs/PROTOCOLS_NON_STANDARD.md` (MCU query / time / raw DP)
- Crash lessons: interview-miss EF00, configureReporting ignored, IAS multi-ep
- `IEEEAdvancedEnrollment` comments (reEnroll / proactive / normal mode)

## Applied (bases only — no 430× paste)

### DeviceIOFacade multi-path

| API | Paths now |
|-----|-----------|
| `requestDP` | EF00 mgr → cluster dataQuery/command/getData/raw → magic+retry → ensure+retry → passive |
| `queryAllDPs` | EF00 aliases → MagicPacketRegistry/MCUVersionHelper → cluster/raw 0x03 → magic+ensure → passive |
| `readZcl` | multi-ep resolve + compensation aliases → readAttributes → raw Read Attrs frame |
| `writeZcl` | multi-ep → writeAttributes → writeRaw poke → stub+retry |
| `configureReporting` | multi-ep → on fail arm poll fallback |
| `bindCluster` | multi-ep bind → endpoint.bind alternate |
| `sendRaw` | ep 1/2/0 × sendFrame(args|object) × cluster.sendFrame × writeRaw |
| `ensureIasEnrolled` | fullFlow → CIE+proactive → reEnroll → normalMode → poll → listener-armed soft OK |

### ProtocolFallbackChain

New TX steps: `cluster_command`, `mcu_version_helper`  
New RX step: `cluster_data_query`  
Quirk table `fallbackOrder` synced.

### MagicPacketRegistry specificity

Added: `TS004F_HYBRID`, `ENERGY_PLUG` (TS011F/TS0121), `COVER_TS130F`, `TZE_MCU_GENERIC`  
(still specific-before-general ordering).

### HomeyCompensationLayer quirk guidance

- Case-insensitive mfr quirk lookup
- Sequences: `e001_external_switch_read`, `ts004f_scene_mode`
- Auto-select by pid families (TS004F, TS000x, energy, cover, IAS, TZE)

## Deferred

- Mass bare-ZigBeeDevice allowlist reduction (incremental)
- Per-driver `_setGangOnOff` from old prioritized_fixes (elevated via UnifiedSwitchBase where already inherited)
- Stable-v5 reliability backport after Test clean

## Version

master → **9.0.460**
