# Project rules & decisions

Core rules (summary in our words):
- Exact manufacturerName+productId, one couple one driver; a specific driver wins, generic stays fallback.
- One reliable source is enough; never invent; record the source. Unconfirmed → provisional tier (data/leads/provisional-couples.json).
- Native clusters are mandatory for pairing; Tuya EF00 and others stay optional.
- Additive only; nothing that works is removed. Versions strictly incremental and aligned across branches.
- No copy-paste from other projects: rewrite, credit with id, link and author.
- No --no-verify, no force-push, no history rewrite. Every fix ships with unit tests.

Full texts (SSOT):
- [Bastien House App — private Zigbee track (P2606)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/BASTIEN_HOUSE_APP.md)
- [🧬 BYPASS ELITE LAYERS & NATIVE SDK3 MIGRATION ARCHITECTURE](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/BYPASS_ELITE_LAYERS.md)
- [Complementary variant enrich — ALWAYS (P2520)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/COMPLEMENTARY_VARIANT_ENRICH.md)
- [Couple source policy (SSOT)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/COUPLE_SOURCE_POLICY.md)
- [CRITICAL MISTAKES - Never Repeat (v8.5.0 Phoenix Sovereign + Fleetwood Gateway)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/CRITICAL_MISTAKES.md)
- [Cross-App Prompt Rules](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/CROSS_APP_PROMPT_RULES.md)
- [Deep functional enrich (P2529)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/DEEP_FUNCTIONAL_ENRICH.md)
- [Development Rules - Tuya Unified Zigbee](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/DEVELOPMENT_RULES.md)
- [Diagnostic History Rules](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/DIAGNOSTIC_HISTORY_RULES.md)
- [Dual-App Vision — master vs stable-v5 (+ Bastien house)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/DUAL_APP_VISION.md)
- [Five couples listed in two drivers (PC harvest round 2, item 3)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/DUAL_COUPLES_PCR2_2026-10-04.md)
- [Rules for Dynamic Healing & Identification (v1.0.0)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/DYNAMIC_HEALING.md)
- [Ambiguous IAS identities: one mfr/model, several physical products (JohanBendz #1113 deep read)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/JOHAN_1113_AMBIGUOUS_IAS_IDENTITY.md)
- [Contact + illuminance door sensors (JohanBendz #1298 deep read)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/JOHAN_1298_CONTACT_LUX.md)
- [KNOWLEDGE BASE & AI HEURISTICS (Local BDD)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/KNOWLEDGE_BASE.md)
- [NEXUS ULTIMATE MANIFESTO (v7.2.14)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/NEXUS_ULTIMATE_MANIFESTO.md)
- [🚀 OPUS 4.6 MEGA-PROMPT — Universal Tuya Maintenance Framework](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/OPUS_4_6_MEGA_PROMPT.md)
- [PC harvest r2, item 1: missing devices (per couple)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/PCR2_MISSING_DEVICES_2026-10-04.md)
- [Post-Promotion Documentation & Registry Synchronization (MANDATORY)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/POST_PROMOTION_PROTOCOL.md)
- [R22 architecture sources (spec 010 / T0)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/R22_ARCHITECTURE_SOURCES.md)
- [🔐 Security Rules v8.5.0](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/SECURITY_RULES.md)
- [Session Stability & Heuristic Rules Specification](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/SESSION_STABILITY_SUMMARY.md)
- [The "56 Years Ago" Bug and Tuya Sleepy Devices](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/SLEEPY_TUYA_56_YEARS_BUG.md)
- [Unit-test anti-régression (P2469)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/UNIT_TEST_ANTI_REGRESSION.md)
- [Rule (SSOT): unknown commands and method chains (P3016–P3017)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/UNKNOWN_AND_METHOD_CHAINS.md)
- [Unsupported Devices & Categories](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/UNSUPPORTED_DEVICES.md)
- [User Device Expectations — Tuya Unified Zigbee](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/USER_DEVICE_EXPECTATIONS.md)
- [W5 interview vs driver clusters (PCr2-2, 2026-10-04)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/W5_INTERVIEW_CLUSTER_AUDIT_2026-10-04.md)
- [WHY interrogation doctrine (P215)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/WHY_INTERROGATION.md)
- [WiFi vs Zigbee Separation Standard & Architectural Guidelines](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/WIFI_VS_ZIGBEE_STANDARD.md)
- [Zigbee2MQTT / ZHA to Homey Capability Mapping Dictionary](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/Z2M_ZHA_TO_HOMEY_MAP.md)
- [ZIGBEE_TUYA_RULES.md — Tuya Zigbee Protocol Reference](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/rules/ZIGBEE_TUYA_RULES.md)
