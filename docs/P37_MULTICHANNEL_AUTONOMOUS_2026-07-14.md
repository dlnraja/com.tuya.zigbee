# P37 — Multi-Channel Architecture + Autonomous Verification (2026-07-14)

## Vision

L'architecture du projet a maintenant **5 canaux parallèles** par device, plus un **moteur de vérification autonome** qui tourne en arrière-plan et **s'auto-corrige** les erreurs de processus.

But : **fiabilité TX/RX maximale** par détection multi-sources, comparaison, consensus, et healing automatique.

## Architecture Multi-Canal

Chaque device a 5 canaux qui opèrent **en parallèle** :

| # | Canal | Cas d'usage | Bridges Homey SDK3 |
|---|---|---|---|
| 1 | **ZclChannelAdapter** | Standard ZCL (battery, onoff, level, etc.) | zigbee-clusters wrapper — clusters manquants |
| 2 | **TuyaDpChannelAdapter** | DPs Tuya spécifiques (1, 2, 3…) | tuyaEF00Manager — DPs custom |
| 3 | **RawZigbeeChannelAdapter** | Clusters exotiques, devices bizarres | LowLevelBridge (P34) — bypass complet |
| 4 | **HomeyAppChannelAdapter** | API haut-niveau Homey | setCapabilityValue direct |
| 5 | **HybridChannelAdapter** | **Tuya + ZCL hybride** sur même device | Cascade ZCL→Tuya→Raw + boost confidence |

### `MultiChannelManager` — coordinateur

```
            ┌─────────────────────────────┐
            │   MultiChannelManager        │
            │   cross-validate + consensus │
            └────────┬────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┬────────────┐
        ▼            ▼            ▼            ▼            ▼
      ZCL          Tuya DP       Raw ZB       Homey App    Hybrid
                                                  ▲
                                                  │
                                                  └─ cascade interne
```

**Cross-validation rules** :
- 2+ canaux d'accord → confidence +0.2 (max 1.0)
- 1 seul canal → confidence normale (0.3-0.9 selon le canal)
- 0 canal → `AggregateError` avec détails par canal
- Disagreement entre canaux → loggé dans `_discrepancies` (max 100)

**Health monitoring** :
- 5 erreurs consécutives par canal → canal désactivé
- `healthCheck()` toutes les 1 min → demi-vie les erreurs, ré-active

### `ParallelDetector` — détection parallèle du device

Lance **5 méthodes** de détection en parallèle :

1. `fp_lookup` — Manufacturer+productId → driver canonique
2. `zcl_scan` — Scan des clusters ZCL présents
3. `tuya_scan` — Énumération DPs Tuya (1-20)
4. `rssi` — Analyse signal radio
5. `history` — Match historique (mfs_db)

**Consensus** : driver avec le plus haut score pondéré (weight × confidence).

### `TransmissionManager` — TX fiable

- Retry exponentiel (250ms → 500ms → 1000ms)
- Cascade sur 5 canaux (homey_app → zcl → hybrid → tuya → raw)
- **Outbox pattern** : writes échoués retentés périodiquement
- Tracking : success rate, avg attempts, outbox size

### `ReceptionManager` — RX fiable

- **Dedup** : même valeur dans fenêtre 2s = doublon
- **Buffer ordonné** : 100 events max, trié par timestamp
- **Subscribe + replay** : listeners tardifs rattrapent le buffer
- **Replay on demand** : re-lecture multi-canal si packet manqué

## Autonomous Verification Engine

Tourne **toutes les 6h** via `.github/workflows/autonomous-verification.yml`.

8 vérifications périodiques :

| Check | Trigger | Action auto-fix |
|---|---|---|
| **heap** | >80% warn, >95% critical | `global.gc()` |
| **eventloop** | lag >500ms warn, >2s critical | none (informational) |
| **timers** | pending >60s | clear stuck timers |
| **process_errors** | uncaughtException/unhandledRejection count >0 | alert only |
| **channels** | per-MultiChannelManager | re-enable after half-life |
| **outbox** | non-empty outbox | flush (retry pending writes) |
| **aggregate_errors** | count >0 | alert + record |
| **state_file** | missing dir | mkdir |

**Sévérités** : INFO / WARN / ERROR / CRITICAL → events émis à listeners

**State persistant** : `.github/state/autonomous-verification.json`

## SecurityGuard (P37.7)

Couche défensive au-dessus des 5 modules security existants :
- `LocalKeyValidator` (P31)
- `DPValueInputValidator` (P31)
- `CommandRateLimiter` (P31)
- `UDPDiscoveryKeyRotation` (P31)
- `SecurityGuard` (P37) — orchestration + AggregateError

**Validations** :
- Type check (boolean/number/string)
- String length (max 256)
- Number range (±1e15)
- Capability scope (whitelist per device)
- HTML/script sanitization
- Rate limiting par user/device

**Erreurs** : `AggregateError` quand violations multiples (pas de swallowing).

## Fichiers ajoutés

```
lib/multichannel/
  ChannelAdapters.js        # 5 adaptateurs + ChannelResult
  MultiChannelManager.js    # coordinateur + cross-validation
  ParallelDetector.js       # détection parallèle 5 méthodes
  TransmissionManager.js    # TX reliable + outbox
  ReceptionManager.js       # RX dedup + buffer + replay
  index.js                  # exports

lib/autonomous/
  AutonomousVerificationEngine.js  # 8 checks + self-heal
  index.js                          # exports

lib/security/
  SecurityGuard.js          # validation + sanitization + AggregateError

tools/ci/
  test-multichannel.js      # 7 tests intégration

.github/workflows/
  autonomous-verification.yml  # cron 6h
```

## Fichiers modifiés

- `lib/utils/safe-timers.js` — ajout `safeSetInterval` + `safeClearInterval` (TITAN v5)

## Tests

```
$ node tools/ci/test-multichannel.js
═══ P37 Multi-Channel + Autonomous + Security ═══
1. ChannelAdapters       ✅ 5 canaux instanciés
2. MultiChannelManager   ✅ read cross-validé (3 canaux d'accord)
3. ParallelDetector      ✅ 5 méthodes en parallèle
4. TransmissionManager   ✅ send OK
5. ReceptionManager      ✅ dedup actif
6. AutonomousVerifEngine ✅ 4 checks, 0 findings
7. SecurityGuard         ✅ AggregateError sur violations
═══ ALL TESTS PASSED ═══
```

## TITAN v5 compliance

```
✅ No bare setTimeout in lib/ (utilise safeSetTimeout)
✅ No bare setInterval in lib/ (utilise safeSetInterval)
✅ No raw setCapabilityValue in lib/ drivers
✅ JSON.parse uses Buffer.from().toString('utf8')
```

## Métriques

| Métrique | Valeur |
|---|---|
| Lignes de code ajoutées | ~1300 |
| Fichiers créés | 9 |
| Fichiers modifiés | 1 (safe-timers) |
| Canaux parallèles | 5 |
| Méthodes de détection | 5 |
| Vérifications autonomes | 8 |
| Tests intégration | 7 (all passing) |

## Garanties

- ✅ **Fiabilité TX** : retry exponentiel + cascade 5 canaux + outbox
- ✅ **Fiabilité RX** : dedup + ordering + buffer + replay
- ✅ **Consensus multi-source** : 2+ canaux d'accord = +0.2 confidence
- ✅ **Hybrides gérés** : Tuya+ZCL cascade, DPs exotiques, ZCL sans init
- ✅ **Auto-heal** : GC auto sur heap critical, ré-activation canaux, flush outbox
- ✅ **Sécurité** : validation + sanitization + rate-limit + AggregateError
- ✅ **100% offline** : tout marche sans GH secrets ni AI

## Workflow crons (actifs)

- `autonomous-verification` — **NEW** — toutes les 6h
- `offline-crash-analyzer` — daily 05:00 UTC
- `temporal-monitor` — daily 06:00 UTC
- `activity-monitor` — daily 04:00 UTC
- `recurrent-orchestrator` — toutes les 4h
- `shadow-mode-runner` — toutes les 6h (READ-ONLY)
