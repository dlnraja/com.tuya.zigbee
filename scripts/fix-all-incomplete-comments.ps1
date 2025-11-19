# FIX INCOMPLETE COMMENT BLOCKS
# Fixes all device.js files with partially commented registerCapability code

$baseDir = Split-Path -Parent $PSScriptRoot
$fixed = 0
$skipped = 0

Write-Host "🔧 FIXING INCOMPLETE COMMENT BLOCKS`n" -ForegroundColor Cyan

# Get all device.js files that have the error pattern
$files = Get-ChildItem -Path "$baseDir\drivers" -Filter "device.js" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content

    # Pattern 1: Fix incomplete registerCapability comments
    # Lines 57-62: Uncommented closing braces after commented code
    $content = $content -replace `
        '(\n\s+)(//\s+minInterval:[\s\S]*?//\s+minChange:\s+\d+)\s*\n\s+(\})\s*\n\s+(\}),\s*\n\s+(getOpts:\s*\{)\s*\n\s+(getOnStart:\s*true)\s*\n\s+(\})\s*\n\s+(\}\);)',`
        '$1$2`n$1//           }`n$1//         },`n$1//         getOpts: {`n$1//           getOnStart: true`n$1//         }`n$1//       });'

    # Pattern 2: More generic - find try blocks with unclosed comments
    $content = $content -replace `
        '(\/\/ this\.registerCapability\([^\n]+\n(?:\/\/[^\n]+\n)*)((?!\s*\/\/)[\s\S]*?)(\s+\}\s*\n\s+\},\s*\n\s+getOpts:\s*\{[\s\S]*?\n\s+\}\s*\n\s+\}\);)',`
        '$1// $2// $3'

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "✅ Fixed: $($file.FullName.Replace($baseDir, '.'))" -ForegroundColor Green
        $fixed++
    } else {
        $skipped++
    }
}

Write-Host "`n$('='*50)" -ForegroundColor Yellow
Write-Host "✅ Fixed: $fixed files" -ForegroundColor Green
Write-Host "⏭️  Skipped: $skipped files" -ForegroundColor Gray
Write-Host "$('='*50)`n" -ForegroundColor Yellow
