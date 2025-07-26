Write-Host 'Monitoring Script' -ForegroundColor Green
$ReportDate = Get-Date -Format 'yyyyMMdd'
$ReportContent = 'Rapport de Monitoring'
Set-Content -Path 'docs/reports/MONITORING_REPORT_' + $ReportDate + '.md' -Value $ReportContent -Encoding UTF8


