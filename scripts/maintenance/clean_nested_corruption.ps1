Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $pattern = '(?:\s*\}\s*catch\s*\(e\)\s*\{\s*return\s*null;\s*\}\s*\}\)\(\);)+'
    if ($content -match $pattern) {
        $content = $content -replace $pattern, '})();'
        $content | Set-Content $_.FullName
        Write-Host "CLEANED NESTED (REGEX): $($_.FullName)"
    }
}
