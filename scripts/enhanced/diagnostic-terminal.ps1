
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Diagnostic Terminal PowerShell - Sécurisé, Zéro boucle, Zéro attente
# Généré automatiquement le 24/07/2025

Write-Host "--- DIAGNOSTIC TERMINAL SECURISE ---"
Write-Host "Date : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Vérifier l'état du shell
Write-Host "[1] Test de réactivité du shell..."
try {
    $test = Get-Process -Id $PID -ErrorAction Stop
    Write-Host "  -> Shell PowerShell actif (PID: $PID)"
} catch {
    Write-Host "  -> Shell inactif ou bloqué !"
}

# Vérifier les processus bloquants
Write-Host "[2] Recherche de processus PowerShell ou conhost bloqués..."
$procs = Get-Process | Where-Object { $_.ProcessName -match 'pwsh|powershell|conhost' }
foreach ($p in $procs) {
    Write-Host "  -> $($p.ProcessName) (PID: $($p.Id)) lancé à $($p.StartTime)"
}

# Vérifier les chevrons (prompt multi-ligne)
Write-Host "[3] Vérification du prompt multi-ligne (chevrons)..."
Write-Host "  -> Si le prompt affiche '>>', tapez Ctrl+C pour débloquer."

# Vérifier les scripts en attente
Write-Host "[4] Recherche de scripts PowerShell en attente..."
$waiting = Get-Process | Where-Object { $_.ProcessName -eq 'pwsh' -and $_.Responding -eq $false }
if ($waiting) {
    Write-Host "  -> Attention : $($waiting.Count) script(s) PowerShell non réactif(s) !"
} else {
    Write-Host "  -> Aucun script PowerShell bloqué."
}

# Conseils
Write-Host "[5] Conseils de sécurité :"
Write-Host "  - Utilisez toujours des commandes sur une seule ligne."
Write-Host "  - Évitez les scripts interactifs ou à boucle infinie."
Write-Host "  - Fermez et rouvrez le terminal en cas de blocage."
Write-Host "  - Surveillez les processus pwsh/conhost dans le gestionnaire de tâches."

Write-Host "--- FIN DU DIAGNOSTIC ---" 


