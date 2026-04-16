$ErrorActionPreference = 'SilentlyContinue'
$files = Get-ChildItem -Path "drivers", "lib" -Filter "*.js" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $hasChanged = $false
    
    # Clean up double dots and duplicated triggers
    $newContent = $content -replace '\.trigger\(this, \{\}, \{\}\)\.catch\(\(\) => \{\}\);? \.?trigger\(this, \{\}, \{\}\)\.catch\(\(\) => \{\}\);?', '.trigger(this, {}, {}).catch(() => {});'
    
    # Remove any extra closing braces that might have survived the previous nested replace
    $newContent = $newContent -replace '\);? \} catch \(e\) \{ this\.error\(.*?\) ; return null; \} \}\)\(\)', ');'
    
    if ($newContent -ne $content) {
        $newContent | Set-Content $file.FullName -NoNewline
        Write-Host "Polished: $($file.FullName)"
    }
}
Write-Host "Polished all files!"
