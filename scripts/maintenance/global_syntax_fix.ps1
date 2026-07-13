Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName
    $changed = $false
    
    # Pattern 1: }).catch(() => {}; -> }).catch(() => {});
    if ($content -match '\}\)\.catch\(\(\) => \{\};') {
        $content = $content -replace '\}\)\.catch\(\(\) => \{\};', '}).catch(() => {});'
        $changed = $true
    }

    # Pattern 2: ]).catch(() => {}; -> ]).catch(() => {});
    if ($content -match '\]\)\.catch\(\(\) => \{\};') {
        $content = $content -replace '\]\)\.catch\(\(\) => \{\};', ']).catch(() => {});'
        $changed = $true
    }

    # Pattern 3: ]).catch(() => ({}); -> ]).catch(() => ({}));
    if ($content -match '\]\)\.catch\(\(\) => \(\{\};') {
        $content = $content -replace '\]\)\.catch\(\(\) => \(\{\};', ']).catch(() => ({}));'
        $changed = $true
    }

    # Pattern 4: ]).catch(() => null; -> ]).catch(() => null);
    if ($content -match '\]\)\.catch\(\(\) => null;') {
        $content = $content -replace '\]\)\.catch\(\(\) => null;', ']).catch(() => null);'
        $changed = $true
    }

    if ($changed) {
        $content | Set-Content $_.FullName
        Write-Host "FIXED: $($_.FullName)"
    }
}
