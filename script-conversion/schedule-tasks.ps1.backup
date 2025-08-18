param(
  [string]$ProjectPath = (Get-Location).Path,
  [string]$NodePath = "node",
  [string]$TaskPrefix = "TuyaRepair-"
)

Write-Host "Scheduling tasks for project: $ProjectPath"

$ActionMega = New-ScheduledTaskAction -Execute $NodePath -Argument "scripts/mega-sources-complete.js" -WorkingDirectory $ProjectPath
$TriggerMonthly = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At 03:00
Register-ScheduledTask -TaskName ($TaskPrefix + "MegaMonthly") -Action $ActionMega -Trigger $TriggerMonthly -Description "Run MEGA monthly to enrich drivers" -Force | Out-Null

$ActionWeekly = New-ScheduledTaskAction -Execute $NodePath -Argument "scripts/sources/sources-orchestrator.js" -WorkingDirectory $ProjectPath
$TriggerWeekly = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 02:00
Register-ScheduledTask -TaskName ($TaskPrefix + "SourcesWeekly") -Action $ActionWeekly -Trigger $TriggerWeekly -Description "Run sources scraping/parsing weekly" -Force | Out-Null

Write-Host "Scheduled: MegaMonthly (monthly) and SourcesWeekly (weekly)."
