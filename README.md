# 📚 Universal Tuya Zigbee - Documentation

**Version**: v4.9.322  
**Last Updated**: 2025-11-09  
**Status**: Production Ready - Auto-Publish Active

---

## 📖 Quick Navigation

### 🆘 Forum Support
- **[Forum Issues Tracker](forum-responses/FORUM_ISSUES_TRACKER.md)** - Suivi des problèmes utilisateurs
- **[Response Templates](forum-responses/)** - Réponses pré-rédigées pour Cam, Peter, etc.

### 🔧 Diagnostics
- **[Diagnostic Reports](diagnostics/)** - Rapports de diagnostic détaillés
- **[IAS Zone Fixes](diagnostics/)** - Corrections critiques motion sensors + SOS buttons

### 📖 Technical Documentation (NEW!)
- **[RESOURCES.md](RESOURCES.md)** - All official links (Tuya, Homey, Zigbee)
- **[TUYA_DP_COMPLETE_MAPPING.md](TUYA_DP_COMPLETE_MAPPING.md)** - Complete DP mappings reference
- **[DEVICE_IDENTIFICATION_GUIDE.md](DEVICE_IDENTIFICATION_GUIDE.md)** - Standard Zigbee vs Tuya DP
- **[SDK3_MIGRATION_COMPLETE.md](SDK3_MIGRATION_COMPLETE.md)** - All SDK3 fixes documented
- **[PAIRING_OPTIMIZATION.md](PAIRING_OPTIMIZATION.md)** - Pairing process explained
- **[TROUBLESHOOTING_COMPLETE.md](TROUBLESHOOTING_COMPLETE.md)** - Complete troubleshooting guide

### 📦 Release Notes
- **[Version History](releases/)** - Historique complet des versions
- **[Session Summaries](releases/)** - Résumés des sessions de développement

### 📘 Guides
- **[Driver Selection Guide](guides/DRIVER_SELECTION_GUIDE.md)** - Choisir le bon driver
- **[Setup Guide](guides/SETUP_HOMEY_TOKEN.md)** - Configuration Homey Token
- **[Contributing](guides/CONTRIBUTING.md)** - Contribuer au projet

### 📊 Project Status
- **[App Store Status](project-status/APP_STORE_STATUS.md)** - État publication
- **[Certification](project-status/CERTIFICATION_READY.md)** - État certification
- **[Trigger Publish](project-status/TRIGGER_PUBLISH.md)** - Guide publication manuelle

### 🔍 Audits
- **[Project Audits](audits/)** - Audits de code et qualité
- **[Battery Intelligence](audits/BATTERY_INTELLIGENCE_SYSTEM.md)** - Système de gestion batterie

### 🐛 GitHub Issues
- **[Issue Fixes](github-issues/)** - Résolution problèmes GitHub
- **[Actions Hotfix](github-issues/GITHUB_ACTIONS_HOTFIX.md)** - Corrections GitHub Actions

---

## 🎯 Most Important Documents

### For Users
1. **[FORUM_ISSUES_TRACKER.md](forum-responses/FORUM_ISSUES_TRACKER.md)** - Toutes les erreurs forum résolues
2. **[DRIVER_SELECTION_GUIDE.md](guides/DRIVER_SELECTION_GUIDE.md)** - Quel driver choisir?
3. **Latest Release Notes** - Dans `releases/`

### For Developers
1. **[CONTRIBUTING.md](guides/CONTRIBUTING.md)** - Comment contribuer
2. **[Project Audits](audits/)** - Comprendre l'architecture
3. **[Diagnostic Reports](diagnostics/)** - Apprendre des bugs résolus

### For Maintainers
1. **[SETUP_HOMEY_TOKEN.md](guides/SETUP_HOMEY_TOKEN.md)** - Configuration déploiement
2. **[TRIGGER_PUBLISH.md](project-status/TRIGGER_PUBLISH.md)** - Publication manuelle
3. **[GitHub Issues](github-issues/)** - Résolution problèmes CI/CD

---

## 📂 Documentation Structure

```
docs/
├── README.md (this file)
├── INDEX.md (full index)
│
├── forum-responses/          # Forum Homey Community
│   ├── FORUM_ISSUES_TRACKER.md    ⭐ IMPORTANT
│   ├── FORUM_RESPONSE_FOR_CAM.md
│   ├── FORUM_RESPONSE_FOR_PETER.md
│   ├── FORUM_RESPONSE_CAM_PETER.md
│   ├── COMMUNITY_RESPONSE_CAM.md
│   └── FORUM_ANALYSIS_COMPLETE.md
│
├── diagnostics/              # Diagnostic Reports
│   ├── DIAGNOSTIC_RESPONSE_1c9d6ce6.md
│   ├── HOBEIAN_ISSUES_ANALYSIS_COMPLETE.md
│   ├── HOBEIAN_ZG204Z_DEBUG_REPORT.md
│   ├── CRITICAL_IAS_ZONE_FIX_v2.15.81.md
│   └── IAS_ZONE_FIX_v2.15.71_COMPLETE.md
│
├── releases/                 # Version History
│   ├── COMPLETE_FIX_REPORT_v2.15.59.md
│   ├── ENRICHMENT_REPORT_v2.15.60.md
│   ├── FINAL_STATUS_REPORT.md
│   ├── FINAL_STATUS_v2.15.72.md
│   ├── SESSION_COMPLETE_FINAL_v2.15.62.md
│   ├── SESSION_SUMMARY_2025-10-13.md
│   └── ... (10 files total)
│
├── guides/                   # User & Developer Guides
│   ├── DRIVER_SELECTION_GUIDE.md
│   ├── SETUP_HOMEY_TOKEN.md
│   ├── UX_IMPROVEMENT_PLAN.md
│   └── CONTRIBUTING.md
│
├── project-status/           # Project Status Reports
│   ├── APP_STORE_STATUS.md
│   ├── CERTIFICATION_READY.md
│   ├── READY_TO_PUBLISH.md
│   ├── TRIGGER_PUBLISH.md
│   ├── VISUAL_ASSETS_COMPLETE.md
│   └── IMAGE_FIX_SUMMARY.md
│
├── audits/                   # Code Quality Audits
│   ├── PROJECT_AUDIT_v2.15.56.md
│   ├── NAMING_AUDIT_REPORT.md
│   ├── DRIVER_RENAMES_v2.15.55.md
│   └── BATTERY_INTELLIGENCE_SYSTEM.md
│
└── github-issues/            # GitHub Issues Resolution
    ├── FIX_GITHUB_ISSUES_1267_1268.md
    ├── GITHUB_ISSUES_ANALYSIS.md
    └── GITHUB_ACTIONS_HOTFIX.md
```

---

## 🔥 Critical Issues Resolved

### v2.15.83 - Red Error Triangles
**Users Affected**: Cam, Peter  
**Symptom**: Devices unselectable, red triangles  
**Fix**: Removed duplicate IAS Zone code, fixed syntax errors  
**Status**: ✅ RESOLVED

**Details**: [FORUM_ISSUES_TRACKER.md](forum-responses/FORUM_ISSUES_TRACKER.md#issue-001-002)

### v2.15.81 - IAS Zone Enrollment
**Users Affected**: Peter, Community  
**Symptom**: Motion sensors don't detect, SOS buttons don't trigger  
**Fix**: SDK3 compliance - `zclNode.bridgeId` instead of deprecated API  
**Status**: ✅ RESOLVED

**Details**: [FORUM_ISSUES_TRACKER.md](forum-responses/FORUM_ISSUES_TRACKER.md#issue-003-004)

### v2.15.85 - Validation Warnings
**Impact**: 28 warnings on publish validation  
**Fix**: Added `titleFormatted` to all intelligent flows  
**Status**: ✅ RESOLVED

**Details**: [FORUM_ISSUES_TRACKER.md](forum-responses/FORUM_ISSUES_TRACKER.md#issue-005)

---

## 📊 Version Timeline

| Version | Date | Major Changes | Status |
|---------|------|---------------|--------|
| v2.15.85 | 2025-10-14 | Validation warnings fixed | ✅ Current |
| v2.15.84 | 2025-10-14 | Multi-gang flows (104 total) | ✅ Released |
| v2.15.83 | 2025-10-14 | Red triangles fixed | ✅ Released |
| v2.15.82 | 2025-10-14 | Flow coherence (82 flows) | ✅ Released |
| v2.15.81 | 2025-10-13 | IAS Zone SDK3 fix | ✅ Released |
| v2.15.80 | 2025-10-13 | Capability flows (71 total) | ✅ Released |

**Full History**: See `releases/` directory

---

## 🎯 App Features

### 104 Flow Cards Total
- **54 Triggers**: Motion, contact, temperature, buttons, etc.
- **25 Conditions**: Smart checks for automation
- **25 Actions**: Control devices, scenes, protocols

### 183 Drivers
- All SDK3 compliant
- Universal flow methods
- Battery intelligence
- Multi-gang support (1-6 buttons)

### Press Type Detection
- Short press
- Long press (customizable duration)
- Double press (customizable window)

---

## 🆘 Getting Help

### Forum Support
- **Thread**: [Universal TUYA Zigbee Device App](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)
- **Response Time**: < 24 hours
- **Language**: English, Français

### Issue Reporting
1. Check **[FORUM_ISSUES_TRACKER.md](forum-responses/FORUM_ISSUES_TRACKER.md)** first
2. Search existing GitHub issues
3. Post on Homey Community forum
4. Include diagnostic report ID

### Common Issues
- **Red triangles**: Update to v2.15.83+, re-pair devices
- **Motion not detected**: Update to v2.15.81+, check batteries
- **SOS button no trigger**: Update to v2.15.81+, re-pair
- **Flows not visible**: Update app, restart Homey

---

## 🚀 Contributing

See **[CONTRIBUTING.md](guides/CONTRIBUTING.md)** for:
- Code style guidelines
- Pull request process
- Testing requirements
- Documentation standards

---

## 📝 Changelog

**Latest**: See `.homeychangelog.json` in root

**Detailed**: See `releases/` directory for session summaries

---

## 🏆 Achievements

- ✅ 104 flow cards (most complete Tuya app)
- ✅ 183 drivers SDK3 compliant
- ✅ Zero validation warnings
- ✅ Community issues resolved < 72 hours
- ✅ Active forum support
- ✅ Automated testing & deployment

---

**Maintainer**: Dylan (dlnraja)  
**License**: See LICENSE file  
**Repository**: https://github.com/dlnraja/com.tuya.zigbee  
**App Store**: https://homey.app/ (search "Universal Tuya Zigbee")
