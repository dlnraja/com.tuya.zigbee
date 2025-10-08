# Homey SDK3 Structure Guidelines

## 📁 REQUIRED AT ROOT (Homey SDK3)

### Essential Files
- `app.json` ✅ - App manifest (REQUIRED)
- `app.js` ✅ - Main app file (REQUIRED) 
- `package.json` ✅ - Dependencies (REQUIRED)
- `README.md` ✅ - User documentation (RECOMMENDED)
- `LICENSE` ✅ - License file (RECOMMENDED)

### Homey Specific Files  
- `.homeychangelog.json` ✅ - Changelog (OPTIONAL)
- `.homeyignore` ✅ - Homey ignore (OPTIONAL)

### Required Directories
- `drivers/` ✅ - Device drivers (REQUIRED)
- `assets/` ✅ - App images (REQUIRED) 
- `locales/` ✅ - Translations (RECOMMENDED)

## 🗂️ DEVELOPMENT FILES (Sub-directories)

### Can be organized in subdirectories:
- `scripts/` - Development tools
- `docs/` - Extended documentation  
- `archive/` - Historical files
- `test/` - Test files

## ✅ CURRENT STATUS: COMPLIANT

Root contains only essential Homey SDK3 files.
Development files properly organized in subdirectories.
