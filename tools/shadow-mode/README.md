# Shadow Mode — Full-Shadow Continuous Ticket Ingestion Framework

> **Status**: v0.1.0-alpha (Mavis 2026-07-10)
> **Purpose**: Pull Homey forum tickets, GitHub issues, Gmail diagnostics, and local SQLite logs → cross-reference → implement dynamically, 1-by-1, with full manufacturer variant awareness.
> **Mode**: SHADOW (per `SHADOW_MODE_REMEDIATION_REPORT.md` v7.4.5): discovery-only, no public mutations, publishes go to test channel.
> **App cible**: BOTH `com.dlnraja.tuya.zigbee` (master v9.0.190) + `com.dlnraja.tuya.zigbee.stable` (v5.11.219). Backport rule: bug fixes go to BOTH, new features go to master only.

---

## 🎯 What This Is

A continuous automation system that:
1. **Pulls** all open tickets from local sources (Codex SQLite logs, local files, GH issues JSON dump, Gmail diagnostics if creds available)
2. **Cross-references** each ticket against the 17-rule variant engine (1 mfr × N devices × M implementations)
3. **Generates** the fix as a draft PR (driver.compose.json, fingerprints.json, device.js, flow card)
4. **Tests** the fix locally (collision check, fingerprint health, validation)
5. **Queues** for human approval (or auto-merges if `ownMerge:true` + author is dlnraja)
6. **Closes** the ticket with attribution

This is a "1 mfr can have many devices" implementation, per `AI_CONTEXT_MANDATE.md`:
> "one_mfr_many_ids: A single manufacturerName (_TZ3000_xxx) can map to 50+ devices"
> "one_id_many_mfrs: A single productId (TS0601) can be 2000+ different devices"
> "power_varies: Same mfr can have battery AND mains AND kinetic variants"

---

## 📁 File Structure

```
tools/shadow-mode/
├── README.md                           # This file
├── state.json                          # What was done, what to do next, last_run
├── runner.js                           # Main orchestrator
├── variant-engine.js                   # 1 mfr × N devices × M implementations resolver
├── ticket-implementer.js               # Generates the fix for one ticket
├── sources/
│   ├── local-files.js                  # Reads from docs/, CHANGELOG, .homeychangelog
│   ├── local-sqlite.js                 # Reads from .codex/state_5.sqlite, logs_2.sqlite
│   ├── local-fingerprints.js           # Reads master/data/fingerprints.json + lib/tuya/fingerprints.json
│   ├── gh-issues-stub.js               # GitHub API (only if GITHUB_TOKEN env var set)
│   ├── gmail-stub.js                   # Gmail IMAP (only if GMAIL_CREDS env var set)
│   └── forum-stub.js                   # Discourse API (only if DISCOURSE_API_KEY env var set)
├── tickets/
│   ├── dry-run-tickets.json            # The 5 first tickets to implement
│   └── implemented/                    # Where fixed tickets are archived
├── diagnostics/
│   └── pre-commit-utf8.log             # Output of prevention script
└── docs/
    └── tickets-implemented-2026-07-10.md  # Human-readable summary
```

---

## 🚀 Quick Start

### Dry run (no creds needed — uses local files only)

```bash
cd master
node tools/shadow-mode/runner.js --dry-run --limit 5
```

This will:
1. Scan `master/docs/`, `master/CHANGELOG.md`, `master/.homeychangelog.json`
2. Cross-ref with `master/data/fingerprints.json` + `master/lib/tuya/fingerprints.json`
3. For each of the 5 tickets in `tickets/dry-run-tickets.json`, generate a draft fix
4. Run the variant engine to ensure all manufacturer variants are considered
5. Output a human-readable report to `diagnostics/shadow-mode-dry-run-2026-07-10.md`

### Full run (needs GH_PAT, GMAIL_CREDS, DISCOURSE_API_KEY in env)

```bash
cd master
export GITHUB_TOKEN="ghp_..."
export GMAIL_CREDS='{"user":"...","appPassword":"..."}'
export DISCOURSE_API_KEY="..."
node tools/shadow-mode/runner.js --full --max-tickets 50
```

This will:
1. Pull all open GH issues + Gmail diagnostics + forum threads
2. Filter for actionable tickets (skip auto-closed, skip already-merged)
3. Run the variant engine
4. Generate fixes
5. Open draft PRs via `gh pr create --draft`
6. Update `state.json` with results
7. Post ghostwritten comments on each ticket

### Run on cron (every 6 hours suggested)

```yaml
# .github/workflows/shadow-mode-cron.yml
name: Shadow Mode Cron
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:
jobs:
  shadow-mode:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: node tools/shadow-mode/runner.js --full --max-tickets 20
        env:
          GITHUB_TOKEN: ${{ secrets.GH_PAT }}
          GMAIL_CREDS: ${{ secrets.GMAIL_CREDS }}
          DISCOURSE_API_KEY: ${{ secrets.DISCOURSE_API_KEY }}
          HOMEY_PAT: ${{ secrets.HOMEY_PAT }}
      - uses: actions/upload-artifact@v4
        with:
          name: shadow-mode-report
          path: tools/shadow-mode/diagnostics/
```

---

## 🧠 The Variant Engine

Per `AI_CONTEXT_MANDATE.md`, 1 manufacturerName can map to 50+ devices. The variant engine resolves this:

```javascript
// Given 1 mfr, produce all (device × impl) combinations
function resolveVariants(manufacturerName) {
  return {
    manufacturer: manufacturerName,
    productIds: [...], // all PIDs this mfr appears in
    drivers: [...],    // all drivers this mfr routes to
    powerSources: ['battery', 'mains', 'kinetic', 'usb'],
    protocols: ['ZCL', 'TuyaDP', 'Hybrid'],
    clusters: [...],   // all clusters this mfr exposes
    dps: [...],         // all DPs this mfr has
    dpVariants: {       // DP → multiple meanings
      3: ['min_brightness', 'measure_temperature', 'battery_low', 'consumption'],
      6: ['scene_data', 'battery_voltage', 'border', 'countdown'],
      9: ['power_on_state', 'countdown', 'eco_temp', 'temperature_unit', 'flow_rate'],
      101: ['humidity', 'illuminance', 'humidity_calibration', 'running_state'],
      102: ['eco_temperature', 'illuminance_average', 'illuminance_maximum', 'illuminance', 'soil_calibration'],
      104: ['local_temperature_calibration', 'temperature_calibration', 'humidity_calibration', 'soil_calibration', 'cleaning_reminder'],
      105: ['auto_setpoint_override', 'humidity_calibration', 'scale_protection', 'auto_temperature', 'temperature_calibration'],
    },
    implementations: [
      { driver: 'thermostat_tuya_dp', pid: 'TS0601', dp: 47, fix: 'use divideBy10' },
      { driver: 'climate_sensor', pid: 'TS0201', dp: null, fix: 'no calibration needed' },
      // ... N×M combinations
    ],
  };
}
```

This is what the user means by "un mfr peut avoir plusieurs devices ou implémentations différents et variants différents" — we can't just patch one driver; we need to consider ALL of them.

---

## 📊 State Tracking

`state.json` tracks:
- `last_run`: when the runner last executed
- `tickets_total`: how many tickets have been seen
- `tickets_implemented`: how many fixes have been applied
- `tickets_pending`: queued for next run
- `tickets_blocked`: tickets that need human intervention

Each ticket is also tracked in `tickets/dry-run-tickets.json` with:
- `id`: GH issue number / forum thread id / gmail diag id
- `source`: where it came from
- `mfr`: manufacturer name
- `deviceIds`: list of device IDs (if known)
- `variants`: which (driver × pid × power × protocol) combinations are affected
- `fix_strategy`: high-level approach
- `implementation_status`: pending | in_progress | done | blocked
- `pr_url`: if a PR was opened
- `closed_at`: timestamp if auto-closed

---

## ⚠️ Known Limitations

1. **No credentials locally** → can only do dry-run with local files. Full run needs GH/Gmail/Discourse tokens.
2. **Rate limits**: GH 5000/h with PAT, Gmail 250/user/day, Discourse 60/min.
3. **Mavis is the only "AI" in the loop** → Codex is at 100% rate limit, can't delegate.
4. **Stable vs master backport** is MANUAL for now (the runner only generates; human decides which branch).
5. **Variant engine is rule-based, not ML** → may miss edge cases. Heuristic confidence 60-80% per `INTELLIGENT_AUTOMATION.md`.
6. **Shadow mode limits** public mutations: ownMerge:true only works because dlnraja is the author. For non-author fixes, need human approval.

---

## 📅 Roadmap

- [x] v0.1.0 (2026-07-10): MVP — dry-run with local files, 5 first tickets, variant engine prototype
- [ ] v0.2.0: Add GH issues source (requires GITHUB_TOKEN)
- [ ] v0.3.0: Add Gmail diagnostics source (requires GMAIL_CREDS)
- [ ] v0.4.0: Add Discourse forum source (requires DISCOURSE_API_KEY)
- [ ] v0.5.0: Add Homey Cloud API source (for user device telemetry if any)
- [ ] v0.6.0: Cron-based scheduling
- [ ] v1.0.0: Auto-merge for ownAuthor, manual approval for upstream, full attribution

---

## 📎 Mots-clés

`shadow-mode`, `continuous-automation`, `variant-engine`, `manufacturer-variants`, `ticket-implementation`, `homey-tickets`, `github-issues`, `gmail-diagnostics`, `forum-cross-ref`, `1-mfr-N-devices`, `dual-app`, `local-first`, `no-cloud`, `ghostwriter-ready`

---

*Created 2026-07-10 by Mavis investigation session mvs_e7cd7397977c4571a373dc2350580aa1.*
*App cible: BOTH `com.dlnraja.tuya.zigbee` + `com.dlnraja.tuya.zigbee.stable`.*
*Source: 23 docs + 16 skills + 4 SQLites + 3 PRs + 7 workflows + 90+ FPs.*
