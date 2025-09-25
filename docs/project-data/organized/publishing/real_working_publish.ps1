# Publication PowerShell Interactive Robuste
param([string]$ProjectPath = $PWD.Path)

Write-Host "PUBLICATION POWERSHELL INTERACTIVE ROBUSTE" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

# Fonction pour mettre à jour la version
function Update-AppVersion {
    $appJsonPath = ".homeycompose\app.json"
    $appData = Get-Content $appJsonPath -Raw | ConvertFrom-Json
    
    # Incrémenter la version
    $versionParts = $appData.version.Split('.')
    $versionParts[2] = [string]([int]$versionParts[2] + 1)
    $newVersion = $versionParts -join '.'
    $appData.version = $newVersion
    
    # Enrichissement
    $appData.description = @{
        en = "Ultimate Zigbee Hub - Complete ecosystem with 850+ devices from 50+ manufacturers. Professional categorization by device types: motion sensors, contact sensors, smart lights, smart plugs, climate controls. SDK3 compliant following Johan Benz standards. Local Zigbee 3.0 operation with no cloud dependencies."
    }
    
    $appData.tags = @(
        "zigbee", "sensors", "lights", "plugs", "switches", "motion", "contact", 
        "temperature", "humidity", "presence", "smart home", "automation", 
        "energy", "climate", "security", "tuya", "aqara", "ikea", "philips", 
        "xiaomi", "sonoff", "local", "no cloud", "sdk3"
    )
    
    $appData | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath -Encoding UTF8
    Write-Host "Version mise à jour: $newVersion" -ForegroundColor Yellow
    return $newVersion
}

# Fonction pour créer le changelog
function Get-Changelog($version) {
    return @"
v$version`: Professional Device Categorization Complete

DEVICE REORGANIZATION:
- All drivers renamed to professional categories without brand prefixes
- motion_sensor, contact_sensor, smart_light, smart_plug, etc.
- Organized by device function following Johan Benz standards
- SDK3 compliant architecture with proper endpoints

DEVICE CATEGORIES:
SENSORS: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
DETECTORS: air_quality_sensor, co_detector, smoke_detector, water_leak_detector  
LIGHTS: smart_light, rgb_light, light_switch, dimmer_switch
PLUGS: smart_plug, energy_plug
MOTORS: curtain_motor
CLIMATE: thermostat
SWITCHES: scene_switch

TECHNICAL FEATURES:
- 850+ device models from 50+ manufacturers supported
- Local Zigbee 3.0 operation, zero cloud dependencies
- Multilingual support and enhanced metadata
- Comprehensive manufacturer compatibility matrix

BRAND SUPPORT:
Tuya, Aqara, IKEA TRADFRI, Philips Hue, Xiaomi, Sonoff, Blitzwolf, Lidl, and 40+ more

Professional unbranded structure ready for App Store
"@
}

# Fonction principale de publication
function Start-InteractivePublish {
    try {
        Set-Location $ProjectPath
        
        # Mise à jour version
        $version = Update-AppVersion
        $changelog = Get-Changelog $version
        
        Write-Host "Démarrage publication interactive..." -ForegroundColor Blue
        
        # Nettoyage cache
        if (Test-Path ".homeybuild") {
            Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Lancement homey app publish avec interaction
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "homey"
        $psi.Arguments = "app publish"
        $psi.UseShellExecute = $false
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $false
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        $process.Start()
        
        # Gestion des interactions
        $step = 0
        $timeout = 300 # 5 minutes
        $startTime = Get-Date
        
        while (-not $process.HasExited -and ((Get-Date) - $startTime).TotalSeconds -lt $timeout) {
            
            # Lecture output
            if ($process.StandardOutput.Peek() -ne -1) {
                $output = $process.StandardOutput.ReadLine()
                Write-Host "<<< $output" -ForegroundColor White
                
                # Réponses basées sur le contenu
                if ($output -match "uncommitted changes.*continue" -and $step -eq 0) {
                    Write-Host ">>> Envoi: y" -ForegroundColor Green
                    $process.StandardInput.WriteLine("y")
                    $step = 1
                }
                elseif ($output -match "update.*version number" -and $step -eq 1) {
                    Write-Host ">>> Envoi: n (version déjà mise à jour)" -ForegroundColor Green
                    $process.StandardInput.WriteLine("n")
                    $step = 2
                }
                elseif (($output -match "changelog" -or $output -match "release notes" -or ($step -eq 2 -and $output -match "enter")) -and $step -eq 2) {
                    Write-Host ">>> Envoi du changelog complet..." -ForegroundColor Green
                    
                    # Envoi du changelog ligne par ligne
                    $changelog.Split("`n") | ForEach-Object {
                        $process.StandardInput.WriteLine($_)
                        Start-Sleep -Milliseconds 100
                    }
                    
                    # Fin du changelog
                    $process.StandardInput.WriteLine("")
                    $process.StandardInput.WriteLine("")
                    $step = 3
                    Write-Host ">>> Changelog envoyé" -ForegroundColor Green
                }
                elseif (($output -match "confirm" -or $output -match "proceed" -or $output -match "publish" -or ($output -match "y/n" -and $step -ge 3))) {
                    Write-Host ">>> Envoi: y (confirmation)" -ForegroundColor Green
                    $process.StandardInput.WriteLine("y")
                }
                
                # Détection du succès
                if ($output -match "published|uploaded|success|complete|build.*uploaded") {
                    Write-Host "*** PUBLICATION DETECTEE COMME REUSSIE! ***" -ForegroundColor Green
                    break
                }
            }
            
            Start-Sleep -Milliseconds 500
        }
        
        $process.WaitForExit(10000) # 10 secondes max
        $exitCode = if ($process.HasExited) { $process.ExitCode } else { -1 }
        
        Write-Host "Code de sortie: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Yellow" })
        
        return @{
            Success = ($exitCode -eq 0)
            Version = $version
        }
    }
    catch {
        Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Version = $null }
    }
}

# Vérification du statut
function Test-PublicationStatus {
    try {
        $result = homey app manage 2>&1
        return $result -match "developer.homey.app"
    }
    catch {
        return $false
    }
}

# Exécution principale
try {
    $result = Start-InteractivePublish
    
    if ($result.Success) {
        Write-Host "`nPUBLICATION REUSSIE - VERSION $($result.Version)" -ForegroundColor Green
        
        if (Test-PublicationStatus) {
            Write-Host "Status confirmé dans Homey Developer Tools" -ForegroundColor Green
        }
    }
    else {
        Write-Host "`nPublication incomplète - Vérifiez le dashboard" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Erreur générale: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nProcessus terminé!" -ForegroundColor Cyan
