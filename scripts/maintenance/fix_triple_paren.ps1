Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match 'message\)\)\);') {
        $content = $content -replace 'message\)\)\);', 'message));'
        $content | Set-Content $_.FullName
        Write-Host "FIXED TRIPLE PAREN: $($_.FullName)"
    }
}
