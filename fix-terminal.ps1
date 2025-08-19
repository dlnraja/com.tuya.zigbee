# Force terminal line breaks for Cursor
Write-Host ""
Write-Host "========================================" 
Write-Host "Terminal Fix Applied"
Write-Host "========================================" 
Write-Host ""
Write-Host ""
$Host.UI.RawUI.FlushInputBuffer()
[Console]::Out.Flush()
Write-Host ""
exit 0
