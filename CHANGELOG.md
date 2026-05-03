# Changelog

## v7.5.7 (2026-05-03)

### Critical Fixes
- Fixed SourceCredits crash on startup (#302)
- Fixed valve_irrigation driver corruption (#260)
- Fixed getDeviceConditionCard SDK3 error in all drivers

### New Features
- EnergyEstimator.js: Smart power estimation without native sensors (30+ profiles, 12 brands)
- VirtualEnergyMeterMixin.js: Mixin for WiFi/Zigbee drivers
- Vibration sensor auto-reset to idle (configurable delay, default 30s)

### Device Support
- Added 18 new device fingerprints from community and JohanBendz issues
- BSEED 2-gang switch (_TZ3000_l9brjwau)
- Smart Solar Soil Sensor (_TZE284_rqcuwlsa)
- 4-button scene switch (_TZ3000_vp6clf9d)
- Blind switch (_TZE200_4hbx5cor)
- BSEED 1/2/3-gang wall switches
- IR remote, presence radar, thermostat, water leak, illuminance, switch

### Stability
- 596 files stabilized (0 syntax errors)
- 400+ maintenance scripts neutralized
- STRICT_SYNTAX_GUARD: 0 errors confirmed

### CI/CD
- 54 GitHub Actions workflows optimized with concurrency groups
- NVIDIA_API_KEY added to 28+ workflows
- nightly-auto-process: weekly Sunday 02:00 UTC with forum scraping + diagnostics
- enrich-drivers: weekly Monday 03:00 UTC
- daily-promote-to-test: 4-tier promotion (Puppeteer, OAuth, API, Retry)
- No workflow posts to forum

### Security
- No sensitive files leaked
- All API keys via GitHub Secrets only
- .gitignore covers .agents/, .memory/, .windsurf/

### Issues Resolved
- #302: SourceCredits crash → Closed
- #162: Fingerbot button.push → Commented (fixed in v7.5.7)
- #276: Soil sensor → Fixed + Commented