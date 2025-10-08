# 📁 HOMEY SDK3 STRUCTURE - ULTIMATE ZIGBEE HUB

## 🏗️ PROJECT ORGANIZATION

### 📂 ROOT FILES (Required by Homey SDK3)
- `app.json` - Main app configuration
- `app.js` - App entry point
- `package.json` - Node.js dependencies
- `README.md` - Project documentation
- `LICENSE` - MIT License
- `.gitignore` - Git exclusions + security rules
- `.homeyignore` - Homey build exclusions
- `SECURITY.md` - Security guidelines

### 📂 DIRECTORY STRUCTURE

#### `/drivers/`
- **159 device drivers** organized by function (UNBRANDED)
- Categories: Motion, Climate, Lighting, Energy, Security, etc.
- Each driver has: `driver.compose.json`, assets, pair templates

#### `/scripts/`
- Development and automation scripts
- `enrich-drivers.js` - Manufacturer ID enrichment
- `auto-publish.js` - Automated publishing
- `complete-ids.js` - Complete manufacturer IDs
- All build and maintenance scripts

#### `/tools/`
- Batch files and system tools
- `auto-retry.bat` - Windows retry system
- `smart-retry.bat` - Smart publishing retry

#### `/docs/`
- Project documentation
- `DRIVER_STATS.md` - Driver statistics
- `DRIVER-COMPLETION-STATUS.md` - Completion tracking
- Development guides and API docs

#### `/assets/`
- App icons and images (250x175, 75x75)
- Device driver assets
- Brand-neutral imagery

#### `/lib/`
- Shared libraries and utilities
- Common Zigbee functions
- Device pairing helpers

#### `/config/`
- Configuration templates
- Environment examples
- Deployment configs

#### `/tests/`
- Unit and integration tests
- Driver validation scripts
- Compatibility tests

#### `/utils/`
- Utility functions
- Helper scripts
- Common tools

## 🎯 COMPLIANCE STATUS
✅ Homey SDK3 compliant structure
✅ UNBRANDED organization by device function
✅ Security-first approach (.gitignore enhanced)
✅ Complete manufacturer IDs (no wildcards)
✅ Professional directory organization

## 🔄 MAINTENANCE
Structure maintained by `scripts/organize-sdk-structure.js`
