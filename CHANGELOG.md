# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.8.0] - 2025-01-19

### Added - Innovation Pack 🚀

#### Offline Inference & Confidence Scoring
- Manual data ingestion system (`research/manual/*.jsonl`)
- Multi-source confidence calculation with weighted scoring
- Automatic overlay proposal generation (≥0.60 confidence)
- Source catalog supporting 15+ data types
- Bonus/penalty system for consensus and contradictions

#### Golden Replays & Testing
- Replay system for offline driver testing (`tests/replays/*.replay.jsonl`)
- Chaos-DP simulator for edge case testing
- Deterministic profiling for performance analysis

#### Architecture Improvements
- Unified Node.js CLI (`tools/cli.js`) replacing all PowerShell scripts
- FIFO DP queue with backpressure (max 100 items)
- Capability debouncing (150-300ms) to prevent flooding
- Robust Tuya writes with retry and jitter
- Safe mode for error throttling

### Fixed
- Terminal output issues with PowerShell (STDIN closure, timeouts)
- `homey app build` hanging on remote-scene-tuya driver
- Missing driver.js files causing validation errors
- Image dimension validation and generation

### Changed
- Migrated to SDK3 + Homey Compose (app.json generated)
- Driver naming to readable kebab-case by type (no TSxxxx)
- All tools to Node.js only (no PowerShell dependencies)
- Runtime to 100% local Zigbee (no network calls)

## [3.7.0] - 2025-01-18

### Added
- Initial 4 family drivers: plug, TRV, curtain, remote
- Basic overlay system for vendor/firmware variants
- GitHub Actions CI/CD pipeline

## [3.6.0] - 2025-01-15

### Added
- Project structure migration to Homey SDK3
- Basic Tuya Zigbee device support

---

## Version Roadmap

### [3.9.0] - Planned
- Flow cards for all device types
- JSON Schema validation for overlays
- Unit tests for core modules
- i18n improvements (ta-LK, nl)

### [4.0.0] - Future
- Full device catalog with 50+ confirmed overlays
- Advanced diagnostics and logging
- Community contribution portal
- Automated device discovery