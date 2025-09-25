# Project Structure Standards

## 📁 Directory Organization

### Root Level (Clean)
- `app.json` - Homey app manifest
- `package.json` - Node.js dependencies  
- `README.md` - User documentation
- `LICENSE` - MIT license
- `.homeychangelog.json` - Homey changelog
- `.gitignore` - Git ignore rules

### Core Directories
- `drivers/` - 159 device drivers
- `assets/` - App images and icons
- `locales/` - Multi-language support

### Development Structure
- `scripts/` - All JavaScript tools and utilities
- `docs/` - Documentation and guides
- `archive/` - Historical files and reports
- `logs/` - Runtime logs and monitoring

## 🎯 File Organization Rules

### Scripts Directory
- **Monitoring**: GitHub Actions, CI/CD tools
- **Enrichment**: Driver enhancement utilities  
- **Automation**: Project maintenance scripts
- **Maintenance**: Cleanup and organization tools

### Archive Structure
- `archive/reports/` - JSON status files
- `archive/temp/` - Temporary txt files
- `archive/logs/` - Historical markdown reports

## 📝 Naming Conventions
- Scripts: `kebab-case.js`
- Drivers: `snake_case/`
- Docs: `UPPER-CASE.md`
- Reports: `CATEGORY_STATUS.json`

## 🔒 Project Standards
- Root directory: Maximum 10 essential files
- All scripts: Organized in subdirectories
- Documentation: Centralized in `docs/`
- No temporary files at root level

---
**Maintainer**: Community | **Based on**: Johan Bendz work | **License**: MIT
