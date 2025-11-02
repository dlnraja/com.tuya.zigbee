# Remove invalid capability alarm_temperature from all JSON files

$files = Get-ChildItem -Path "drivers" -Filter "*.json" -Recurse

$fixed = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    if ($content -match 'alarm_temperature') {
        $originalContent = $content
        
        # Remove from capabilities array
        $content = $content -replace ',?\s*"alarm_temperature"\s*,?', ''
        $content = $content -replace ',\s*\]', ']'  # Fix trailing comma before ]
        $content = $content -replace '\[\s*,', '['  # Fix leading comma after [
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            Write-Host "✅ Fixed: $($file.FullName)"
            $fixed++
        }
    }
}

Write-Host "`n✨ Complete! Fixed $fixed files"
