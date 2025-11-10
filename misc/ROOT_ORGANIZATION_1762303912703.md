# Project Root Organization

**Last updated:** 2025-11-05T00:38:48.147Z

## Files at Root

### Essential Files

**Documentation:**
- `README.md` - Main project documentation
- `README.txt` - Text version
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - Project license

**Homey Configuration:**
- `app.json` - Homey app manifest
- `app.js` - Main app file
- `.homeychangelog.json` - Changelog for Homey App Store
- `.homeyignore` - Files to ignore in Homey build

**Node/NPM:**
- `package.json` - Node dependencies
- `package-lock.json` - Locked versions

**Git:**
- `.gitignore` - Git ignore patterns
- `.gitattributes` - Git attributes

**Tools:**
- `.prettierrc` - Prettier config
- `.prettierignore` - Prettier ignore
- `.env.example` - Environment variables template
- `jest.config.js` - Jest testing config

### Organized Documentation

All other documentation is organized in `docs/`:

- `docs/sessions/` - Development sessions and status
- `docs/commits/` - Commit messages archive
- `docs/analysis/` - Analyses and diagnostics
- `docs/guides/` - Guides and tutorials
- `docs/implementation/` - Implementation docs
- `docs/compliance/` - SDK3 & Homey Pro compliance
- `docs/drivers/` - Driver updates and fixes
- `docs/integrations/` - Tuya, Zigate, etc.
- `docs/deployment/` - Deployment instructions
- `docs/misc/` - Miscellaneous docs

## Automatic Organization

This root directory is automatically organized by:
- Script: `scripts/maintenance/AUTO_ORGANIZE_ROOT.js`
- GitHub Action: `.github/workflows/auto-organize.yml`

Runs automatically after each push to master.

## Manual Cleanup

To manually organize the root:

```bash
node scripts/maintenance/AUTO_ORGANIZE_ROOT.js
```
