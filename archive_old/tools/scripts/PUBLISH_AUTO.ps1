# Publication 100% Automatique
Write-Host "🤖 PUBLICATION AUTOMATIQUE" -ForegroundColor Cyan

# Auto-réponses
$responses = @"
y
y

UNBRANDED reorganization + Smart recovery + 163 drivers validated
y
y
"@

# Lancer publication avec auto-réponses
$responses | homey app publish

Write-Host "`n✅ Publication terminée!" -ForegroundColor Green
