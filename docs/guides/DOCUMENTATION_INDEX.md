# 📚 Documentation Index - Universal Tuya Zigbee

**Version:** 2.1.51  
**Last Updated:** 2025-10-11  
**Total Documents:** 25+

---

## 🎯 Start Here

| Document | Purpose | Who Should Read |
|----------|---------|-----------------|
| **[README.md](README.md)** | Project overview | Everyone |
| **[README.txt](README.txt)** | Quick reference text | Quick lookup |
| **[INSTALLATION.md](INSTALLATION.md)** | Installation guide | New users |
| **[QUICK_START_PUBLICATION.md](QUICK_START_PUBLICATION.md)** | 5-min publication setup | Developers |

---

## 📖 Essential Documentation

### For End Users

1. **[README.md](README.md)**
   - Complete project overview
   - Feature list
   - Device categories
   - Statistics
   - Links

2. **[INSTALLATION.md](INSTALLATION.md)**
   - 4 installation methods
   - Post-installation setup
   - Troubleshooting
   - System requirements

3. **[CHANGELOG.md](CHANGELOG.md)**
   - Version history
   - Bug fixes
   - New features
   - Community contributions

4. **[CHANGELOG.txt](CHANGELOG.txt)**
   - Text format changelog
   - Quick reference

---

### For Developers

5. **[CONTRIBUTING.md](CONTRIBUTING.md)**
   - How to contribute
   - Code guidelines
   - Adding devices
   - Pull request process
   - Commit format

6. **[SCRIPTS_README.md](SCRIPTS_README.md)**
   - All scripts documentation
   - Usage examples
   - Script development
   - Troubleshooting

7. **[LICENSE](LICENSE)**
   - MIT License
   - Attribution
   - Usage rights

---

## 🚀 Publication Guides

### Quick Start

8. **[QUICK_START_PUBLICATION.md](QUICK_START_PUBLICATION.md)** ⭐
   - 5-minute setup
   - GitHub secret configuration
   - 3 publication methods
   - Troubleshooting

### Complete Guides

9. **[PUBLICATION_GUIDE_OFFICIELLE.md](PUBLICATION_GUIDE_OFFICIELLE.md)**
   - Complete official guide
   - Detailed workflows
   - All publication methods
   - Best practices
   - ~600 lines

10. **[.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md](.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md)**
    - Technical workflows guide
    - GitHub Actions details
    - Configuration reference
    - ~450 lines

11. **[.github/workflows/WORKFLOWS.md](.github/workflows/WORKFLOWS.md)**
    - Workflows overview
    - Available workflows
    - Usage instructions

---

## 📊 Technical References

### Implementation

12. **[RECAP_IMPLEMENTATION_OFFICIELLE.md](RECAP_IMPLEMENTATION_OFFICIELLE.md)**
    - What was built
    - Files created
    - Statistics
    - Next steps

13. **[DOCUMENTATION_COMPLETE_RECAP.md](DOCUMENTATION_COMPLETE_RECAP.md)**
    - Documentation overview
    - All files created
    - Commit details
    - Checklist

### Configuration

14. **[references/github_actions_official.json](references/github_actions_official.json)**
    - GitHub Actions reference
    - Technical specifications
    - Troubleshooting
    - Best practices

15. **[.homeychangelog.json](.homeychangelog.json)**
    - Homey App Store changelog
    - Version messages
    - User-facing changes

---

## 🐛 Bug Fixes & Reports

16. **[FORUM_BUGS_CORRECTIONS_RAPPORT.md](FORUM_BUGS_CORRECTIONS_RAPPORT.md)**
    - Community bug fixes (v2.1.40)
    - Temperature sensor fix (Bug #259)
    - PIR sensor fix (Bug #256)
    - Gas sensor support (Bug #261)

---

## 🔧 CI/CD & Automation

### Workflows

17. **[.github/workflows/homey-official-publish.yml](.github/workflows/homey-official-publish.yml)**
    - Main publication workflow
    - Automatic on push
    - Manual dispatch

18. **[.github/workflows/homey-validate.yml](.github/workflows/homey-validate.yml)**
    - Validation workflow
    - Runs on PRs
    - Multi-level testing

### Scripts

19. **[scripts/automation/publish-homey-official.ps1](scripts/automation/publish-homey-official.ps1)**
    - PowerShell publication script
    - Local automation
    - Windows compatible

---

## 📋 Additional Documentation

### Project Management

20. **[CI_CD_USAGE_GUIDE.md](CI_CD_USAGE_GUIDE.md)**
    - CI/CD pipeline guide
    - GitHub Actions usage
    - Deployment process

21. **[WORKFLOW_HEADLESS_GUIDE.md](WORKFLOW_HEADLESS_GUIDE.md)**
    - Headless automation
    - Non-interactive publishing

### Historical

22. **[SESSION_COMPLETE_RAPPORT.md](SESSION_COMPLETE_RAPPORT.md)**
    - Development session report
    - Historical context

23. **[RAPPORT_SCRIPTS_COMPLETS.md](RAPPORT_SCRIPTS_COMPLETS.md)**
    - Complete scripts report
    - Script inventory

24. **[RAPPORT_GENERATION_IMAGES_V2.md](RAPPORT_GENERATION_IMAGES_V2.md)**
    - Image generation report
    - Design standards

25. **[SYSTEME_IMAGES_V2_COMPLETE.md](SYSTEME_IMAGES_V2_COMPLETE.md)**
    - Complete image system
    - Technical details

---

## 🗺️ Documentation Map

### By Use Case

#### 🆕 I want to **install** the app
→ Start with: [INSTALLATION.md](INSTALLATION.md)

#### 👨‍💻 I want to **contribute** code
→ Start with: [CONTRIBUTING.md](CONTRIBUTING.md)

#### 🚀 I want to **publish** my changes
→ Start with: [QUICK_START_PUBLICATION.md](QUICK_START_PUBLICATION.md)

#### 🔧 I want to **use scripts**
→ Start with: [SCRIPTS_README.md](SCRIPTS_README.md)

#### 📖 I want to understand the **project**
→ Start with: [README.md](README.md)

#### 🐛 I want to **report a bug**
→ Start with: [CONTRIBUTING.md](CONTRIBUTING.md#reporting-bugs)

#### 🎨 I want to **add a device**
→ Start with: [CONTRIBUTING.md](CONTRIBUTING.md#adding-new-devices)

#### 📊 I want to see **what changed**
→ Start with: [CHANGELOG.md](CHANGELOG.md)

---

## 📂 File Structure

```
Root Documentation
├── README.md                              # Main entry point
├── README.txt                             # Text version
├── INSTALLATION.md                        # Installation guide
├── CHANGELOG.md                           # Version history
├── CHANGELOG.txt                          # Text changelog
├── CONTRIBUTING.md                        # Contribution guide
├── LICENSE                                # MIT License
├── SCRIPTS_README.md                      # Scripts documentation
├── DOCUMENTATION_INDEX.md                 # This file
│
├── Publication Guides
│   ├── QUICK_START_PUBLICATION.md         # 5-min start
│   ├── PUBLICATION_GUIDE_OFFICIELLE.md    # Complete guide
│   ├── RECAP_IMPLEMENTATION_OFFICIELLE.md # Implementation
│   └── DOCUMENTATION_COMPLETE_RECAP.md    # Doc overview
│
├── Bug Fixes
│   └── FORUM_BUGS_CORRECTIONS_RAPPORT.md  # Community fixes
│
├── GitHub Workflows
│   ├── .github/workflows/
│   │   ├── homey-official-publish.yml     # Main workflow
│   │   ├── homey-validate.yml             # Validation
│   │   ├── OFFICIAL_WORKFLOWS_GUIDE.md    # Tech guide
│   │   └── WORKFLOWS.md                   # Overview
│   └── scripts/automation/
│       └── publish-homey-official.ps1     # PS script
│
├── Technical References
│   ├── references/
│   │   └── github_actions_official.json   # Tech spec
│   └── .homeychangelog.json               # Homey changelog
│
└── Historical/Legacy
    ├── CI_CD_USAGE_GUIDE.md
    ├── WORKFLOW_HEADLESS_GUIDE.md
    ├── SESSION_COMPLETE_RAPPORT.md
    ├── RAPPORT_SCRIPTS_COMPLETS.md
    ├── RAPPORT_GENERATION_IMAGES_V2.md
    └── SYSTEME_IMAGES_V2_COMPLETE.md
```

---

## 🔍 Finding Information

### Search by Topic

| Topic | Documents |
|-------|-----------|
| **Installation** | INSTALLATION.md, README.md |
| **Publication** | QUICK_START_PUBLICATION.md, PUBLICATION_GUIDE_OFFICIELLE.md |
| **Contributing** | CONTRIBUTING.md, SCRIPTS_README.md |
| **Workflows** | .github/workflows/*.md, github_actions_official.json |
| **Bug Fixes** | FORUM_BUGS_CORRECTIONS_RAPPORT.md, CHANGELOG.md |
| **Scripts** | SCRIPTS_README.md, scripts/ directory |
| **History** | CHANGELOG.md, SESSION_COMPLETE_RAPPORT.md |
| **License** | LICENSE |

---

## 📊 Documentation Statistics

```
Total Documents: 25+
Total Lines: 10,000+
Markdown Files: 20+
Text Files: 2
JSON Files: 2
YAML Files: 2
PowerShell: 1

Categories:
- User Documentation: 4
- Developer Documentation: 5
- Publication Guides: 4
- Bug Reports: 1
- Technical References: 2
- Workflows: 4
- Historical: 5+
```

---

## ✅ Documentation Completeness

- [x] User installation guide
- [x] Developer contribution guide
- [x] Publication methods (3)
- [x] Changelog (MD + TXT)
- [x] README (MD + TXT)
- [x] Scripts documentation
- [x] Workflows documentation
- [x] Bug fix reports
- [x] Technical references
- [x] License information
- [x] This index

**Status:** ✅ **100% COMPLETE**

---

## 🔗 External Links

- **GitHub:** https://github.com/dlnraja/com.tuya.zigbee
- **Homey Dashboard:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
- **Forum:** https://community.homey.app/t/140352/
- **Test URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/
- **Live URL:** https://homey.app/a/com.dlnraja.tuya.zigbee/

---

## 📝 Document Maintenance

### Updating Documentation

When updating docs:
1. Update version number
2. Update "Last Updated" date
3. Update this index if adding new docs
4. Update CHANGELOG.md
5. Commit with descriptive message

### Adding New Documentation

1. Create document
2. Add to this index
3. Update README.md if necessary
4. Link from related documents
5. Update file structure diagram

---

## 🆘 Need Help?

Can't find what you're looking for?

1. **Search this index** for keywords
2. **Check README.md** for overview
3. **Browse file structure** above
4. **Ask in forum:** https://community.homey.app/t/140352/
5. **Create issue:** https://github.com/dlnraja/com.tuya.zigbee/issues

---

**Last Updated:** 2025-10-11  
**Maintainer:** Dylan Rajasekaram  
**Version:** 2.1.51
