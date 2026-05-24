Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $changed = $false

    # Pattern 1: ]).catch(() => ({}); -> ]).catch(() => ({}));
    if ($content -match '\]\)\.catch\(\(\) => \(\{\};') {
        $content = $content -replace '\]\)\.catch\(\(\) => \(\{\};', ']).catch(() => ({}));'
        $changed = $true
    }

    # Pattern 2: }).catch(() => {}; -> }).catch(() => {});
    if ($content -match '\}\)\.catch\(\(\) => \{(\s*)\};') {
        $content = $content -replace '\}\)\.catch\(\(\) => \{(\s*)\};', '}).catch(() => {});'
        $changed = $true
    }

    # Pattern 3: catch(err => this.log(...); -> catch(err => this.log(...));
    # Only if NOT already closed.
    $logPattern = '\.catch\(err => this\.log\((.*?)\);(?!\))'
    if ($content -match $logPattern) {
        $content = [regex]::Replace($content, $logPattern, '.catch(err => this.log($1));')
        $changed = $true
    }

    if ($changed) {
        $content | Set-Content $_.FullName
        Write-Host "FIXED (BATCH V3): $($_.FullName)"
    }
}
