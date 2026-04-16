# Diagnostics Storage

Anonymized diagnostic data collected from Homey devices and user reports.
Used by automated workflows to detect issues, track device health, and prioritize fixes.

## Structure

- `reports/` — Individual device diagnostic reports (anonymized)
- `summary.json` — Aggregated summary of all diagnostics
- `issues-map.json` — Maps diagnostic findings to GitHub issues

## Collection

Data is collected automatically by:
- `gmail-diagnostics.yml` — Parses diagnostic emails from Gmail
- `collect-diagnostics.yml` — Pulls live data from Homey API + stores anonymized
- `homey-device-diagnostics.js` — Fetches device data via HOMEY_PAT_API

## Privacy

All data is anonymized:
- Device IDs are hashed (SHA256, first 12 chars)
- User names/emails are stripped
- IP addresses are removed
- Only technical data (fingerprints, DPs, errors, capabilities) is kept
