# 📋 Project Rules & Guidelines

## 🎯 Project Overview

This document defines the rules and guidelines for the **Tuya Zigbee Universal Integration** project, including the differences between the `master` and `tuya-light` branches.

---

## 🌳 Branch Strategy

### 📚 **Master Branch (Complete Version)**
**Purpose**: Full-featured development and distribution version

**✅ Allowed Content**:
- Complete documentation (`docs/`)
- Development tools (`tools/`)
- Reference materials (`ref/`)
- Source code (`src/`)
- All driver types (SDK3, legacy, experimental)
- GitHub Actions workflows (`.github/workflows/`)
- Configuration files (`.ps1`, `.sh`, `.yml`)
- Test files (`.test.js`, `.spec.js`)
- Documentation files (`.md`, `.txt`)
- Localization files (`locales/`)

**🎯 Goals**:
- Comprehensive device support
- Full development environment
- Complete documentation
- Automated workflows
- Community contributions

### ⚡ **Tuya Light Branch (Minimal Version)**
**Purpose**: Minimal, production-ready version for direct installation

**✅ Allowed Content**:
- Essential files only (`app.json`, `package.json`, `app.js`)
- SDK3 drivers only (`drivers/sdk3/`)
- Driver assets (images)
- Minimal README
- Basic `.gitignore`

**❌ Forbidden Content**:
- Documentation (`docs/`)
- Development tools (`tools/`)
- Reference materials (`ref/`)
- Source code (`src/`)
- Legacy drivers
- GitHub Actions workflows
- Configuration files (`.ps1`, `.sh`, `.yml`)
- Test files (`.test.js`, `.spec.js`)
- Documentation files (`.md`, `.txt`)
- Localization files (`locales/`)

**🎯 Goals**:
- Direct `homey app install` compatibility
- `homey app validate` compliance
- Minimal file size
- Fast installation
- Production stability

---

## 🔧 Development Rules

### 📝 **Code Standards**
- **SDK Version**: Homey SDK3 only
- **JavaScript**: ES6+ with strict mode
- **JSON**: Valid JSON with proper formatting
- **Comments**: English comments only
- **Naming**: kebab-case for files, camelCase for variables

### 🏗️ **Driver Structure**
```
drivers/sdk3/[device_name]/
├── driver.compose.json    # Device configuration
├── driver.js             # Device logic
└── assets/
    ├── small.png         # Small device image
    └── large.png         # Large device image
```

### 📋 **Required Driver Fields**
```json
{
  "id": "device_name",
  "name": {
    "en": "Device Display Name"
  },
  "class": "device_class",
  "capabilities": ["capability1", "capability2"],
  "zigbee": {
    "manufacturerName": "Tuya",
    "modelId": "MODEL_ID",
    "endpoints": {
      "1": {
        "clusters": ["genBasic", "genOnOff"],
        "bindings": ["genOnOff"]
      }
    }
  }
}
```

### 🧪 **Testing Requirements**
- All drivers must pass `homey app validate`
- All drivers must be installable with `homey app install`
- All drivers must have proper error handling
- All drivers must include device images

---

## 🔄 Synchronization Rules

### 📅 **Monthly Sync Process**
1. **Source**: `master` branch
2. **Target**: `tuya-light` branch
3. **Frequency**: First day of each month
4. **Automation**: GitHub Actions workflow

### 🧹 **Sync Cleanup Process**
1. Remove all non-essential files
2. Keep only SDK3 drivers
3. Remove all documentation
4. Remove all tools
5. Remove all configuration files
6. Update README for minimal version
7. Generate ZIP fallback

### ✅ **Validation Process**
- Check for forbidden files
- Validate essential files exist
- Verify driver structure
- Test installation process
- Generate validation report

---

## 📦 Installation Rules

### 🏪 **Homey App Store**
- **Branch**: `master` (complete version)
- **Process**: Manual submission
- **Requirements**: Full documentation
- **Testing**: Comprehensive testing

### 💻 **Manual Installation**
- **Master Branch**: Complete features
- **Tuya Light Branch**: Minimal features
- **Requirements**: Git and npm
- **Process**: Clone, install, validate

### ⚡ **Direct Installation**
- **Branch**: `tuya-light` only
- **Requirements**: Minimal dependencies
- **Process**: Direct `homey app install`
- **Validation**: Automatic compliance

---

## 🚫 Forbidden Content

### 📁 **Forbidden Directories**
- `docs/` (tuya-light only)
- `tools/` (tuya-light only)
- `ref/` (tuya-light only)
- `src/` (tuya-light only)
- `locales/` (tuya-light only)

### 📄 **Forbidden File Types**
- `*.ps1` (tuya-light only)
- `*.sh` (tuya-light only)
- `*.yml` (tuya-light only)
- `*.test.js` (tuya-light only)
- `*.log` (both branches)
- `*.tmp` (both branches)
- `*.bak` (both branches)
- `*.backup` (both branches)

### 🔧 **Forbidden Files**
- `RestoreAndRebuild.ps1`
- `cursor_todo_queue.md`
- `*.cursor`
- `.env`
- `node_modules/`

---

## 📋 Quality Assurance

### ✅ **Master Branch Requirements**
- Complete documentation
- All development tools
- Comprehensive testing
- Community guidelines
- Contribution templates
- Issue templates

### ✅ **Tuya Light Branch Requirements**
- Minimal file count
- Essential files only
- Direct installation
- Validation compliance
- Production stability
- Fast deployment

### 🧪 **Testing Checklist**
- [ ] `homey app validate` passes
- [ ] `homey app install` works
- [ ] All drivers functional
- [ ] No forbidden files
- [ ] Proper error handling
- [ ] Device images present

---

## 🔄 Update Process

### 📝 **Master Branch Updates**
1. Add new drivers to `drivers/sdk3/`
2. Update documentation
3. Test with `homey app validate`
4. Commit and push
5. Create release tag

### ⚡ **Tuya Light Updates**
1. Monthly sync from master
2. Remove non-essential files
3. Update minimal README
4. Generate ZIP fallback
5. Push to tuya-light branch

### 🚀 **Release Process**
1. **Master**: Complete feature set
2. **Tuya Light**: Minimal feature set
3. **App Store**: Master branch version
4. **Manual**: Both branches available
5. **Direct**: Tuya Light branch only

---

## 📊 Compliance Matrix

| Requirement | Master | Tuya Light |
|-------------|--------|------------|
| Complete Documentation | ✅ | ❌ |
| Development Tools | ✅ | ❌ |
| All Driver Types | ✅ | ❌ |
| SDK3 Drivers Only | ✅ | ✅ |
| GitHub Actions | ✅ | ❌ |
| Direct Installation | ✅ | ✅ |
| Validation Compliance | ✅ | ✅ |
| Minimal Size | ❌ | ✅ |
| Fast Installation | ❌ | ✅ |
| Production Ready | ✅ | ✅ |

---

## 🎯 Success Metrics

### 📈 **Master Branch Metrics**
- **Documentation Coverage**: 100%
- **Driver Support**: 200+ devices
- **Community Contributions**: 10+ contributors
- **Issue Resolution**: <24 hours
- **Release Frequency**: Monthly

### ⚡ **Tuya Light Metrics**
- **File Count**: <50 files
- **Installation Time**: <30 seconds
- **Validation Score**: 100%
- **Error Rate**: <1%
- **User Satisfaction**: >95%

---

*Last updated: 2025-07-28* 