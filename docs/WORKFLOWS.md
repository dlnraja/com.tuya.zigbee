# Workflow Documentation

> Tuya Unified Zigbee for Homey Pro
> Version: 9.0.40 | Last Updated: 2026-06-18
> Total Workflows: 40

---

## Table of Contents

1. [CI/CD Pipeline](#cicd-pipeline)
2. [Publishing](#publishing)
3. [Daily Maintenance](#daily-maintenance)
4. [Weekly Tasks](#weekly-tasks)
5. [Monthly Tasks](#monthly-tasks)
6. [Issue Management](#issue-management)
7. [Synchronization](#synchronization)
8. [Monitoring](#monitoring)
9. [Utility](#utility)

---

## CI/CD Pipeline

### unified-ci.yml
- **Trigger**: Push to master, pull requests
- **Purpose**: Main CI pipeline with all validation steps
- **Steps**: Syntax check, JSON validation, security scan, bundle size check, SDK validation

### syntax-check.yml
- **Trigger**: Push to master, pull requests
- **Purpose**: Node.js syntax validation for all JS files
- **Command**: `node --check <files>`

### validate.yml
- **Trigger**: Push to master, pull requests
- **Purpose**: Homey SDK validation
- **Command**: `npx homey app validate --level publish`

### code-quality.yml
- **Trigger**: Push to master, pull requests
- **Purpose**: Code quality checks (linting, style, best practices)

---

## Publishing

### publish.yml
- **Trigger**: Manual dispatch
- **Purpose**: Publish app to Homey App Store (draft)
- **Steps**: Validate, build, publish draft

### publish-stable.yml
- **Trigger**: Manual dispatch
- **Purpose**: Publish stable release to Homey App Store
- **Steps**: Validate, build, publish stable

### auto-publish-on-push.yml
- **Trigger**: Push to master
- **Purpose**: Auto-publish draft when code is pushed to master
- **Condition**: Only on master branch

### draft-to-test.yml
- **Trigger**: Manual dispatch
- **Purpose**: Promote draft version to test channel

### daily-promote-to-test.yml
- **Trigger**: Daily at 06:00 UTC
- **Purpose**: Auto-promote latest draft to test channel

### sunday-master.yml
- **Trigger**: Every Sunday at 00:00 UTC
- **Purpose**: Weekly master branch maintenance and promotion

---

## Daily Maintenance

### daily-maintenance.yml
- **Trigger**: Daily at 02:00 UTC
- **Purpose**: Daily housekeeping tasks
- **Tasks**: Clean caches, validate fingerprints, check health metrics

### nightly-auto-process.yml
- **Trigger**: Daily at 03:00 UTC
- **Purpose**: Nightly automated processing
- **Tasks**: Process forum issues, update fingerprints, sync upstream

---

## Weekly Tasks

### weekly-verification.yml
- **Trigger**: Every Monday at 00:00 UTC
- **Purpose**: Weekly verification of all drivers and configurations
- **Tasks**: Validate all drivers, check fingerprints, verify flow cards

### weekly-fingerprint-sync.yml
- **Trigger**: Every Wednesday at 00:00 UTC
- **Purpose**: Sync fingerprints from external sources (Z2M, ZHA, blakadder)
- **Sources**: zigbee-herdsman-converters, zha-device-handlers, zigbee.blakadder.com

### weekly-external-sync.yml
- **Trigger**: Every Friday at 00:00 UTC
- **Purpose**: Sync with external device databases and communities

---

## Monthly Tasks

### ai-monthly-audit.yml
- **Trigger**: 1st of every month at 00:00 UTC
- **Purpose**: AI-powered deep analysis of codebase
- **Features**: Claude/OpenAI/Gemini integration, comprehensive audit report
- **Output**: Automatic PR with audit results

### monthly-enrichment.yml
- **Trigger**: 1st of every month at 01:00 UTC
- **Purpose**: Monthly enrichment from Z2M/ZHA/deCONZ sources
- **Tasks**: Cross-reference DPs, update fingerprints, add new devices

### monthly-device-enrichment.yml
- **Trigger**: 1st of every month at 02:00 UTC
- **Purpose**: Device-specific enrichment and configuration updates

### monthly-scan.yml
- **Trigger**: 1st of every month at 03:00 UTC
- **Purpose**: Monthly comprehensive scan of all drivers

### monthly-community-sync.yml
- **Trigger**: 1st of every month at 04:00 UTC
- **Purpose**: Sync with community contributions and forum posts

### monthly-tuya-intelligence.yml
- **Trigger**: 1st of every month at 05:00 UTC
- **Purpose**: Tuya protocol intelligence gathering and analysis

---

## Issue Management

### auto-close-supported.yml
- **Trigger**: Issue opened
- **Purpose**: Auto-close issues for already-supported devices
- **Logic**: Check fingerprints, close with helpful message if device is supported

### auto-reopen-on-comment.yml
- **Trigger**: Issue comment
- **Purpose**: Reopen closed issues when user comments with new information

### bug-report-auto-pr.yml
- **Trigger**: Issue labeled 'bug'
- **Purpose**: Auto-create PR for bug fixes when possible

### labeler.yml
- **Trigger**: Issue/PR opened
- **Purpose**: Auto-label issues and PRs based on content

### stale.yml
- **Trigger**: Daily
- **Purpose**: Mark stale issues/PRs and auto-close after timeout

### upstream-auto-triage.yml
- **Trigger**: Issue opened with upstream reference
- **Purpose**: Auto-triage issues referencing upstream projects

### smart-pr-merge.yml
- **Trigger**: PR ready to merge
- **Purpose**: Smart PR merging with validation checks

### notifications.yml
- **Trigger**: Various events
- **Purpose**: Send notifications for important events

---

## Synchronization

### johan-sdk3-sync.yml
- **Trigger**: Weekly
- **Purpose**: Sync with JohanBendz/com.tuya.zigbee for new patterns and devices

### enrich-drivers.yml
- **Trigger**: Manual dispatch
- **Purpose**: Enrich drivers with external data sources

---

## Monitoring

### collect-diagnostics.yml
- **Trigger**: Manual dispatch
- **Purpose**: Collect diagnostic information from devices

### gmail-diagnostics.yml
- **Trigger**: Manual dispatch
- **Purpose**: Process Gmail diagnostic reports

### gmail-token-keepalive.yml
- **Trigger**: Daily
- **Purpose**: Keep Gmail API tokens alive

### tuya-deep-diag.yml
- **Trigger**: Manual dispatch
- **Purpose**: Deep Tuya device diagnostics

### test-api-keys.yml
- **Trigger**: Manual dispatch
- **Purpose**: Test API key validity

---

## Utility

### deploy-pages.yml
- **Trigger**: Push to master
- **Purpose**: Deploy GitHub Pages documentation

### dependabot-auto-merge.yml
- **Trigger**: Dependabot PR
- **Purpose**: Auto-merge safe dependency updates

---

## Workflow Statistics

| Category | Count | Schedule |
|----------|-------|----------|
| CI/CD Pipeline | 4 | On push/PR |
| Publishing | 6 | Manual/daily/weekly |
| Daily Maintenance | 2 | Daily |
| Weekly Tasks | 3 | Weekly |
| Monthly Tasks | 6 | Monthly |
| Issue Management | 8 | On event |
| Synchronization | 2 | Weekly/manual |
| Monitoring | 5 | Manual/daily |
| Utility | 2 | On push/Dependabot |
| **Total** | **40** | |

---

## Common Workflow Patterns

### Scheduled Workflows
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 02:00 UTC
    - cron: '0 0 * * 1'  # Weekly on Monday
    - cron: '0 0 1 * *'  # Monthly on 1st
```

### Manual Dispatch
```yaml
on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run mode'
        required: false
        default: 'false'
```

### Push to Master
```yaml
on:
  push:
    branches: [master]
    paths:
      - 'drivers/**'
      - 'lib/**'
      - 'app.js'
```

### Pull Request
```yaml
on:
  pull_request:
    branches: [master]
    types: [opened, synchronize, reopened]
```

---

## Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `GITHUB_TOKEN` | GitHub API access | Current repo |
| `GH_PAT` | Cross-repo access | All repos |
| `HOMEY_PAT` | Homey API access | App store |
| `TUYA_ACCESS_ID` | Tuya Cloud API | Device discovery |
| `TUYA_ACCESS_KEY` | Tuya Cloud API | Device discovery |

---

## Secrets Management

- All secrets stored in GitHub repository settings
- Never committed to .git/config
- Rotated periodically
- Scoped to minimum required permissions
