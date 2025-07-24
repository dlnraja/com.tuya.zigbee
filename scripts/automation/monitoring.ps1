Write-Host 'Monitoring Script' -ForegroundColor Green
$ReportDate = Get-Date -Format 'yyyyMMdd'
$ReportContent = 'Rapport de Monitoring'
Set-Content -Path 'rapports/MONITORING_REPORT_' + $ReportDate + '.md' -Value $ReportContent -Encoding UTF8

