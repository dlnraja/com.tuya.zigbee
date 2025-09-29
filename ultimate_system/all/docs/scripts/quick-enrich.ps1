# Quick Manufacturer ID Enrichment
$suffixes = @("uqfph8ah", "myd45weu", "n4ttsck2", "gyzlwu5q", "2aaelwxk", "3towulqd", "ztc6ggyl", "bjzrowv2", "qasjif9e", "ijxvkhd0")

Get-ChildItem "drivers\*\driver.compose.json" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw | ConvertFrom-Json
    if ($content.zigbee.manufacturerName) {
        $ids = @($content.zigbee.manufacturerName)
        $prefixes = @("_TZE284_", "_TZE200_", "_TZ3000_", "_TZE204_")
        
        foreach ($prefix in $prefixes) {
            if ($ids -notcontains $prefix) { $ids += $prefix }
            foreach ($suffix in $suffixes[0..4]) {
                $full = $prefix + $suffix
                if ($ids -notcontains $full) { $ids += $full }
            }
        }
        
        $content.zigbee.manufacturerName = $ids
        $content | ConvertTo-Json -Depth 10 | Set-Content $_.FullName -Encoding UTF8
        Write-Host "✓ Enhanced $($_.Directory.Name)"
    }
}
