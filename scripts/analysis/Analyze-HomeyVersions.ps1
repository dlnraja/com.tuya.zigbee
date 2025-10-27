# Analyze-HomeyVersions.ps1
# PowerShell Cursor-ready version - No Node.js required!
# Analyzes Homey app versions to find reporting issues

param(
    [string]$DownloadPath = "D:\Download",
    [string]$OutputReport = ".\analysis_report.md"
)

Write-Host "🚀 Starting Homey App Analysis (Cursor-ready version)..." -ForegroundColor Cyan
Write-Host ""

# Function to extract ZIP files
function Extract-Zips {
    param([string]$Path)
    
    Write-Host "🔍 Searching for Homey app ZIPs in: $Path" -ForegroundColor Yellow
    
    $zips = Get-ChildItem -Path $Path -Filter "com.dlnraja.tuya.zigbee*.zip" -ErrorAction SilentlyContinue
    $extracted = @()
    
    Write-Host "📦 Found $($zips.Count) ZIP files" -ForegroundColor Green
    
    foreach ($zip in $zips) {
        $name = $zip.BaseName
        $outDir = Join-Path $Path "extracted\$name"
        
        if (-not (Test-Path $outDir)) {
            Write-Host "  📂 Extracting: $name" -ForegroundColor Gray
            Expand-Archive -Path $zip.FullName -DestinationPath $outDir -Force
            $extracted += $outDir
        } else {
            Write-Host "  ✓ Already extracted: $name" -ForegroundColor Gray
            $extracted += $outDir
        }
    }
    
    return $extracted
}

# Function to scan driver data
function Scan-DriverData {
    param([string]$Dir)
    
    $drivers = @()
    $driverFiles = Get-ChildItem -Path $Dir -Filter "driver.compose.json" -Recurse -ErrorAction SilentlyContinue
    
    Write-Host "  📋 Found $($driverFiles.Count) drivers in $(Split-Path $Dir -Leaf)" -ForegroundColor Gray
    
    foreach ($file in $driverFiles) {
        try {
            $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
            
            $driver = @{
                driverId = if ($content.id) { $content.id } else { Split-Path $file.DirectoryName -Leaf }
                name = $content.name.en
                capabilities = $content.capabilities
                manufacturerName = $content.zigbee.manufacturerName
                productId = $content.zigbee.productId
                hasBattery = $content.capabilities -contains "measure_battery"
                hasReporting = (Get-Content $file.FullName -Raw) -match "configureReporting"
            }
            
            $drivers += $driver
        } catch {
            $drivers += @{ error = "Parse error: $($file.FullName)" }
        }
    }
    
    return $drivers
}

# Function to find driver issues
function Find-DriverIssues {
    param([string]$Dir)
    
    $issues = @()
    $driverFiles = Get-ChildItem -Path $Dir -Filter "driver.js" -Recurse -ErrorAction SilentlyContinue
    
    foreach ($file in $driverFiles) {
        $code = Get-Content $file.FullName -Raw
        $fileIssues = @()
        
        if ($code -notmatch "onNodeInit|onInit") {
            $fileIssues += "⚠️ Missing onNodeInit/onInit"
        }
        if ($code -notmatch "configureReporting") {
            $fileIssues += "⚠️ No configureReporting calls"
        }
        if ($code -notmatch "reportListener|attrReport") {
            $fileIssues += "⚠️ No attribute reporting registered"
        }
        if ($code -notmatch "bindCluster|bind") {
            $fileIssues += "⚠️ Missing cluster binding"
        }
        if (($code -match "measure_battery") -and ($code -match "AC|mains|powered")) {
            $fileIssues += "🔴 CRITICAL: measure_battery on AC powered device!"
        }
        
        if ($fileIssues.Count -gt 0) {
            $issues += @{
                file = $file.FullName.Replace($Dir, "").TrimStart('\')
                issues = $fileIssues
            }
        }
    }
    
    return $issues
}

# Function to analyze app manifest
function Get-AppManifest {
    param([string]$Dir)
    
    $appJson = Join-Path $Dir "app.json"
    if (-not (Test-Path $appJson)) {
        return $null
    }
    
    try {
        $data = Get-Content $appJson -Raw | ConvertFrom-Json
        return @{
            version = $data.version
            sdk = $data.sdk
            compatibility = $data.compatibility
        }
    } catch {
        return $null
    }
}

# Function to generate report
function Generate-Report {
    param([array]$Data, [string]$OutputPath)
    
    $md = "# 🧠 Homey App Analysis Report - com.dlnraja.tuya.zigbee`n`n"
    $md += "**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"
    $md += "**Purpose:** Find why data reporting stopped working`n`n"
    $md += "---`n`n"
    
    # Sort by version
    $Data = $Data | Sort-Object { [version]($_.manifest.version) } -Descending
    
    foreach ($entry in $Data) {
        $version = if ($entry.manifest) { $entry.manifest.version } else { Split-Path $entry.dir -Leaf }
        $md += "## 📦 Version: $version`n`n"
        
        if ($entry.manifest) {
            $md += "- **SDK:** $($entry.manifest.sdk)`n"
            $md += "- **Compatibility:** $($entry.manifest.compatibility)`n`n"
        }
        
        $md += "### 📊 Statistics`n"
        $md += "- **Total Drivers:** $($entry.drivers.Count)`n"
        $md += "- **Drivers with Reporting:** $(($entry.drivers | Where-Object { $_.hasReporting }).Count)`n"
        $md += "- **Drivers with Battery:** $(($entry.drivers | Where-Object { $_.hasBattery }).Count)`n`n"
        
        # Sample drivers
        $md += "### 🔍 Sample Drivers (first 5)`n"
        $sampleDrivers = $entry.drivers | Select-Object -First 5
        foreach ($d in $sampleDrivers) {
            if (-not $d.error) {
                $md += "#### $($d.name)`n"
                $md += "- **Driver ID:** $($d.driverId)`n"
                $md += "- **Manufacturer:** $($d.manufacturerName -join ', ')`n"
                $md += "- **Capabilities:** $($d.capabilities -join ', ')`n"
                $md += "- **Has Reporting:** $(if ($d.hasReporting) { '✅' } else { '❌' })`n"
                $md += "- **Has Battery:** $(if ($d.hasBattery) { '🔋' } else { '⚡' })`n`n"
            }
        }
        
        if ($entry.drivers.Count -gt 5) {
            $md += "*... and $($entry.drivers.Count - 5) more drivers*`n`n"
        }
        
        if ($entry.issues.Count -gt 0) {
            $md += "### 🔴 Potential Issues ($($entry.issues.Count))`n"
            foreach ($i in $entry.issues) {
                $md += "#### $($i.file)`n"
                foreach ($issue in $i.issues) {
                    $md += "- $issue`n"
                }
                $md += "`n"
            }
        } else {
            $md += "### ✅ No major issues detected`n`n"
        }
        
        $md += "---`n`n"
    }
    
    # Summary comparison
    $md += "## 📈 Version Comparison`n`n"
    $md += "| Version | SDK | Drivers | With Reporting | With Battery | Issues |`n"
    $md += "|---------|-----|---------|----------------|--------------|--------|`n"
    foreach ($e in $Data) {
        $v = if ($e.manifest) { $e.manifest.version } else { 'unknown' }
        $sdk = if ($e.manifest) { $e.manifest.sdk } else { '?' }
        $total = $e.drivers.Count
        $reporting = ($e.drivers | Where-Object { $_.hasReporting }).Count
        $battery = ($e.drivers | Where-Object { $_.hasBattery }).Count
        $issues = $e.issues.Count
        $md += "| $v | $sdk | $total | $reporting | $battery | $issues |`n"
    }
    $md += "`n"
    
    Set-Content -Path $OutputPath -Value $md -Encoding UTF8
    Write-Host "`n✅ Analysis complete → $(Resolve-Path $OutputPath)" -ForegroundColor Green
}

# Main execution
Write-Host "📂 Extracting ZIPs..." -ForegroundColor Cyan
$dirs = Extract-Zips -Path $DownloadPath
$results = @()

foreach ($dir in $dirs) {
    Write-Host "`n📂 Analyzing: $(Split-Path $dir -Leaf)" -ForegroundColor Cyan
    $manifest = Get-AppManifest -Dir $dir
    $drivers = Scan-DriverData -Dir $dir
    $issues = Find-DriverIssues -Dir $dir
    
    $results += @{
        dir = $dir
        manifest = $manifest
        drivers = $drivers
        issues = $issues
    }
}

Write-Host "`n📝 Generating report..." -ForegroundColor Cyan
Generate-Report -Data $results -OutputPath $OutputReport

Write-Host "`n🎉 Done! Check $OutputReport for results." -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open $OutputReport" -ForegroundColor Gray
Write-Host "  2. Find which version had working reporting" -ForegroundColor Gray
Write-Host "  3. Share report for detailed analysis" -ForegroundColor Gray
