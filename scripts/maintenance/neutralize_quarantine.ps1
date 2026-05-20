Get-ChildItem -Path "scripts\fixes\quarantine" -Filter "*.js" | ForEach-Object {
    "'use strict';" | Set-Content $_.FullName
}
