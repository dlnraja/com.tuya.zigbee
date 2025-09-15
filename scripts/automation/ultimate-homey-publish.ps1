#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Ultimate Homey Publish Automation - Robust PowerShell Script
    
.DESCRIPTION
    Advanced PowerShell script to automate Homey app publication with intelligent prompt handling
    Uses direct keyboard simulation and process automation for maximum reliability
    
.NOTES
    Version: 2.0
    Author: Ultimate Zigbee Hub Team
    Requires: PowerShell 7+, Homey CLI, Windows
#>

param(
    [string]$AppPath = "C:\Users\HP\Desktop\tuya_repair",
    [string]$Changelog = "Ultimate Zigbee Hub v1.1.2 - AUTOMATED PUBLICATION SUCCESS - Publication automation system implemented. Support étendu pour 1500+ appareils Zigbee de 80+ fabricants avec SDK3 complet.",
    [string]$VersionType = "patch",
    [int]$MaxAttempts = 3,
    [int]$TimeoutSeconds = 300
)

# Import required modules
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Initialize logging
$LogFile = Join-Path $AppPath "logs\publish-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
New-Item -Path (Split-Path $LogFile) -ItemType Directory -Force -ErrorAction SilentlyContinue

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry -ErrorAction SilentlyContinue
}

function Send-Keys {
    param([string]$Keys, [int]$DelayMs = 500)
    Start-Sleep -Milliseconds $DelayMs
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
}

function Test-HomeyCLI {
    try {
        $version = homey --version 2>$null
        if ($version) {
            Write-Log "✅ Homey CLI detected: $version"
            return $true
        }
    }
    catch {
        Write-Log "❌ Homey CLI not found" -Level "ERROR"
        return $false
    }
    return $false
}

function Invoke-HomeyValidation {
    Write-Log "🔍 Validating app structure..."
    
    Set-Location $AppPath
    
    try {
        $result = homey app validate --level=publish 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "✅ App validation successful"
            return $true
        } else {
            Write-Log "❌ App validation failed: $result" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "❌ Validation error: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

function Invoke-HomeyPublish {
    param([int]$AttemptNumber)
    
    Write-Log "📤 Starting publication attempt $AttemptNumber/$MaxAttempts..."
    
    Set-Location $AppPath
    
    try {
        # Start homey app publish process
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "homey"
        $processInfo.Arguments = "app publish"
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardInput = $true
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        $process.Start()
        
        # Create output handler
        $outputBuilder = New-Object System.Text.StringBuilder
        $errorBuilder = New-Object System.Text.StringBuilder
        
        $outputAction = {
            if (-not [String]::IsNullOrEmpty($Event.SourceEventArgs.Data)) {
                $outputBuilder.AppendLine($Event.SourceEventArgs.Data)
            }
        }
        
        $errorAction = {
            if (-not [String]::IsNullOrEmpty($Event.SourceEventArgs.Data)) {
                $errorBuilder.AppendLine($Event.SourceEventArgs.Data)
            }
        }
        
        Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outputAction
        Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $errorAction
        
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        # Handle prompts with intelligent timing
        $startTime = Get-Date
        $promptHandled = @()
        
        while (-not $process.HasExited -and ((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSeconds) {
            $currentOutput = $outputBuilder.ToString()
            
            # Handle uncommitted changes prompt
            if ($currentOutput -match "uncommitted changes.*continue" -and "uncommitted" -notin $promptHandled) {
                Write-Log "💬 Handling uncommitted changes prompt..."
                $process.StandardInput.WriteLine("y")
                $promptHandled += "uncommitted"
                Start-Sleep -Seconds 1
            }
            
            # Handle version update prompt
            elseif ($currentOutput -match "update.*version number" -and "version" -notin $promptHandled) {
                Write-Log "💬 Handling version update prompt..."
                $process.StandardInput.WriteLine("y")
                $promptHandled += "version"
                Start-Sleep -Seconds 1
            }
            
            # Handle version selection menu
            elseif ($currentOutput -match "Select.*version.*Patch" -and "selection" -notin $promptHandled) {
                Write-Log "💬 Selecting Patch version..."
                $process.StandardInput.WriteLine("")  # Press Enter to select default Patch
                $promptHandled += "selection"
                Start-Sleep -Seconds 1
            }
            
            # Handle changelog prompt
            elseif ($currentOutput -match "changelog" -and "changelog" -notin $promptHandled) {
                Write-Log "💬 Entering changelog..."
                $process.StandardInput.WriteLine($Changelog)
                $promptHandled += "changelog"
                Start-Sleep -Seconds 1
            }
            
            # Check for success
            if ($currentOutput -match "published.*successfully") {
                Write-Log "🎉 Publication successful!"
                break
            }
            
            # Check for errors
            if ($currentOutput -match "error|failed" -or $errorBuilder.ToString() -match "error|failed") {
                Write-Log "❌ Publication error detected" -Level "ERROR"
                break
            }
            
            Start-Sleep -Milliseconds 500
        }
        
        # Wait for process to complete
        if (-not $process.WaitForExit(5000)) {
            Write-Log "⏰ Process timeout, terminating..." -Level "WARNING"
            $process.Kill()
        }
        
        $finalOutput = $outputBuilder.ToString()
        $finalError = $errorBuilder.ToString()
        
        Write-Log "📋 Final Output: $finalOutput"
        if ($finalError) {
            Write-Log "❌ Final Error: $finalError" -Level "ERROR"
        }
        
        # Cleanup events
        Get-EventSubscriber | Unregister-Event
        
        return $process.ExitCode -eq 0 -and $finalOutput -match "published.*successfully"
    }
    catch {
        Write-Log "❌ Publication attempt failed: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

function Update-AppVersion {
    Write-Log "📈 Updating app version to trigger publication..."
    
    $appJsonPath = Join-Path $AppPath "app.json"
    if (Test-Path $appJsonPath) {
        try {
            $appJson = Get-Content $appJsonPath -Raw | ConvertFrom-Json
            $currentVersion = $appJson.version
            
            # Increment patch version
            if ($currentVersion -match "(\d+)\.(\d+)\.(\d+)") {
                $major = [int]$Matches[1]
                $minor = [int]$Matches[2]
                $patch = [int]$Matches[3] + 1
                $newVersion = "$major.$minor.$patch"
                
                $appJson.version = $newVersion
                $appJson | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath -Encoding UTF8
                
                Write-Log "✅ Version updated from $currentVersion to $newVersion"
                return $newVersion
            }
        }
        catch {
            Write-Log "❌ Failed to update version: $($_.Exception.Message)" -Level "ERROR"
        }
    }
    return $null
}

# Main execution
Write-Log "🚀 ULTIMATE HOMEY PUBLISH AUTOMATION STARTING..."
Write-Log "📁 App Path: $AppPath"
Write-Log "📋 Changelog: $Changelog"

# Verify prerequisites
if (-not (Test-HomeyCLI)) {
    Write-Log "❌ Homey CLI not available, exiting" -Level "ERROR"
    exit 1
}

# Update version
$newVersion = Update-AppVersion
if ($newVersion) {
    Write-Log "✅ Version updated to: $newVersion"
}

# Validate app
if (-not (Invoke-HomeyValidation)) {
    Write-Log "❌ App validation failed, exiting" -Level "ERROR"
    exit 1
}

# Attempt publication
$success = $false
for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    if (Invoke-HomeyPublish -AttemptNumber $attempt) {
        $success = $true
        break
    }
    
    if ($attempt -lt $MaxAttempts) {
        Write-Log "🔄 Waiting before retry..."
        Start-Sleep -Seconds 5
    }
}

if ($success) {
    Write-Log "🎉 SUCCESS: Ultimate Zigbee Hub published successfully!"
    Write-Log "📱 App is now available on Homey App Store"
    Write-Log "🔗 Check status: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub"
    exit 0
} else {
    Write-Log "❌ FAILED: All publication attempts failed" -Level "ERROR"
    Write-Log "📋 Check log file: $LogFile"
    exit 1
}
