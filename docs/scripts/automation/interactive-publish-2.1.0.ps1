# INTERACTIVE PUBLISH v2.1.0 - Automation prompts interactifs
Write-Host "🎯 PUBLICATION INTERACTIVE v2.1.0" -ForegroundColor Green

# Créer répertoire logs
New-Item -Path "project-data\publish-logs" -ItemType Directory -Force | Out-Null

# Réponses automatiques pour prompts interactifs
$responses = @(
    "y",           # Uncommitted changes
    "y",           # Version update
    "patch",       # Version type
    "v2.1.0 - Enhanced device compatibility with Johan Bendz enrichment. Added roller shutter support, improved BSEED switches, and resolved maxBuffer publication issues."  # Changelog
)

# Lancer publication avec expect-like automation
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "homey"
$psi.Arguments = "app publish"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true

$process = [System.Diagnostics.Process]::Start($psi)

# Envoyer réponses automatiques
foreach ($response in $responses) {
    Start-Sleep -Seconds 2
    $process.StandardInput.WriteLine($response)
    Write-Host "-> Sent: $response" -ForegroundColor Yellow
}

$process.StandardInput.Close()
$output = $process.StandardOutput.ReadToEnd()
$errors = $process.StandardError.ReadToEnd()

Write-Host "✅ PUBLICATION TERMINÉE" -ForegroundColor Green
