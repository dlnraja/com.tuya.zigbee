# PUBLICATION RAPIDE v2.0
Write-Host "🚀 ULTIMATE ZIGBEE HUB v2.0 PUBLICATION" -ForegroundColor Green

# Nettoyage rapide
Remove-Item ".homeybuild" -Force -Recurse -ErrorAction SilentlyContinue

# Publication avec prompts automatiques
$process = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -PassThru -NoNewWindow -RedirectStandardInput -RedirectStandardOutput -RedirectStandardError

# Attendre les prompts et répondre automatiquement
Start-Sleep 3
$process.StandardInput.WriteLine("y")  # uncommitted changes
Start-Sleep 2  
$process.StandardInput.WriteLine("y")  # version update
Start-Sleep 2
$process.StandardInput.WriteLine("patch")  # version type
Start-Sleep 2
$process.StandardInput.WriteLine("v2.0.0 - Complete unbranded reorganization with comprehensive device coverage from all Johan Bendz sources")  # changelog

$process.WaitForExit()
Write-Host "✅ Publication terminée !" -ForegroundColor Green
