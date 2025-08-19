# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.7.0] - 2025-08-19

### Added
- **Offline Inference & Confidence Scoring**: système d'inférence entièrement hors-ligne pour supporter plus d'appareils Tuya Zigbee sans appels cloud
- **Golden Replays & Chaos-DP Simulator**: moteur de relecture reproductible pour tester les drivers hors-ligne avec des séquences DP réelles ou synthétiques
- **Feature flags par overlay**: clé `features:{}` pour activer/désactiver des variantes par modèle/firmware
- **Schema drift detector**: détecte les incohérences et collisions de fingerprints entre overlays
- **Housekeeping offline**: tâches de maintenance automatique (purge des logs, régénération des matrices)

### Fixed
- **Robust Tuya writes**: `writeInteger` avec retry et jitter pour éviter les timeouts Zigbee
- **FIFO DP queue**: file d'attente DP avec backpressure et gestion des débordements
- **Debounced capability updates**: mises à jour de capacités avec debounce pour éviter les tempêtes d'événements
- **Safe mode**: basculement automatique en lecture seule en cas d'erreurs répétées

### Changed
- **Architecture**: transition vers une architecture lisible par type de produit (kebab-case, pas de "TSxxxx" dans les noms)
- **CLI unifié**: un seul point d'entrée `tools/cli.js` pour toutes les tâches (audit, refactor, checks, tests, build, validate, ingest, infer, propose)
- **Scoring avancé**: système de confiance pondéré par source avec bonus pour la diversité et les preuves DP

### Technical Details
- **Runtime 100% local Zigbee**: aucune API réseau dans le code de l'application
- **SDK3 + Homey Compose**: manifest généré automatiquement, jamais édité manuellement
- **Overlays vendor/firmware**: configuration spécifique par constructeur et firmware avec statut et niveau de confiance
- **Images conformes**: tailles exactes Homey (small 75x75, large 500x500, xlarge 1000x1000)

## [3.6.0] - 2025-08-15

### Added
- MEGA Orchestrator pour l'automatisation complète du projet
- Dashboard moderne et responsive
- Support multilingue (EN/FR/NL)

### Changed
- Migration vers Homey SDK 3
- Architecture modulaire et maintenable

## [3.5.0] - 2025-08-10

### Added
- Drivers Tuya Zigbee de base
- Tests automatisés et validation
- Structure de projet modulaire

---

**Note**: Ce projet suit maintenant un système de versioning sémantique strict. Les changements breaking seront documentés dans la section "Breaking Changes" et nécessiteront une version majeure.
