# 📚 Référence Définitive : Évolution Complète des Boutons, Batterie et Architecture

> Basé sur l'analyse forensique de **CHAQUE push/commit** depuis le début du projet (8729 commits × 16 branches).
> Croisé avec GitHub issues, PRs, et forum Homey (thread 140352).

---

## 🕰️ Timeline Définitive des Points de Rupture

### Phase 1 : Stabilité Initiale (avril-mai 2026)
```
2026-04-17  Unified _getFlowCard → fix TypeError crashes (Issue #312)
2026-04-21  v7.4.9 Unified Engine → syntax purity + lifecycle cleanup
2026-05-14  v8.0.0 Zero-Defect → standardize button flow cards
2026-05-17  Runtime integrity restore → syntax errors fixed
2026-05-20  v8.1.0 hardening battery & button mixins
2026-05-23  44c9dc887 : ★ DERMIÈRE VERSION BATTERIE+BOUTONS OK ★
            - Fix Tuya DP battery initialization
            - Resolve Button TriggerCard crashes
            - Map 45 unsupported fingerprints from forum logs
            - PhysicalButtonMixin : 2 this.homey.set* (context-safe)
            - ButtonDevice : _registerButtonCapabilityListeners présent
2026-05-24  Paroxysm auto-healing (wifi + zigbee)
```

### Phase 2 : Régressions Introduites (juin 2026)
```
2026-06-07  e571ece87 : ⚠️ RÉGRESSION TIMERS
            "CRITICAL architecture bugs — await-without-async + timer leaks"
            INTRODUIT this.homey.set* dans des contextes où this.homey = undefined
            → appCommandPending bloqué TRUE → boutons physiques non détectés

2026-06-08  7326a2d24 : ⚠️ RÉGRESSION MEMORY LEAK
            "Bidirectional button system — memory leak + flow cards"
            Listeners .on() sans cleanup → phantom updates vers devices morts

2026-06-08  e55adffbb : Fix hold release + duplicate listeners
            Partiellement compensé mais pas le timer fallback

2026-06-14  21cceeb3a : Smart features + SOS fix + cluster binding
            Enrichissement mais ne corrige pas le timer fallback

2026-06-16  53688db3d : "comprehensive button evolution + stable-v5 port"
            Porte le PhysicalButtonMixin de stable-v5 mais AVEC les timers cassés

2026-06-18  53234799d : ⚠️ TITAN V5 GOD-MODE — RÉGRESSION MAJEURE
            "0 violations, 170+ sources analyzed"
            SUPPRIME setupButtonDetection + handleButtonCommand de ButtonDevice
            SUPPRIME 20 fichiers lib/ uniques à stable-v5
            SUPPRIME _registerButtonCapabilityListeners (déplacé mais oublié)
            SUPPRIME EventDeduplicationLayer
            INTRODUIT require('../../../package.json') (mauvais chemin)
```

### Phase 3 : Investigation + Correction (20-21 juin 2026)
```
2026-06-20  Timer fallback (this.homey?.set* || set*) — 7 sites
2026-06-20  TSN fenêtre 5s + debounce par-gang + 9 patterns OnOff + 0xFD 6 variantes
2026-06-20  SanityFilter _getROCLimit + edge same-ms
2026-06-20  package.json path corrigé
2026-06-20  Formules batterie linéaires → courbes CR2032
2026-06-21  _registerButtonCapabilityListeners restauré
2026-06-21  setable:false + maintenanceAction (89 drivers + app.json)
2026-06-21  _updateBattery + onEndDeviceAnnounce (backport v5.11.205)
2026-06-21  VirtualButtonMixin state tracking restauré
2026-06-21  NFKD Unicode normalize (R24)
2026-06-21  Duplicate _universalSceneModeSwitch fixed (HIGH bug)
2026-06-21  ZigbeeTimeout path corrigé
2026-06-21  Issue #388 TS0207 fixed (rain sensor conflict)
```

---

## 🔬 Analyse par Composant : Ce Qui Marchait vs Ce Qui a Régressé

### ButtonDevice.js (lib/devices/)

| Version | Lignes | _registerButtonCapListeners | setupButtonDetection | _updateBattery | onEndDeviceAnnounce | _universalSceneModeSwitch |
|---------|:------:|:--------------------------:|:--------------------:|:--------------:|:-------------------:|:-------------------------:|
| v5.11.100 | 1787 | ❌ (pas encore) | ✅ | ❌ | ❌ | ✅ (1 def) |
| v5.11.205 | 2050 | ✅ (3 refs) | ✅ (3 refs) | ✅ | ✅ | ✅ (1 def) |
| 44c9dc887 | ~1950 | ✅ (2 refs) | ✅ | ❌ | ❌ | ✅ (1 def) |
| TITAN V5 | 1322 | ❌ SUPPRIMÉ | ❌ SUPPRIMÉ | ❌ | ❌ | ⚠️ 2 DEFS (bug) |
| **master actuel** | **1424** | **✅ (4 refs)** | **✅ (mix)** | **✅ restauré** | **✅ restauré** | **✅ (1 def, fix dup)** |

**Verdict** : Master est maintenant supérieur à v5.11.205 sur tous les axes.

### PhysicalButtonMixin.js (lib/mixins/)

| Version | Lignes | Timers fallback | TSN dedup | Debounce | 9 patterns | 0xFD variantes |
|---------|:------:|:---------------:|:---------:|:--------:|:----------:|:--------------:|
| v5.11.205 | 863 | ❌ | ❌ | global | ❌ | 10 |
| 44c9dc887 | 1004 | ❌ (2 this.homey.set*) | ❌ | global | ❌ | ? |
| TITAN V5 | ~1400 | ❌ (5 this.homey.set*) | ✅ | global ❌ | 3 | 2 |
| **master actuel** | **1584** | **✅ (7 protégés)** | **✅ fenêtre 5s** | **par-gang ✅** | **9 ✅** | **6 ✅** |

### UnifiedBatteryHandler.js (lib/battery/)

| Version | Lignes | EMA smoothing | BatteryHealth | _restoreStored | Courbes CR2032 |
|---------|:------:|:-------------:|:--------------:|:--------------:|:--------------:|
| v5.11.205 | 567 | ❌ | ❌ | ❌ | 14 |
| v8.5.30 | 1148 | ✅ | ✅ | ✅ | 14 |
| **master actuel** | **1446** | **✅** | **✅** | **✅** | **14** |

---

## 🎯 Ce Que Master a de PLUS que Toutes les Versions

### Boutons (enrichissements uniques à master)
1. **Timer fallback** `(this.homey?.set* || set*)` — JAMAIS existé dans aucune version
2. **TSN fenêtre 5s** — JAMAIS existé (v5.11 n'avait pas de TSN dedup du tout)
3. **Debounce par-gang** — JAMAIS existé (toutes versions utilisaient global)
4. **9 patterns OnOff** — v5.11.205 en avait 7, master en a 9
5. **EventDeduplicationLayer** re-porté de stable-v5 (perdu puis restauré)
6. **Duplicate _universalSceneModeSwitch** fixed (bug silencieux depuis v5.11.205 !)

### Batterie (enrichissements uniques à master)
1. **1446 lignes UnifiedBatteryHandler** — le plus gros de toutes versions (v5.11=567, v8.5=1148)
2. **package.json path** corrigé (reporting jamais reconfiguré avant)
3. **SanityFilter _getROCLimit** — méthode manquante depuis création
4. **Edge case même-ms** — JAMAIS détecté avant
5. **Courbes CR2032 non-linéaires** sur XiaomiSpecialHandler + DataRecoveryManager

### Matching (enrichissements uniques)
1. **NFKD Unicode normalize** (R24) — JAMAIS existé avant
2. **Consequence tiering** (inspiré Polos)
3. **Validateur structurel mécanique** (validate-driver-mesh.js)

---

## 📋 Gaps Restants (priorisés)

| Priorité | Gap | Solution |
|----------|-----|----------|
| 🟡 #420 | Wenzhi MTG235 radar no data | Interview device nécessaire |
| 🟡 #383 | Bed Sensor TS0601 | Vérifier mapping DP |
| 🟡 #380 | Config page loading | Optimiser app.json |
| 🟢 LOW | 133 drivers ≤2 fingerprints | Enrichissement pipeline |
| 🟢 LOW | 35 fichiers console.* | Router via this.log() |
| 🟢 LOW | 782 lignes dead code | Archiver |

---

## 🏆 Vision Finale

**Master** = version la plus complète JAMAIS créée, combinant :
- Le **pattern ButtonDevice** de v5.11.205 (setupButtonDetection, _updateBattery, onEndDeviceAnnounce)
- L'**UnifiedBatteryHandler enrichi** de v8.5 (EMA, BatteryHealth, 1446 lignes)
- Les ** PhysicalButtonMixin améliorés** de v9 (TSN, debounce par-gang, 9 patterns, 0xFD étendu)
- Les **fixes forensiques** de cette session (timer fallback, NFKD, setable:false, duplicate fix)
- Les **patterns Polos** (validateur mécanique, consequence tiering)

**Stable-v5** = version simple et statique alignée avec v5.11.205 (référence dorée).
