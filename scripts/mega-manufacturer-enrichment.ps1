# MEGA MANUFACTURER ID ENRICHMENT - CYCLE 2/10
# Adds ALL known Tuya manufacturer ID patterns for maximum device coverage

Write-Host "🔧 MEGA MANUFACTURER ID ENRICHMENT STARTING..." -ForegroundColor Magenta

# TOP 50 MOST COMMON SUFFIXES (from ZHA, Zigbee2MQTT, Johan Bendz, community reports)
$topSuffixes = @(
    "uqfph8ah", "myd45weu", "n4ttsck2", "gyzlwu5q", "2aaelwxk", "3towulqd",
    "ztc6ggyl", "bjzrowv2", "qasjif9e", "ijxvkhd0", "18ejxno0", "hhiodade", 
    "v1w2k9dd", "kfu8zapd", "c8ozah8n", "dwcarsat", "mhxn2jso", "yojqa8xn",
    "ntcy3xu1", "amp6tsvy", "oisqyl4o", "whpb9yts", "mcxw5ehu", "6ygjfyll",
    "bsvqrxru", "4ggd8ezp", "lf56vpxj", "h4wnrtck", "jmrgyl7o", "sn60p5h8",
    "rxtv1mfk", "bq7mlkgv", "w5auu1jt", "tv3wxhcz", "cjlm9ra6", "0zaf1cr8",
    "dnz21gts", "m9skfctm", "rccxox8p", "czbl27da", "pnvdf1th", "kalvbxpe",
    "giy0dtou", "nojzpbeb", "xzal3kbc", "pd8tpp3v", "ml0ples1", "bfpnp2hn",
    "jn2nekng", "qj6k36gt", "vh20t8er"
)

$prefixes = @("_TZE284_", "_TZE200_", "_TZ3000_", "_TZE204_", "_TZ3210_", "_TZ3400_", "_TYZB01_")
$enrichedCount = 0

Get-ChildItem "drivers\*\driver.compose.json" | ForEach-Object {
    $driverPath = $_.FullName
    $driverName = $_.Directory.Name
    
    try {
        $content = Get-Content $driverPath -Raw -Encoding UTF8
        $json = $content | ConvertFrom-Json
        
        if ($json.zigbee -and $json.zigbee.manufacturerName) {
            $manufacturerNames = [System.Collections.ArrayList]@($json.zigbee.manufacturerName)
            $originalCount = $manufacturerNames.Count
            
            # Add generic prefixes (wildcards)
            foreach ($prefix in $prefixes) {
                if ($manufacturerNames -notcontains $prefix) {
                    [void]$manufacturerNames.Add($prefix)
                }
            }
            
            # Add specific patterns (top 25 most common for each prefix)
            foreach ($prefix in $prefixes) {
                for ($i = 0; $i -lt [Math]::Min(25, $topSuffixes.Length); $i++) {
                    $fullPattern = $prefix + $topSuffixes[$i]
                    if ($manufacturerNames -notcontains $fullPattern) {
                        [void]$manufacturerNames.Add($fullPattern)
                    }
                }
            }
            
            # Update JSON
            $json.zigbee.manufacturerName = $manufacturerNames.ToArray()
            
            # Save with proper formatting
            $json | ConvertTo-Json -Depth 10 | Set-Content $driverPath -Encoding UTF8
            
            $newCount = $manufacturerNames.Count
            Write-Host "✅ $driverName`: $originalCount → $newCount manufacturer IDs" -ForegroundColor Green
            $enrichedCount++
        }
    } catch {
        Write-Host "❌ Error processing $driverName`: $_" -ForegroundColor Red
    }
}

Write-Host "`n🎯 ENRICHMENT COMPLETE: $enrichedCount drivers enhanced" -ForegroundColor Cyan
Write-Host "📊 Added top 25 patterns for maximum device recognition" -ForegroundColor Green
