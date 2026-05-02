# resolve_conflicts.ps1
Write-Host "=== AUTO-RESOLVING CONFLICTS (PowerShell) ==="

$status = git status --short
$hasConflicts = $false

foreach ($line in ($status -split "`n")) {
    if ($line.StartsWith("UU ")) {
        $hasConflicts = $true
        $file = $line.Substring(3).Trim()
        Write-Host "Resolving conflict in: $file"
        
        if ($file.EndsWith(".png") -or $file.EndsWith(".svg") -or $file.EndsWith(".jpg")) {
            Write-Host "  Accepting OURS for binary file: $file"
            git checkout --ours "$file"
            git add "$file"
        } elseif ($file -eq "package.json" -or $file -eq "package-lock.json") {
            Write-Host "  Accepting OURS for structural file: $file"
            git checkout --ours "$file"
            git add "$file"
        } elseif ($file -eq "locales/en.json" -or $file -eq "app.json") {
            Write-Host "  Accepting OURS for large JSON file: $file"
            git checkout --ours "$file"
            git add "$file"
        } else {
            Write-Host "  Accepting THEIRS for driver logic: $file"
            git checkout --theirs "$file"
            git add "$file"
        }
    }
}

if ($hasConflicts) {
    git commit -m "chore: auto-resolve merge conflicts"
    Write-Host "✅ Conflicts resolved and committed."
} else {
    Write-Host "No conflicts found."
}
