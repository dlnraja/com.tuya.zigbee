$content = Get-Content app.json -Raw
$content = $content -replace 'ikea_ikea_','ikea_'
$content = $content -replace '_other_other','_other'
$content = $content -replace '_aaa_aaa','_aaa'
$content = $content -replace '_aa_aa','_aa'
$content = $content -replace '_internal_internal','_internal'
$content | Set-Content app.json -NoNewline
Write-Host "✅ Replacements completed"
