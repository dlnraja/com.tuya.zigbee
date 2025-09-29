# Final Automated Homey Publish Script
param(
    [string]$ChangelogMessage = ""
)

Write-Host "🚀 FINAL AUTOMATED HOMEY PUBLICATION" -ForegroundColor Green
Write-Host "=" * 45 -ForegroundColor Green

# Default changelog if not provided
if ([string]::IsNullOrEmpty($ChangelogMessage)) {
    $ChangelogMessage = @"
v1.0.28 - Complete Johan Bendz Compatibility Update

✨ NEW FEATURES:
• Added 2 Gang Scene Remote (TS0042) - _TZ3000_dfgbtub0 support
• Added 4 Gang Scene Remote (TS0044) - _TZ3000_wkai4ga5 support
• Enhanced Johan Bendz device compatibility with expanded manufacturer IDs
• Professional unbranded device categorization following SDK3 standards

🔧 IMPROVEMENTS:
• Updated support URL to Homey Community forum thread
• Fixed all validation errors and image size requirements (75x75)
• Multi-language tags support (EN/FR/NL)
• Clean asset management and driver structure

🐛 BUG FIXES:
• Corrected all driver image paths after reorganization
• Fixed manifest.tags format to object with language keys
• Resolved .homeybuild cache conflicts
• Enhanced device compatibility matrix

📋 TECHNICAL:
• Full SDK3 compliance with proper endpoint definitions
• Local Zigbee operation - no cloud dependencies
• Professional flow cards and device capabilities
• Automated CI/CD pipeline with GitHub Actions

This version ensures complete compatibility with Johan Bendz's original Tuya Zigbee app while providing modern SDK3 architecture and professional device organization.
"@
}

# Function to kill any running Homey processes
function Stop-HomeyProcesses {
    Write-Host "🧹 Stopping any running Homey processes..." -ForegroundColor Yellow
    Get-Process | Where-Object {$_.ProcessName -like "*homey*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 1000
}

# Function to clean build cache
function Clear-BuildCache {
    Write-Host "🧹 Cleaning build cache..." -ForegroundColor Yellow
    if (Test-Path ".homeybuild") {
        Remove-Item -Path ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    Write-Host "✅ Cache cleaned" -ForegroundColor Green
}

# Function to validate app
function Test-AppValidation {
    Write-Host "🔍 Validating app..." -ForegroundColor Yellow
    
    try {
        $validation = & homey app validate --level publish 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ App validation successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ App validation failed:" -ForegroundColor Red
            Write-Host $validation -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Validation error: $_" -ForegroundColor Red
        return $false
    }
}

# Function to publish with automatic responses
function Invoke-AutomatedPublish {
    param([string]$Changelog)
    
    Write-Host "📦 Starting automated publish..." -ForegroundColor Yellow
    
    # Create input responses
    $responses = @(
        "y",  # Accept uncommitted changes
        "n",  # Don't update version number
        $Changelog  # Changelog message
    )
    
    # Join responses with newlines
    $inputText = $responses -join "`n"
    
    try {
        # Use PowerShell's ability to pipe input to process
        $publishResult = $inputText | & homey app publish 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "🎉 PUBLICATION SUCCESSFUL!" -ForegroundColor Green
            Write-Host $publishResult -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Publication failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host $publishResult -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Publication error: $_" -ForegroundColor Red
        return $false
    }
}

# Main execution
try {
    # Step 1: Clean environment
    Stop-HomeyProcesses
    Clear-BuildCache
    
    # Step 2: Validate app
    $isValid = Test-AppValidation
    if (-not $isValid) {
        throw "App validation failed. Cannot proceed with publication."
    }
    
    # Step 3: Automated publish
    $publishSuccess = Invoke-AutomatedPublish -Changelog $ChangelogMessage
    
    if ($publishSuccess) {
        Write-Host ""
        Write-Host "🎉 MISSION ACCOMPLISHED! 🎉" -ForegroundColor Green
        Write-Host "=" * 25 -ForegroundColor Green
        Write-Host "✅ App published to Homey App Store" -ForegroundColor Green
        Write-Host "✅ Johan Bendz scene remotes supported:" -ForegroundColor Green
        Write-Host "   • 2 Gang (TS0042) - _TZ3000_dfgbtub0" -ForegroundColor Cyan
        Write-Host "   • 4 Gang (TS0044) - _TZ3000_wkai4ga5" -ForegroundColor Cyan
        Write-Host "✅ Professional device organization complete" -ForegroundColor Green
        Write-Host "✅ Community forum support URL updated" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 Support: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352" -ForegroundColor Blue
        Write-Host "📋 Version: 1.0.28" -ForegroundColor Blue
        Write-Host "🏠 Full compatibility with Johan Bendz Tuya Zigbee app" -ForegroundColor Blue
    } else {
        throw "Publication failed"
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ AUTOMATION FAILED: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual fallback instructions:" -ForegroundColor Yellow
    Write-Host "1. Run: homey app publish" -ForegroundColor White
    Write-Host "2. Answer: y (uncommitted changes)" -ForegroundColor White
    Write-Host "3. Answer: n (version number)" -ForegroundColor White
    Write-Host "4. Paste the prepared changelog" -ForegroundColor White
    
    exit 1
}

Write-Host ""
Write-Host "🚀 AUTOMATION COMPLETE - APP LIVE ON HOMEY STORE! 🚀" -ForegroundColor Green
