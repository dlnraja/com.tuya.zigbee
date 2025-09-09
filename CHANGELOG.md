# Changelog

## [3.0.0] - 2025-09-09

### Added
- **Standardized Driver Architecture**: Implemented a new `BaseDevice` class in `drivers/common/` to handle shared logic like device initialization, battery polling, and error handling.
- **Centralized Utilities**: Created `errorHandler.js` and `constants.js` to standardize error logging and shared values across all drivers.
- **Code Quality Tools**: Added and configured `ESLint` and `Prettier` to enforce a consistent coding style and quality.
- **Automated CI/CD**: Implemented a GitHub Actions workflow (`.github/workflows/main.yml`) to automatically run linting and tests on every push and pull request.
- **Changelog**: Initialized this `CHANGELOG.md` to track project evolution.

### Changed
- **Major Refactoring**: Refactored key drivers (`TS0201`, `TS0207`, `TS0041`, `TS011F`) to inherit from the new `BaseDevice`, simplifying their code and ensuring consistent behavior.
- **New Directory Structure**: Reorganized all drivers into a logical, category-based structure (e.g., `drivers/sensors/temperature/`).
- **Datapoint Handling**: Enhanced `BaseDevice` to support Tuya-specific datapoint messages, enabling robust event-based devices like scene switches.

### Fixed
- **Corrupted Project Files**: Repaired severely corrupted `package.json`, `app.json`, and `.github/workflows/main.yml` files.
- **Driver Inconsistencies**: Standardized the implementation of various sensors, switches, and plugs.

## [2.1.0] - 2025-09-09

### Added
- New standardized driver structure by device type
- Initial test suite setup with Homey Mock
- Semantic versioning implementation

### Changed
- Reorganized drivers directory structure
- Improved error handling in device initialization

### Fixed
- Validation issues in recursive validation script

## [2.0.1] - 2025-08-31

### Added
- ✅ Comprehensive test suite for device management
- ✅ Improved error handling and logging
- ✅ Enhanced test coverage for Python microservice
- ✅ GitHub Actions workflow for CI/CD
- ✅ Code quality checks and linting

### Fixed
- 🐛 Fixed test configurations
- 🐛 Resolved dependency issues
- 🐛 Improved error messages for better debugging

### Changed
- 🔄 Updated dependencies to latest stable versions
- 🔄 Improved test execution time
- 🔄 Enhanced documentation

## [1.1.0] - 2025-01-29

### Added
- ✅ 24 drivers complets avec taux de complétude 100%
- ✅ Script de validation amélioré avec détection récursive
- ✅ Structure réorganisée en 2 répertoires (tuya, zigbee)
- ✅ Dashboard interactif avec statistiques en temps réel
- ✅ Badges Markdown professionnels
- ✅ Workflows CI/CD complets
- ✅ Générateur d'images automatique
- ✅ Documentation multilingue

### Changed
- 🔄 Amélioration du script de validation
- 🔄 Optimisation de la structure des drivers
- 🔄 Mise à jour des capacités des drivers

### Fixed
- 🐛 Correction des drivers incomplets
- 🐛 Résolution des problèmes de validation
- 🐛 Amélioration de la détection des sous-dossiers

## [1.0.0] - 2025-01-28

### Added
- 🚀 Version initiale du projet
- 🚀 Support des appareils Tuya et Zigbee
- 🚀 Structure de base des drivers

---

**Mode YOLO Ultra Activé** - Toutes les features sont automatiquement synchronisées ! 🚀