# P52 — Safe Sync Strategy (master → stable-v5) (2026-07-14)

## Vision
Les 2 apps (master et stable-v5) supportent le **maximum d'appareils** mais avec des objectifs différents. Ce document explique comment les garder en sync SANS violer leurs identités.

## Apps & Objectifs

### master (dev channel)
- **Audience** : early adopters, power users
- **Version** : v9.0.x (auto-bump par bot)
- **Objectif** : recevoir TOUT (features + fixes)
- **Workflow** : `auto-publish-on-push.yml` (manuel via `workflow_dispatch` aussi)
- **Reçoit** : 1714 FPs, 33 chem, 99 mfr profiles, 431 drivers, multi-channel architecture, AVE, daily-digest, etc.

### stable-v5 (LTS channel)
- **Audience** : users qui veulent stabilité (LTS-like)
- **Version** : v9.0.x-stable.x (manual bump, suffix distinct)
- **Objectif** : bug fixes SEULEMENT, pas de nouvelles features
- **Workflow** : `publish-stable.yml` (auto sur push)
- **Reçoit** : 1714 FPs, 33 chem, 99 mfr profiles, 431 drivers, SANS multi-channel/AVE/daily-digest

## Stratégie de sync (P52)

### Fichiers SAFE à sync sur stable-v5
```
lib/tuya/fingerprints.json                  # +26 FPs (P40-P48)
lib/battery/BatteryMasterEngine.js          # +6 chem, +32 mfrs
lib/battery/BatteryCascadeEngine.js
lib/battery/UniversalBatteryFallback.js
lib/battery/index.js
lib/LocalFirstEngine.js
lib/SDK3CompatBridge.js
lib/LowLevelBridge.js
lib/utils/safe-timers.js
data/mfs_db.json                            # 6597 sacred couples
```

### Fichiers DANGEREUX (NE PAS sync)
```
lib/multichannel/                # Multi-channel architecture (master-only)
lib/autonomous/                  # AutonomousVerificationEngine (master-only)
lib/security/SecurityGuard.js    # Security guard (master-only)
tools/ci/daily-digest.js         # Daily digest (master-only)
tools/ci/recurrent-orchestrator.js  # Orchestrator (master-only)
.github/workflows/autonomous-verification.yml
.github/workflows/recurrent-orchestrator.yml
docs/P37_*, docs/P38_*, ...      # P37+ docs
```

## Automation (P52)

### Tool: `tools/ci/safe-sync-to-stable.js`
- Analyse chaque commit sur master
- Détermine s'il est SAFE ou DANGEROUX basé sur les fichiers touchés
- Affiche la liste sans appliquer (--dry-run par défaut)

### Tool: `tools/ci/apply-safe-sync.js`
- Copie directement les fichiers SAFE de master → stable-v5
- À exécuter manuellement ou via cron

### Workflow: `.github/workflows/safe-sync-stable.yml` (sur stable-v5)
- Cron daily 04:00 UTC
- Auto-sync les fichiers SAFE
- Bump version stable-x.y.z-stable.N
- Commit + push (déclenche auto-publish-stable.yml)

## Result post-P52

| App | Version | FPs | chem | mfrs | Features |
|---|---|---|---|---|---|
| master | v9.0.216 | 1714 | 33 | 99 | All (multi-channel, AVE, daily-digest) |
| stable-v5 | v9.0.216-stable.2 | 1714 | 33 | 99 | Bug fixes only |

**Identiques sur les données, distincts en version et channel.**

## Stats P52

- 4 fichiers SAFEs copiés
- 26 nouveaux FPs sur stable-v5
- 6 nouveaux chem profiles
- 1 nouveau workflow créé (safe-sync-stable.yml)
- Version stable-v5 bumpée de -stable.1 → -stable.2
- 0 régression (safe changes only)

## Leçons

- **Les apps peuvent partager le code tout en ayant des identités distinctes** (version + channel marker)
- **Sync ≠ force-clone** : cherry-pick ou copy sélectif
- **Auto-publish workflows séparés** : chaque app publie avec son propre trigger
- **Version suffix** (`-stable.N`) permet de distinguer les channels sans changer le format semver
- **Les 2 apps supportent maintenant le même set de 1714 FPs** = max d'appareils sur les 2
