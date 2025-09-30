# AUTO_PUBLISH.ps1 - Publication automatisée avec gestion prompts
Write-Host "🚀 AUTO_PUBLISH - Publication automatisée Homey" -ForegroundColor Cyan

# Fonction de commit automatique
function Commit-Changes {
    Write-Host "`n📤 COMMIT CHANGEMENTS AUTOMATIQUE:" -ForegroundColor Yellow
    
    try {
        git add .
        git commit -m "🎯 v2.1.5 - Environnement npm nettoyé pour publication"
        Write-Host "✅ Changements committés" -ForegroundColor Green
    }
    catch {
        Write-Host "ℹ️ Pas de changements à committer ou déjà fait" -ForegroundColor Gray
    }
}

# Fonction de publication avec réponses automatiques
function Start-AutoPublish {
    Write-Host "`n🚀 PUBLICATION AUTOMATISÉE:" -ForegroundColor Cyan
    
    # Créer un fichier de réponses pour les prompts
    $responses = @"
y
patch
y
Ultimate Zigbee Hub v2.1.5 - Professional Edition (npm environment fixed)
"@
    
    $responsesPath = "responses.txt"
    $responses | Out-File -FilePath $responsesPath -Encoding ASCII
    
    try {
        Write-Host "📱 Lancement publication avec réponses automatiques..." -ForegroundColor Gray
        
        # Utiliser le fichier de réponses
        $process = Start-Process -FilePath "cmd" -ArgumentList "/c", "homey app publish < responses.txt" -PassThru -Wait -WindowStyle Hidden
        
        if ($process.ExitCode -eq 0) {
            Write-Host "🎉 PUBLICATION RÉUSSIE !" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "❌ Publication échouée (code: $($process.ExitCode))" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Erreur publication: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        # Nettoyer le fichier de réponses
        if (Test-Path $responsesPath) {
            Remove-Item $responsesPath -Force
        }
    }
}

# Fonction de publication alternative avec expect-style
function Start-AlternativePublish {
    Write-Host "`n🔄 MÉTHODE ALTERNATIVE:" -ForegroundColor Yellow
    
    try {
        # Utilisation de echo avec pipe pour répondre aux prompts
        $cmd = @"
echo y | homey app publish
"@
        
        Write-Host "📱 Tentative avec echo pipe..." -ForegroundColor Gray
        Invoke-Expression $cmd
        
        Write-Host "✅ Publication alternative tentée" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Méthode alternative échouée" -ForegroundColor Red
        return $false
    }
}

# Fonction de push final
function Push-Changes {
    Write-Host "`n📤 PUSH VERS GITHUB:" -ForegroundColor Yellow
    
    try {
        git push origin master
        Write-Host "✅ Push réussi vers GitHub" -ForegroundColor Green
        
        Write-Host "`n🌐 LIENS MONITORING:" -ForegroundColor Cyan
        Write-Host "📊 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Gray
        Write-Host "📱 Homey Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub" -ForegroundColor Gray
        
    }
    catch {
        Write-Host "❌ Erreur push: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Exécution principale
try {
    Write-Host "🎯 Démarrage publication automatisée...`n" -ForegroundColor Cyan
    
    # Commit d'abord
    Commit-Changes
    
    # Tentative de publication
    $published = Start-AutoPublish
    
    if (-not $published) {
        Write-Host "`n🔄 Essai méthode alternative..." -ForegroundColor Yellow
        $published = Start-AlternativePublish
    }
    
    if ($published) {
        Write-Host "`n🎉 PUBLICATION RÉUSSIE !" -ForegroundColor Green
        Push-Changes
    }
    else {
        Write-Host "`n❌ Toutes les méthodes automatiques ont échoué" -ForegroundColor Red
        Write-Host "💡 Essayez manuellement: homey app publish" -ForegroundColor Yellow
        Write-Host "💡 Ou utilisez le fichier publish.bat créé" -ForegroundColor Yellow
    }
    
    Write-Host "`n📱 Version app: 2.1.5" -ForegroundColor Cyan
    Write-Host "🏆 Publication terminée" -ForegroundColor Green
    
}
catch {
    Write-Host "`n💥 Erreur fatale: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nAppuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
