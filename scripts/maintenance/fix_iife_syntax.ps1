Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    # Pattern: (() => { try { return SOME_EXPRESSION ;})();
    $regex = '\(\(\) => \{ try \{ return (.*?);\}\)\(\)'
    if ($content -match $regex) {
        $content = [regex]::Replace($content, $regex, '( () => { try { return $1; } catch(e) { return null; } } )()')
        $content | Set-Content $_.FullName
        Write-Host "FIXED IIFE: $($_.FullName)"
    }
}
