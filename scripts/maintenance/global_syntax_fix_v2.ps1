Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $changed = $false

    # Pattern 1: ]).catch(() => ({}); -> ]).catch(() => ({}));
    if ($content -match '\]\)\.catch\(\(\) => \(\{\};') {
        $content = $content -replace '\]\)\.catch\(\(\) => \(\{\};', ']).catch(() => ({}));'
        $changed = $true
    }

    # Pattern 2: catch(err => this.log(...); -> catch(err => this.log(...));
    if ($content -match '\.catch\(err => this\.log\((.*?)\);') {
        $content = [regex]::Replace($content, '\.catch\(err => this\.log\((.*?)\);', '.catch(err => this.log($1));')
        $changed = $true
    }

    if ($changed) {
        $content | Set-Content $_.FullName
        Write-Host "FIXED (BATCH): $($_.FullName)"
    }
}
