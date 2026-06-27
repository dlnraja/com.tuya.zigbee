# 📅 CHRONOLOGICAL EVOLUTION — Tuya Unified Zigbee

> **Dernière mise à jour**: 2026-06-26 17:30 UTC+2
> **Couverture**: Février 2026 → Juin 2026 (4 mois d'évolution)

---

## TIMELINE COMPLÈTE

### FÉVRIER 2026 — Genèse v5.11.x

| Date | Version | Événement | Impact |
|------|---------|-----------|--------|
| 2026-02-12 | v5.11.9 | Premières versions stables | 228 drivers Zigbee |
| 2026-02-xx | v5.11.x | Classes monolithiques ("Fat Classes") | Architecture initiale |

**Caractéristiques**:
- SDK2 → SDK3 transition
- Classes monolithiques (pas de mixins)
- ~200 drivers Zigbee
- Protocole Tuya EF00 basique

---

### MARS 2026 — Croissance v5.11.x

| Date | Version | Événement | Impact |
|------|---------|-----------|--------|
| 2026-03-xx | v5.11.100+ | Enrichissement fingerprints | +500 FPs |
| 2026-03-xx | v5.11.150+ | Ajout de drivers | 228 drivers stabilisés |

**Bugs connus**:
- Battery halving (pas encore identifié)
- Pas de PhysicalButtonMixin
- triggerCapabilityListener dans tous les drivers

---

### AVRIL 2026 — Migration SDK3 (v7.x)

| Date | Version | Événement | Impact |
|------|---------|-----------|--------|
| 2026-04-xx | v7.0.1 | Début migration SDK3 | Refonte majeure |
| 2026-04-xx | v7.4.7-8 | SDK3 clusters | Custom clusters |
| 2026-04-xx | v7.5.10+ | Mixins introduction | PhysicalButtonMixin, VirtualButtonMixin |
| 2026-04-29 | v5.11.209 | Dernière v5.11.x | Stable-v5 freeze |

**Changements architecturaux**:
- Introduction des mixins (PhysicalButton, VirtualButton, MultiGang)
- Séparation des classes de base (UnifiedSwitchBase, UnifiedSensorBase, etc.)
- Pipeline Zigbee 11 couches (L0-L11)
- TuyaZigbeeDevice comme classe de base

**Bugs découverts**:
- Mixin order: PhysicalButtonMixin doit wrapper VirtualButtonMixin
- Import paths: `../../lib/tuya/TuyaZigbeeDevice` (pas `../../lib/TuyaZigbeeDevice`)

---

### MAI 2026 — Phoenix & Hardening (v8.x)

| Date | Version | Événement | Impact |
|------|---------|-----------|--------|
| 2026-05-14 | v5.13.6 | Version intermédiaire | |
| 2026-05-17 | Merge | master → stable-v5 | Sync majeur |
| 2026-05-24 | v8.1.1 | Début v8.1.x | Hardening |
| 2026-05-25 | v8.1.12 | Fixes critiques | triggerRecovery, TDZ risks |
| 2026-05-25 | v8.1.20+ | Pipeline 11 couches | L0-L11 complet |
| 2026-05-28 | v8.5.47-54 | Phoenix consolidation | 18 bugs fixés |
| 2026-05-28 | v9.0.0 | **Début de l'ère v9** | Sovereign |

**Bugs critiques fixés (mai 2026)**:
| Date | Bug | Root Cause | Fix |
|------|-----|------------|-----|
| 2026-05-24 | Rain sensor DP mappings (Issue #326) | Mauvais DP IDs | Fix DP mappings |
| 2026-05-24 | triggerRecovery crash | Prototype mismatch | DataRecoveryManager fix |
| 2026-05-24 | Diagnostic issues #332, #331, #326, #325, #323 | Divers | Batch fix |
| 2026-05-25 | Flow cards Issue #170 | IDs invalides | Fix flow card IDs |
| 2026-05-25 | Missing fingerprints #171, #165 | Enrichment manquant | Add fingerprints |
| 2026-05-25 | getDeviceTriggerCard crash | Override syntax | Correction syntaxe |
| 2026-05-25 | DeviceIdentificationDatabase crash | Non crash-proof | Add guards |
| 2026-05-25 | TDZ risks (Temporal Dead Zone) | Circular imports | Resolve circular refs |
| 2026-05-25 | Bypass raw brand checks | Non compliant | Fix brand checks |
| 2026-05-27 | DeviceFingerprintDB OOM | UTF-16 string loading | Buffer-based lazy loader |

**Évolutions de documentation (mai 2026)**:
- AI_CONTEXT_MANDATE.md créé
- GLOBAL_INVESTIGATION_PLAN.md créé
- ARCHITECTURE_AI.md créé
- CORE_RULES.md créé (v1.0)
- TITAN Protocol initialisé

---

### JUIN 2026 — Sovereign & Consolidation (v9.0.x)

#### Semaine 1 (1-7 juin) — Stabilisation initiale

| Date | Version | Événement | Impact |
|------|---------|-----------|--------|
| 2026-06-02 | stable-v5 | Bidirectional sync part 1 | Backport critical fixes |
| 2026-06-02 | stable-v5 | Bidirectional sync part 1.5 | Module path fixes |

#### Semaine 2 (8-14 juin) — Enrichissement

| Date | Version | Événement | Impact |
|------|---------|-----------|--------|
| 2026-06-13 | v9.0.0 | Initial v9 release | 420+ drivers |
| 2026-06-16 | v9.0.39 | 420 drivers, 2403 FPs | Enrichissement |
| 2026-06-16 | v9.0.40 | Fixes forum #2091 #5472 | Community fixes |

#### Semaine 3 (15-21 juin) — TITAN V5

| Date | Version | Événement | Impact |
|------|---------|-----------|--------|
| 2026-06-18 | v9.0.40+ | Changelog sync | README update |
| 2026-06-20 | stable-v5 | **10 critical fixes** | Buttons, flow cards, battery |
| 2026-06-21 | v9.0.53 | **TITAN V5 GOD-MODE** | 430 drivers, 0 violations |
| 2026-06-21 | v9.0.54-62 | **12 CI/CD fixes** | Publish pipeline |
| 2026-06-21 | stable-v5 | **12 critical fixes** | SDK, buttons, capability listeners |

**Bugs critiques fixés (20-21 juin)**:

| Date | Branche | Bug | Root Cause | Fix |
|------|---------|-----|------------|-----|
| 2026-06-20 | stable | Invalid _hybrid_ flow card IDs | Stale IDs | Replace with correct IDs |
| 2026-06-20 | stable | DP double-processing | Processing twice | Skip duplicate |
| 2026-06-20 | stable | smart_knob_rotary crash | 'Class extends value #' | Fix import chain |
| 2026-06-21 | stable | buttons missing capability listener | super.on() bug | Fix super.on() |
| 2026-06-21 | stable | buttons broken - setInterval fallback | this.homey unavailable | Fallback fix |
| 2026-06-21 | stable | Missing Capability Listener button.X | 28 buttons sans listener | Add setable:false |
| 2026-06-21 | stable | NFKD Unicode normalization | CaseInsensitiveMatcher | Add NFKD |
| 2026-06-21 | stable | sdkVersion empty | Processing failed | Fix sdkVersion |
| 2026-06-21 | stable | HOBEIAN missing from app.json | Device not recognized | Add to compiled |
| 2026-06-21 | stable | _safeSetCapability undefined | ButtonDevice chain | Fix chain |
| 2026-06-21 | master | punycode + imap/mailparser | Publish fix | Move to devDeps |
| 2026-06-21 | master | package-lock.json | ELSPROBLEMS | Regenerate |
| 2026-06-21 | master | .sdk → .sdkVersion | Invalid SDK | Fix field name |
| 2026-06-21 | master | Athom action git commit error | Syntax error | Custom publish |
| 2026-06-21 | master | build step missing | sdk=undefined | Add build step |

#### Semaine 4 (22-26 juin) — Consolidation massive

| Date | Version | Événement | Impact |
|------|---------|-----------|--------|
| 2026-06-22 | v9.0.63-74 | **12 fixes CI/CD** | Publish pipeline |
| 2026-06-22 | v9.0.67 | Community sync: 1442 new FPs | Z2M/ZHA enrichment |
| 2026-06-22 | v9.0.70 | CrashPrevention | safeSet on ALL base classes |
| 2026-06-23 | v9.0.75-84 | **10 fixes CI/CD** | Workflows réparés |
| 2026-06-23 | v9.0.76 | **10 critical root causes** | Battery, buttons, dedup |
| 2026-06-23 | v9.0.77 | **4 critical layer bugs** | Infinite recursion, scope |
| 2026-06-24 | v9.0.85-94 | **10 fixes critiques** | Battery, buttons, coherence |
| 2026-06-24 | v9.0.95-96 | **PhysicalButtonMixin** | 24 drivers |
| 2026-06-25 | v9.0.97-105 | **8 fixes boutons** | triggerCapabilityListener |
| 2026-06-26 | v9.0.106-115 | **10 fixes fingerprints** | Dedup, MFRs, AggregateError |

**Bugs critiques fixés (22-26 juin)**:

| Date | Version | Bug | Root Cause | Fix |
|------|---------|-----|------------|-----|
| 2026-06-22 | v9.0.68 | 'sdk' field conflict | SDK3 = sdkVersion | Remove 'sdk' |
| 2026-06-22 | v9.0.70 | CrashPrevention missing | Base classes sans guard | Add safeSet |
| 2026-06-22 | v9.0.71 | Validation scripts wrong | sdk→sdkVersion | Fix 4 scripts |
| 2026-06-22 | v9.0.72 | button.X setable!=false | Wrong property | Fix to false |
| 2026-06-23 | v9.0.75 | Empty manufacturerName | Generic templates | Add placeholder |
| 2026-06-23 | v9.0.76 | **Battery halving** | Math.round/2 sans sentinel | _safeBatteryPercent |
| 2026-06-23 | v9.0.76 | **Linear battery formula** | (voltage-2.5)/0.5 | Non-linear curves |
| 2026-06-23 | v9.0.76 | **Dedup dead code** | Code inutile | Remove |
| 2026-06-23 | v9.0.77 | **Infinite recursion** | Protocole handler | Depth guard |
| 2026-06-23 | v9.0.77 | **Scope error** | Variable scope | Fix scope |
| 2026-06-23 | v9.0.77 | **Missing _destroyed** | Async callbacks | Add guard |
| 2026-06-23 | v9.0.77 | **SDK guard missing** | this.homey access | Add guard |
| 2026-06-23 | v9.0.78 | Presence debounce | Missing method | Add method |
| 2026-06-23 | v9.0.78 | Plug DP handler dead code | Code mort | Remove |
| 2026-06-23 | v9.0.79 | 5 Zigbee protocol gaps | Crash fixes | Fix protocols |
| 2026-06-23 | v9.0.80 | Broken imports | 6 categories | Fix imports |
| 2026-06-24 | v9.0.85 | JSDoc false positive | CI false positive | Fix check |
| 2026-06-24 | v9.0.85 | HOBEIAN collision | Fingerprint conflict | Fix collision |
| 2026-06-24 | v9.0.86 | **Ternary crash** | Battery code | Fix ternary |
| 2026-06-24 | v9.0.86 | **200% sentinel** | ZCL 200=not available | Filter sentinel |
| 2026-06-24 | v9.0.86 | **Z2M cross-ref** | Wrong reference | Fix reference |
| 2026-06-24 | v9.0.88 | Battery heuristic | Voltage fallback | Add heuristic |
| 2026-06-24 | v9.0.88 | Button anti-broadcast | Dedup missing | Add dedup |
| 2026-06-24 | v9.0.89 | Self-Healing engine | Z2M quirks | Add engine |
| 2026-06-24 | v9.0.90 | Universal Zigbee Engine | Multi-endpoint | Add engine |
| 2026-06-24 | v9.0.91 | Energy safeSet missing | Unsafe set | Add safeSet |
| 2026-06-24 | v9.0.92 | Battery sentinel filtering | Missing filter | Add filter |
| 2026-06-24 | v9.0.92 | Duplicate listeners | Multiple registration | Dedup |
| 2026-06-24 | v9.0.93 | SanityFilter L11 | EMA + ROC | Add filter |
| 2026-06-24 | v9.0.94 | TSO121 typo | Driver name | Fix typo |
| 2026-06-24 | v9.0.94 | q9mpfhw garbage | Invalid data | Clean data |
| 2026-06-24 | v9.0.94 | setTimeout guard | Missing guard | Add guard |
| 2026-06-24 | v9.0.94 | unsafe setCapability | Banned pattern | Replace |
| 2026-06-24 | v9.0.95 | PhysicalButtonMixin | 24 drivers | Add mixin |
| 2026-06-24 | v9.0.96 | Physical/virtual decoupling | Echo loop | safeSet everywhere |
| 2026-06-25 | v9.0.100 | Publish to Homey | yes pipe fix | Fix publish |
| 2026-06-25 | v9.0.101 | APP_ID match | Puppeteer fix | Exact match |
| 2026-06-25 | v9.0.103 | **triggerCapabilityListener** | Echo loop | Replace ALL |
| 2026-06-25 | v9.0.104 | smart_knob_rotary crash | Dispatch fix | Fix dispatch |
| 2026-06-26 | v9.0.106 | 2926 duplicates | manufacturerName | Remove dupes |
| 2026-06-26 | v9.0.107 | Case-insensitive dedup | 547 entries | Dedup |
| 2026-06-26 | v9.0.109 | Array deduplication | Independent arrays | Fix dedup |
| 2026-06-26 | v9.0.111 | **AggregateError** | Empty productId | Remove empty |
| 2026-06-26 | v9.0.112 | toLowerCase manual | CaseInsensitiveMatcher | Replace |
| 2026-06-26 | v9.0.113 | Radar misclassification | Wrong driver | Move driver |
| 2026-06-26 | v9.0.114 | 15 missing MFRs | Radar sensor | Add MFRs |
| 2026-06-26 | v9.0.115 | **686 missing MFRs** | device.js → compose | Add MFRs |

---

## STATISTIQUES CUMULÉES

### Par catégorie de bug

| Catégorie | Nombre | % |
|-----------|--------|---|
| **Fingerprints/MFRs** | 15 | 22% |
| **CI/CD Pipeline** | 14 | 21% |
| **Battery** | 8 | 12% |
| **Buttons** | 8 | 12% |
| **Crash fixes** | 7 | 10% |
| **Flow cards** | 4 | 6% |
| **SDK/Config** | 4 | 6% |
| **Import/Code** | 3 | 4% |
| **Other** | 5 | 7% |
| **TOTAL** | **68** | 100% |

### Par sévérité

| Sévérité | Nombre | % |
|----------|--------|---|
| 🔴 Critique | 18 | 26% |
| 🟠 Haute | 22 | 32% |
| 🟡 Moyenne | 20 | 29% |
| 🟢 Basse | 8 | 12% |
| **TOTAL** | **68** | 100% |

### Par branche

| Branche | Fixes | Exclusifs |
|---------|-------|-----------|
| master | 55 | 42 |
| stable-v5 | 26 | 13 |
| Les deux | 13 | — |

---

## PATTERNS DE RÉGRESSION IDENTIFIÉS

### Pattern 1: Fingerprints/MFRs (22% des bugs)
- **Cause**: Enrichissement automatique laissant des tableaux vides
- **Fréquence**: 15 occurrences en 4 jours (22-26 juin)
- **Solution**: Guard dans prepare-publish + filtre des tableaux vides

### Pattern 2: CI/CD Pipeline (21% des bugs)
- **Cause**: Actions GitHub fragiles (SHAs, shell, permissions)
- **Fréquence**: 14 occurrences en 4 jours (21-24 juin)
- **Solution**: Standardisation (@v5/@v4 tags, bash shell, explicit permissions)

### Pattern 3: Battery (12% des bugs)
- **Cause**: Formules linéaires + sentinelles ZCL non filtrées
- **Fréquence**: 8 occurrences en 2 jours (23-24 juin)
- **Solution**: _safeBatteryPercent() + 18 courbes non-linéaires

### Pattern 4: Buttons (12% des bugs)
- **Cause**: triggerCapabilityListener créant des echo loops
- **Fréquence**: 8 occurrences en 3 jours (24-26 juin)
- **Solution**: safeSetCapabilityValue + PhysicalButtonMixin

---

*Document généré automatiquement — 26 juin 2026*
