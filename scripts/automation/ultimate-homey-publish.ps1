#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Ultimate Homey Publish Automation - Robust PowerShell Script
    
.DESCRIPTION
    Advanced PowerShell script to automate Homey app publication with intelligent prompt handling
    Uses direct input automation for maximum reliability
    
.NOTES
    Version: 2.1
    Author: Ultimate Zigbee Hub Team  
    Requires: PowerShell 7+, Homey CLI, Windows
#>

param(
    [string]$AppPath = "C:\Users\HP\Desktop\tuya_repair",
    [string]$Changelog = "Ultimate Zigbee Hub v1.1.2 - AUTOMATED PUBLICATION SUCCESS - Publication automation system implemented. Support etendu pour 1500+ appareils Zigbee de 80+ fabricants avec SDK3 complet.",
    [string]$VersionType = "patch",
    [int]$MaxAttempts = 3,
    [int]$TimeoutSeconds = 300
)

# Initialize logging
$LogFile = Join-Path $AppPath "logs/publish-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
New-Item -Path (Split-Path $LogFile) -ItemType Directory -Force -ErrorAction SilentlyContinue

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry -ErrorAction SilentlyContinue
}

function Test-HomeyCLI {
    try {
        $version = homey --version 2>$null
        if ($version) {
            Write-Log "Check Homey CLI detected: $version"
            return $true
        }
    }
    catch {
        Write-Log "Homey CLI not found" -Level "ERROR"
        return $false
    }
    return $false
}

function Invoke-HomeyValidation {
    Write-Log "Validating app structure..."
    
    Set-Location $AppPath
    
    try {
        $result = homey app validate --level=publish 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "App validation successful"
            return $true
        } else {
            Write-Log "App validation failed: $result" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Validation error: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

function Update-AppVersion {
    Write-Log "Updating app version to trigger publication..."
    
    # Fix BOM encoding issue first
    Write-Log "Fixing app.json encoding..."
    & node -e "const fs = require('fs'); const content = fs.readFileSync('.homeycompose/app.json', 'utf8'); fs.writeFileSync('app.json', content, 'utf8');"
    
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
                
                # Fix encoding again after modification
                & node -e "const fs = require('fs'); const content = fs.readFileSync('app.json', 'utf8').replace(/^\uFEFF/, ''); fs.writeFileSync('app.json', content, 'utf8');"
                
                Write-Log "Version updated from $currentVersion to $newVersion"
                return $newVersion
            }
        }
        catch {
            Write-Log "Failed to update version: $($_.Exception.Message)" -Level "ERROR"
        }
    }
    return $null
}

function Invoke-HomeyPublish {
    param([int]$AttemptNumber)
    
    Write-Log "Starting publication attempt $AttemptNumber/$MaxAttempts..."
    
    Set-Location $AppPath
    
    # Use cmd with echo piping for automated responses
    $responses = @(
        "y",  # uncommitted changes
        "y",  # version update 
        "",   # select patch (default)
        $Changelog  # changelog
    )
    
    $responseString = ($responses -join "`n") + "`n"
    
    try {
        Write-Log "Executing homey app publish with automated responses..."
        
        # Create temp file with responses
        $tempFile = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $tempFile -Value $responseString -Encoding ASCII
        
        # Execute with input redirection
        $result = cmd /c "type `"$tempFile`" | homey app publish" 2>&1
        
        # Clean up temp file
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        
        Write-Log "Publication output: $result"
        
        # Check for success indicators
        if ($result -match "published.*successfully|App uploaded successfully") {
            Write-Log "Publication successful!"
            return $true
        }
        
        Write-Log "Publication failed or incomplete" -Level "ERROR"
        return $false
    }
    catch {
        Write-Log "Publication attempt failed: $($_.Exception.Message)" -Level "ERROR"
        return $false
    }
}

# Main execution
Write-Log "ULTIMATE HOMEY PUBLISH AUTOMATION STARTING..."
Write-Log "App Path: $AppPath"
Write-Log "Changelog: $Changelog"

# Verify prerequisites
if (-not (Test-HomeyCLI)) {
    Write-Log "Homey CLI not available, exiting" -Level "ERROR"
    exit 1
}

# Update version
$newVersion = Update-AppVersion
if ($newVersion) {
    Write-Log "Version updated to: $newVersion"
}

# Validate app
if (-not (Invoke-HomeyValidation)) {
    Write-Log "App validation failed, exiting" -Level "ERROR"
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
        Write-Log "Waiting before retry..."
        Start-Sleep -Seconds 5
    }
}

if ($success) {
    Write-Log "SUCCESS: Ultimate Zigbee Hub published successfully!"
    Write-Log "App is now available on Homey App Store"
    Write-Log "Check status: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub"
    exit 0
} else {
    Write-Log "FAILED: All publication attempts failed" -Level "ERROR"
    Write-Log "Check log file: $LogFile"
    exit 1
}
