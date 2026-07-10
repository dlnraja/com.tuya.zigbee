Get-ChildItem -Path "scripts" -Filter "*.js" -Recurse | Where-Object { $_.Name -ne "STRICT_SYNTAX_GUARD.js" } | ForEach-Object {
    "'use strict';" | Set-Content $_.FullName
    Write-Host "NEUTRALIZED: $($_.FullName)"
}
