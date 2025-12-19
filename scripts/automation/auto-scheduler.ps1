# 🤖 AUTO-SCHEDULER v1.0.0 - Gestionnaire Windows pour GitHub Auto-Monitor
#
# Système de scheduling Windows natif avec:
# - Exécution automatique régulière
# - Gestion des erreurs et recovery
# - Logs détaillés Windows
# - Interface de contrôle PowerShell
# - Monitoring système intégré

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("Start", "Stop", "Status", "Install", "Uninstall", "RunOnce", "Logs")]
    [string]$Action = "Status",

    [Parameter(Mandatory=$false)]
    [int]$IntervalMinutes = 60,

    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = "c:\Users\HP\Desktop\homey app\tuya_repair"
)

# Configuration
$Config = @{
    ServiceName = "GitHubAutoMonitor"
    TaskName = "TuyaZigbeeAutoMonitor"
    ScriptPath = "$ProjectPath\scripts\automation\github-auto-monitor.js"
    LogPath = "$ProjectPath\logs\automation"
    PidFile = "$ProjectPath\logs\automation\monitor.pid"
    StatusFile = "$ProjectPath\logs\automation\status.json"
    IntervalMinutes = $IntervalMinutes
}

# Ensure logs directory exists
if (!(Test-Path $Config.LogPath)) {
    New-Item -ItemType Directory -Path $Config.LogPath -Force | Out-Null
}

function Write-AutoLog {
    param($Level, $Message, $Data = $null)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogLine = "[$Timestamp] [$Level] $Message"

    Write-Host $LogLine -ForegroundColor $(
        switch($Level) {
            "ERROR" { "Red" }
            "WARN" { "Yellow" }
            "SUCCESS" { "Green" }
            "INFO" { "Cyan" }
            default { "White" }
        }
    )

    $LogFile = Join-Path $Config.LogPath "scheduler-$(Get-Date -Format 'yyyy-MM-dd').log"
    Add-Content -Path $LogFile -Value $LogLine

    if ($Data) {
        $DataJson = $Data | ConvertTo-Json -Depth 5
        Add-Content -Path $LogFile -Value $DataJson
    }
}

function Install-AutoMonitor {
    Write-AutoLog "INFO" "Installing GitHub Auto-Monitor as Windows scheduled task..."

    try {
        # Create scheduled task XML
        $TaskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')</Date>
    <Author>TuyaZigbee AutoMonitor</Author>
    <Description>Automatic monitoring of Johan's GitHub for Tuya device requests</Description>
  </RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <Repetition>
        <Interval>PT$($Config.IntervalMinutes)M</Interval>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
      <StartBoundary>$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <DisallowStartOnRemoteAppSession>false</DisallowStartOnRemoteAppSession>
    <UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>node</Command>
      <Arguments>"$($Config.ScriptPath)" --once</Arguments>
      <WorkingDirectory>$ProjectPath</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"@

        # Register the task
        $TaskXml | Out-File -FilePath "$env:TEMP\AutoMonitorTask.xml" -Encoding UTF8
        schtasks /create /tn $Config.TaskName /xml "$env:TEMP\AutoMonitorTask.xml" /f
        Remove-Item "$env:TEMP\AutoMonitorTask.xml" -Force

        Write-AutoLog "SUCCESS" "Scheduled task '$($Config.TaskName)' installed successfully"
        Write-AutoLog "INFO" "Task will run every $($Config.IntervalMinutes) minutes"

        # Update status
        Update-Status -Status "Installed" -Message "Auto-monitor scheduled task active"

    } catch {
        Write-AutoLog "ERROR" "Failed to install scheduled task: $($_.Exception.Message)"
        throw
    }
}

function Uninstall-AutoMonitor {
    Write-AutoLog "INFO" "Uninstalling GitHub Auto-Monitor scheduled task..."

    try {
        schtasks /delete /tn $Config.TaskName /f 2>$null
        Write-AutoLog "SUCCESS" "Scheduled task '$($Config.TaskName)' removed"

        # Clean up PID file
        if (Test-Path $Config.PidFile) {
            Remove-Item $Config.PidFile -Force
        }

        Update-Status -Status "Uninstalled" -Message "Auto-monitor stopped and removed"

    } catch {
        Write-AutoLog "WARN" "Task may not have been installed or already removed"
    }
}

function Start-AutoMonitor {
    Write-AutoLog "INFO" "Starting GitHub Auto-Monitor..."

    try {
        # Check if already running
        if (Get-MonitorProcess) {
            Write-AutoLog "WARN" "Auto-monitor is already running"
            return
        }

        # Start the Node.js process
        $ProcessInfo = Start-Process -FilePath "node" -ArgumentList "`"$($Config.ScriptPath)`"" -WorkingDirectory $ProjectPath -PassThru -WindowStyle Hidden

        # Save PID
        $ProcessInfo.Id | Out-File -FilePath $Config.PidFile -Encoding ASCII

        Write-AutoLog "SUCCESS" "Auto-monitor started with PID: $($ProcessInfo.Id)"
        Update-Status -Status "Running" -Message "Auto-monitor active, PID: $($ProcessInfo.Id)"

    } catch {
        Write-AutoLog "ERROR" "Failed to start auto-monitor: $($_.Exception.Message)"
        throw
    }
}

function Stop-AutoMonitor {
    Write-AutoLog "INFO" "Stopping GitHub Auto-Monitor..."

    try {
        $Process = Get-MonitorProcess
        if ($Process) {
            $Process | Stop-Process -Force
            Write-AutoLog "SUCCESS" "Auto-monitor stopped (PID: $($Process.Id))"
        } else {
            Write-AutoLog "INFO" "Auto-monitor was not running"
        }

        # Clean up PID file
        if (Test-Path $Config.PidFile) {
            Remove-Item $Config.PidFile -Force
        }

        Update-Status -Status "Stopped" -Message "Auto-monitor manually stopped"

    } catch {
        Write-AutoLog "ERROR" "Failed to stop auto-monitor: $($_.Exception.Message)"
    }
}

function Get-MonitorProcess {
    if (Test-Path $Config.PidFile) {
        $PID = Get-Content $Config.PidFile -ErrorAction SilentlyContinue
        if ($PID) {
            return Get-Process -Id $PID -ErrorAction SilentlyContinue
        }
    }
    return $null
}

function Get-MonitorStatus {
    $Process = Get-MonitorProcess
    $TaskExists = (schtasks /query /tn $Config.TaskName 2>$null) -ne $null

    $Status = @{
        ProcessRunning = $Process -ne $null
        ProcessPID = if ($Process) { $Process.Id } else { $null }
        ScheduledTaskInstalled = $TaskExists
        LastRun = $null
        NextRun = $null
        Statistics = @{}
    }

    # Get task information if exists
    if ($TaskExists) {
        try {
            $TaskInfo = schtasks /query /tn $Config.TaskName /fo csv /v | ConvertFrom-Csv
            $Status.LastRun = $TaskInfo.'Last Run Time'
            $Status.NextRun = $TaskInfo.'Next Run Time'
        } catch {
            Write-AutoLog "WARN" "Could not retrieve scheduled task details"
        }
    }

    # Load statistics from status file
    if (Test-Path $Config.StatusFile) {
        try {
            $StatusData = Get-Content $Config.StatusFile | ConvertFrom-Json
            $Status.Statistics = $StatusData
        } catch {
            Write-AutoLog "WARN" "Could not load status file"
        }
    }

    return $Status
}

function Update-Status {
    param($Status, $Message, $Statistics = @{})

    $StatusData = @{
        Status = $Status
        Message = $Message
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Statistics = $Statistics
    }

    try {
        $StatusData | ConvertTo-Json -Depth 5 | Out-File -FilePath $Config.StatusFile -Encoding UTF8
    } catch {
        Write-AutoLog "WARN" "Could not update status file: $($_.Exception.Message)"
    }
}

function Run-Once {
    Write-AutoLog "INFO" "Running GitHub Auto-Monitor once..."

    try {
        # Change to project directory
        Push-Location $ProjectPath

        # Run the Node.js script
        $Output = & node $Config.ScriptPath --once 2>&1
        $ExitCode = $LASTEXITCODE

        Pop-Location

        if ($ExitCode -eq 0) {
            Write-AutoLog "SUCCESS" "Single run completed successfully"
            Write-AutoLog "INFO" "Output: $Output"
        } else {
            Write-AutoLog "ERROR" "Single run failed with exit code: $ExitCode"
            Write-AutoLog "ERROR" "Output: $Output"
        }

    } catch {
        Write-AutoLog "ERROR" "Failed to run auto-monitor: $($_.Exception.Message)"
        Pop-Location
    }
}

function Show-Logs {
    $LogFiles = Get-ChildItem -Path $Config.LogPath -Filter "*.log" | Sort-Object LastWriteTime -Descending

    Write-Host "`n🔍 Available Log Files:" -ForegroundColor Cyan

    for ($i = 0; $i -lt [Math]::Min($LogFiles.Count, 5); $i++) {
        $LogFile = $LogFiles[$i]
        Write-Host "  [$($i+1)] $($LogFile.Name) ($(($LogFile.Length / 1KB).ToString('F1')) KB)" -ForegroundColor White
    }

    Write-Host "`nSelect log file to view (1-$([Math]::Min($LogFiles.Count, 5)), or Enter for latest): " -NoNewline -ForegroundColor Yellow
    $Selection = Read-Host

    if ([string]::IsNullOrEmpty($Selection)) {
        $SelectedFile = $LogFiles[0]
    } else {
        $Index = [int]$Selection - 1
        if ($Index -ge 0 -and $Index -lt $LogFiles.Count) {
            $SelectedFile = $LogFiles[$Index]
        } else {
            Write-Host "Invalid selection" -ForegroundColor Red
            return
        }
    }

    Write-Host "`n📄 Showing last 50 lines of: $($SelectedFile.Name)" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Gray

    Get-Content -Path $SelectedFile.FullName -Tail 50 | ForEach-Object {
        if ($_ -match "\[ERROR\]") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "\[WARN\]") {
            Write-Host $_ -ForegroundColor Yellow
        } elseif ($_ -match "\[SUCCESS\]") {
            Write-Host $_ -ForegroundColor Green
        } else {
            Write-Host $_
        }
    }
}

function Show-StatusDisplay {
    $Status = Get-MonitorStatus

    Write-Host "`n🤖 GitHub Auto-Monitor Status Dashboard" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Gray

    # Process Status
    if ($Status.ProcessRunning) {
        Write-Host "🟢 Process Status: " -NoNewline -ForegroundColor Green
        Write-Host "RUNNING (PID: $($Status.ProcessPID))" -ForegroundColor White
    } else {
        Write-Host "🔴 Process Status: " -NoNewline -ForegroundColor Red
        Write-Host "NOT RUNNING" -ForegroundColor White
    }

    # Scheduled Task Status
    if ($Status.ScheduledTaskInstalled) {
        Write-Host "🟢 Scheduled Task: " -NoNewline -ForegroundColor Green
        Write-Host "INSTALLED" -ForegroundColor White
        if ($Status.LastRun) {
            Write-Host "   Last Run: $($Status.LastRun)" -ForegroundColor Gray
        }
        if ($Status.NextRun) {
            Write-Host "   Next Run: $($Status.NextRun)" -ForegroundColor Gray
        }
    } else {
        Write-Host "🔴 Scheduled Task: " -NoNewline -ForegroundColor Red
        Write-Host "NOT INSTALLED" -ForegroundColor White
    }

    # Statistics
    if ($Status.Statistics.Keys.Count -gt 0) {
        Write-Host "`n📊 Statistics:" -ForegroundColor Cyan
        $Status.Statistics | Format-Table -AutoSize
    }

    Write-Host "`n⚡ Available Commands:" -ForegroundColor Yellow
    Write-Host "  Install   - Install scheduled task" -ForegroundColor White
    Write-Host "  Uninstall - Remove scheduled task" -ForegroundColor White
    Write-Host "  Start     - Start continuous monitoring" -ForegroundColor White
    Write-Host "  Stop      - Stop monitoring process" -ForegroundColor White
    Write-Host "  RunOnce   - Execute single monitoring cycle" -ForegroundColor White
    Write-Host "  Logs      - View recent logs" -ForegroundColor White
}

# Main execution logic
switch ($Action) {
    "Install" {
        Install-AutoMonitor
    }
    "Uninstall" {
        Uninstall-AutoMonitor
    }
    "Start" {
        Start-AutoMonitor
    }
    "Stop" {
        Stop-AutoMonitor
    }
    "Status" {
        Show-StatusDisplay
    }
    "RunOnce" {
        Run-Once
    }
    "Logs" {
        Show-Logs
    }
}
