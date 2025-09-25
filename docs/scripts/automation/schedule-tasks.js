#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-08-16T10:50:06.506Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

param(
  [string]$ProjectPath = (Get-Location).Path,
  [string]$NodePath = "node",
  [string]$TaskPrefix = "TuyaRepair-"
)

console.log "Scheduling tasks for project: $ProjectPath"

$ActionMega = New-ScheduledTaskAction -Execute $NodePath -Argument "scripts/mega-sources-complete.js" -WorkingDirectory $ProjectPath
$TriggerMonthly = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At 03:00
Register-ScheduledTask -TaskName ($TaskPrefix + "MegaMonthly") -Action $ActionMega -Trigger $TriggerMonthly -Description "Run MEGA monthly to enrich drivers" -Force | Out-Null

$ActionWeekly = New-ScheduledTaskAction -Execute $NodePath -Argument "scripts/sources/sources-orchestrator.js" -WorkingDirectory $ProjectPath
$TriggerWeekly = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 02:00
Register-ScheduledTask -TaskName ($TaskPrefix + "SourcesWeekly") -Action $ActionWeekly -Trigger $TriggerWeekly -Description "Run sources scraping/parsing weekly" -Force | Out-Null

console.log "Scheduled: MegaMonthly (monthly) and SourcesWeekly (weekly)."
