Get-ChildItem -Path "scripts\fixes" -Filter "*.js" -Recurse | ForEach-Object {
    "'use strict';" | Set-Content $_.FullName
    Write-Host "NEUTRALIZED: $($_.FullName)"
}
