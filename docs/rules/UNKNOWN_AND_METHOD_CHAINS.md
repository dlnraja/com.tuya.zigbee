# Rule (SSOT): unknown commands and method chains (P3016–P3017)

Single source of truth for how the app reads, writes and interprets anything a device does not answer the standard way.

1. **Order per capability** (`lib/zigbee/MethodChain.js`): native ZCL → raw numeric cluster → EF00 DP → Tuya private cluster (E000/E001/E002/ED00) → alternate endpoint → poll → magic/dataQuery 0x03 (EF00 devices only) → derived value. Do not write a new ad-hoc fallback; add a step with a tier name.
2. **Failover**: unsupported (0x81/0x84/0x86/0xC3, see `UnsupportedRegistry.isUnsupportedError`) demotes at once; a timeout demotes after 2 in a row; any other error fails over without demotion.
3. **Re-probe**: demoted methods come back after 15 min, 1 h, 4 h, 12 h, 24 h (cap). Memory is per device (`method_chain_state`, ≤ 60 domains) and the winner is remembered.
4. **Never remove capabilities** from a chain, a guard or the interpreter. Chains only read, request or write.
5. **Write side**: `CapabilityCommandRouter.writeCapabilityWithFallbacks` (ZCL named → raw → EF00 DP). Never race EF00 against ZCL on multi-gang ZCL switches.
6. **Unknown frames/DPs** (`lib/zigbee/UnknownCommandInterpreter.js`): exact couple decoder → couple DP-name catalogue → family decoder → heuristic (≤ 0.4). Exact only with a source (Z2M/ZHA/spec/issue link) and a test with a real sample.
7. **Learning**: per device, bounded. A user-taught mapping (Flow "Teach unknown command") always wins; "Forget unknown command" removes it.
8. **Dedup**: repeated button frames with the same ZCL TSN within 2 s count once.
9. **Startup**: magic packet (`TuyaMagicPacket`), time sync answer 0x24 (`TuyaMcuTimeService`), reporting → polling fallback (`UnifiedSensorBase._setupCapabilityPollingFallback`, uses the chain). Each step is failure-isolated.
10. **Docs**: new decoders go in `docs/knowledge/KB/UNKNOWN_COMMANDS.md`; coverage is regenerated with `node scripts/kb/method-coverage.js`; sources in `docs/knowledge/KB_SOURCES.md`; credits in `CREDITS.md` and `docs/CREDITS.md`. Never invent manufacturer ids; one couple, one driver.
