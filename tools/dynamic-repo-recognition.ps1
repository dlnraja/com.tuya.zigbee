# Dynamic Repository Recognition and Constraint Management
# Script pour la reconnaissance dynamique du repertoire et gestion des contraintes
# Evite les icones et logos pour prevenir les erreurs de syntaxe

param(
    [string]$Action = "scan",
    [string]$TargetPath = ".",
    [switch]$ForceUpdate,
    [string]$Manufacturers = "all",
    [string]$Categories = "all"
)

# Configuration des contraintes et referentiels
$Constraints = @{
    LocalCreationOnly = $true
    MaxConditions = "maximum possible"
    ExhaustiveManufacturers = $true
    ExhaustiveBrands = $true
    ExhaustiveProducts = $true
    IntelligentDetection = $true
    CompatibilityMaximization = $true
    FallbackSupport = $true
    LegacySupport = $true
    FutureProof = $true
}

# Referentiels exhaustifs
$Referentials = @{
    Manufacturers = @{
        "tuya" = @{
            Name = "Tuya"
            Aliases = @("Tuya", "TUYA", "tuya")
            ModelPrefixes = @("TS", "TH", "TZ", "TY")
            BaseClusters = @("genBasic", "genOnOff")
            CommonCapabilities = @("onoff")
            FirmwareSupport = @("legacy", "current", "latest", "unknown")
            Characteristics = @{
                Reliable = $true
                Widespread = $true
                StandardCompliant = $true
                GoodSupport = $true
            }
        }
        "zemismart" = @{
            Name = "Zemismart"
            Aliases = @("Zemismart", "ZEMISMART", "zemismart", "ZemiSmart")
            ModelPrefixes = @("TZ", "ZS", "ZM")
            BaseClusters = @("genBasic", "genOnOff", "genLevelCtrl")
            CommonCapabilities = @("onoff", "dim")
            FirmwareSupport = @("current", "latest")
            Characteristics = @{
                PremiumQuality = $true
                AdvancedFeatures = $true
                GoodSupport = $true
                Reliable = $true
            }
        }
        "novadigital" = @{
            Name = "NovaDigital"
            Aliases = @("NovaDigital", "NOVADIGITAL", "novadigital", "Nova Digital")
            ModelPrefixes = @("ND", "NV", "NOVA")
            BaseClusters = @("genBasic", "genOnOff", "genLevelCtrl", "genPowerCfg")
            CommonCapabilities = @("onoff", "dim", "measure_power")
            FirmwareSupport = @("current", "latest")
            Characteristics = @{
                PowerMonitoring = $true
                EnergyEfficient = $true
                ProfessionalGrade = $true
                Reliable = $true
            }
        }
        "blitzwolf" = @{
            Name = "BlitzWolf"
            Aliases = @("BlitzWolf", "BLITZWOLF", "blitzwolf", "Blitz Wolf")
            ModelPrefixes = @("BW", "BL", "BW-")
            BaseClusters = @("genBasic", "genOnOff", "genPowerCfg")
            CommonCapabilities = @("onoff", "measure_power")
            FirmwareSupport = @("current", "latest")
            Characteristics = @{
                CostEffective = $true
                GoodPerformance = $true
                PopularChoice = $true
                Reliable = $true
            }
        }
        "moes" = @{
            Name = "Moes"
            Aliases = @("Moes", "MOES", "moes", "MOESGO")
            ModelPrefixes = @("MS", "MO", "MOES")
            BaseClusters = @("genBasic", "genOnOff", "genLevelCtrl")
            CommonCapabilities = @("onoff", "dim")
            FirmwareSupport = @("current", "latest")
            Characteristics = @{
                ThermostatSpecialist = $true
                ClimateControl = $true
                EnergySaving = $true
                Reliable = $true
            }
        }
        "smartlife" = @{
            Name = "Smart Life"
            Aliases = @("Smart Life", "SMART LIFE", "smartlife", "SmartLife")
            ModelPrefixes = @("SL", "SM", "SMART")
            BaseClusters = @("genBasic", "genOnOff")
            CommonCapabilities = @("onoff")
            FirmwareSupport = @("legacy", "current", "latest")
            Characteristics = @{
                BasicFunctionality = $true
                CostEffective = $true
                Widespread = $true
                Reliable = $true
            }
        }
        "gosund" = @{
            Name = "Gosund"
            Aliases = @("Gosund", "GOSUND", "gosund", "GoSund")
            ModelPrefixes = @("GS", "GO", "GOSUND")
            BaseClusters = @("genBasic", "genOnOff", "genPowerCfg")
            CommonCapabilities = @("onoff", "measure_power")
            FirmwareSupport = @("current", "latest")
            Characteristics = @{
                PowerMonitoring = $true
                GoodQuality = $true
                Popular = $true
                Reliable = $true
            }
        }
        "meross" = @{
            Name = "Meross"
            Aliases = @("Meross", "MEROSS", "meross")
            ModelPrefixes = @("MR", "ME", "MEROSS")
            BaseClusters = @("genBasic", "genOnOff", "genLevelCtrl")
            CommonCapabilities = @("onoff", "dim")
            FirmwareSupport = @("current", "latest")
            Characteristics = @{
                GoodQuality = $true
                Reliable = $true
                Popular = $true
                GoodSupport = $true
            }
        }
        "teckin" = @{
            Name = "Teckin"
            Aliases = @("Teckin", "TECKIN", "teckin")
            ModelPrefixes = @("TK", "TE", "TECKIN")
            BaseClusters = @("genBasic", "genOnOff", "genPowerCfg")
            CommonCapabilities = @("onoff", "measure_power")
            FirmwareSupport = @("current", "latest")
            Characteristics = @{
                CostEffective = $true
                GoodPerformance = $true
                Reliable = $true
                Popular = $true
            }
        }
        "unknown" = @{
            Name = "Unknown"
            Aliases = @("Unknown", "UNKNOWN", "unknown", "Generic")
            ModelPrefixes = @("UNKNOWN", "GEN", "GENERIC")
            BaseClusters = @("genBasic", "genOnOff")
            CommonCapabilities = @("onoff")
            FirmwareSupport = @("unknown")
            Characteristics = @{
                IntelligentDetection = $true
                FallbackMode = $true
                BasicSupport = $true
                GenericPattern = $true
            }
        }
    }
    
    ProductCategories = @{
        "switch" = @{
            Name = "Switch"
            Aliases = @("Switch", "SWITCH", "switch", "On/Off Switch", "Toggle Switch")
            Clusters = @("genBasic", "genOnOff")
            Capabilities = @("onoff")
            Manufacturers = @("tuya", "zemismart", "smartlife", "meross", "teckin")
            ModelPatterns = @("TS0001*", "TS004F*", "TS011F*", "TS0201*")
            Characteristics = @{
                BasicFunctionality = $true
                SimpleControl = $true
                Widespread = $true
                Reliable = $true
            }
        }
        "dimmer" = @{
            Name = "Dimmer"
            Aliases = @("Dimmer", "DIMMER", "dimmer", "Dimmable Switch", "Light Dimmer")
            Clusters = @("genBasic", "genOnOff", "genLevelCtrl")
            Capabilities = @("onoff", "dim")
            Manufacturers = @("zemismart", "novadigital", "moes", "meross")
            ModelPatterns = @("TS0207*", "TS0601*", "TZ*")
            Characteristics = @{
                Dimmable = $true
                LevelControl = $true
                AdvancedControl = $true
                Popular = $true
            }
        }
        "plug" = @{
            Name = "Smart Plug"
            Aliases = @("Smart Plug", "SMART PLUG", "smart plug", "Power Plug", "Outlet")
            Clusters = @("genBasic", "genOnOff", "genPowerCfg")
            Capabilities = @("onoff", "measure_power")
            Manufacturers = @("tuya", "blitzwolf", "gosund", "teckin")
            ModelPatterns = @("TS0207*", "BW-*", "GS*", "TK*")
            Characteristics = @{
                PowerMonitoring = $true
                EnergyTracking = $true
                SmartControl = $true
                Popular = $true
            }
        }
        "light" = @{
            Name = "Smart Light"
            Aliases = @("Smart Light", "SMART LIGHT", "smart light", "LED Light", "Bulb")
            Clusters = @("genBasic", "genOnOff", "genLevelCtrl", "genColorCtrl")
            Capabilities = @("onoff", "dim", "light_hue", "light_saturation")
            Manufacturers = @("zemismart", "novadigital", "moes")
            ModelPatterns = @("TS130F*", "THB2*", "TZ*")
            Characteristics = @{
                ColorControl = $true
                RgbSupport = $true
                AdvancedLighting = $true
                Premium = $true
            }
        }
        "sensor" = @{
            Name = "Sensor"
            Aliases = @("Sensor", "SENSOR", "sensor", "Environmental Sensor", "Monitor")
            Clusters = @("genBasic", "genTempMeasurement", "genHumidityMeasurement")
            Capabilities = @("measure_temperature", "measure_humidity")
            Manufacturers = @("tuya", "zemismart", "novadigital")
            ModelPatterns = @("TS0201*", "TZ*", "ND*")
            Characteristics = @{
                Environmental = $true
                Monitoring = $true
                DataCollection = $true
                Useful = $true
            }
        }
        "thermostat" = @{
            Name = "Thermostat"
            Aliases = @("Thermostat", "THERMOSTAT", "thermostat", "Climate Control", "HVAC")
            Clusters = @("genBasic", "genOnOff", "genLevelCtrl")
            Capabilities = @("onoff", "dim", "thermostat_mode")
            Manufacturers = @("moes", "zemismart", "novadigital")
            ModelPatterns = @("MS*", "TZ*", "ND*")
            Characteristics = @{
                ClimateControl = $true
                TemperatureControl = $true
                EnergySaving = $true
                Specialized = $true
            }
        }
        "curtain" = @{
            Name = "Curtain"
            Aliases = @("Curtain", "CURTAIN", "curtain", "Blind", "Shade")
            Clusters = @("genBasic", "genOnOff", "genLevelCtrl")
            Capabilities = @("onoff", "dim", "windowcoverings_set")
            Manufacturers = @("zemismart", "tuya", "novadigital")
            ModelPatterns = @("TZ*", "TS*", "ND*")
            Characteristics = @{
                WindowControl = $true
                Automation = $true
                Convenience = $true
                Popular = $true
            }
        }
        "lock" = @{
            Name = "Smart Lock"
            Aliases = @("Smart Lock", "SMART LOCK", "smart lock", "Lock", "Door Lock")
            Clusters = @("genBasic", "genOnOff", "genDoorLock")
            Capabilities = @("onoff", "lock_set")
            Manufacturers = @("tuya", "zemismart", "novadigital")
            ModelPatterns = @("TS*", "TZ*", "ND*")
            Characteristics = @{
                Security = $true
                AccessControl = $true
                Safety = $true
                Specialized = $true
            }
        }
        "unknown" = @{
            Name = "Unknown Device"
            Aliases = @("Unknown Device", "UNKNOWN DEVICE", "unknown device", "Generic Device")
            Clusters = @("genBasic", "genOnOff")
            Capabilities = @("onoff")
            Manufacturers = @("unknown")
            ModelPatterns = @("UNKNOWN*", "GEN*")
            Characteristics = @{
                Unknown = $true
                Generic = $true
                Fallback = $true
                BasicSupport = $true
            }
        }
    }
}

# Fonction de reconnaissance dynamique du repertoire
function Scan-DirectoryStructure {
    param(
        [string]$Path = "."
    )
    
    Write-Host "Scanning directory structure..."
    
    $Structure = @{
        Directories = @{}
        Files = @{}
        Drivers = @{}
        Workflows = @{}
        Documentation = @{}
        Tools = @{}
    }
    
    # Scan des repertoires
    Get-ChildItem -Path $Path -Directory -Recurse | ForEach-Object {
        $RelativePath = $_.FullName.Replace((Get-Location).Path, "").TrimStart("\")
        $Structure.Directories[$RelativePath] = @{
            Name = $_.Name
            FullPath = $_.FullName
            Parent = $_.Parent.Name
            CreationTime = $_.CreationTime
            LastWriteTime = $_.LastWriteTime
        }
    }
    
    # Scan des fichiers
    Get-ChildItem -Path $Path -File -Recurse | ForEach-Object {
        $RelativePath = $_.FullName.Replace((Get-Location).Path, "").TrimStart("\")
        $Extension = $_.Extension.ToLower()
        
        $Structure.Files[$RelativePath] = @{
            Name = $_.Name
            FullPath = $_.FullName
            Extension = $Extension
            Size = $_.Length
            CreationTime = $_.CreationTime
            LastWriteTime = $_.LastWriteTime
        }
        
        # Categorisation des fichiers
        switch ($Extension) {
            ".driver.compose.json" {
                $Structure.Drivers[$RelativePath] = $Structure.Files[$RelativePath]
            }
            ".yml" { 
                if ($_.Directory.Name -eq ".github" -and $_.Directory.Parent.Name -eq "workflows") {
                    $Structure.Workflows[$RelativePath] = $Structure.Files[$RelativePath]
                }
            }
            ".md" {
                $Structure.Documentation[$RelativePath] = $Structure.Files[$RelativePath]
            }
            ".ps1" {
                $Structure.Tools[$RelativePath] = $Structure.Files[$RelativePath]
            }
            ".sh" {
                $Structure.Tools[$RelativePath] = $Structure.Files[$RelativePath]
            }
            ".js" {
                if ($_.Directory.Name -eq "tools") {
                    $Structure.Tools[$RelativePath] = $Structure.Files[$RelativePath]
                }
            }
        }
    }
    
    return $Structure
}

# Fonction de detection intelligente des appareils
function Detect-Device {
    param(
        [string]$Model,
        [string]$Manufacturer,
        [string[]]$Clusters = @()
    )
    
    $Confidence = 0
    $DetectedManufacturer = "unknown"
    $DetectedCategory = "unknown"
    $DetectedCapabilities = @("onoff")
    
    # Detection du fabricant
    foreach ($Key in $Referentials.Manufacturers.Keys) {
        $Mfg = $Referentials.Manufacturers[$Key]
        if ($Mfg.Aliases -contains $Manufacturer -or 
            $Mfg.ModelPrefixes | Where-Object { $Model.StartsWith($_) }) {
            $DetectedManufacturer = $Key
            $Confidence += 0.3
            break
        }
    }
    
    # Detection de la categorie basée sur les clusters
    foreach ($Key in $Referentials.ProductCategories.Keys) {
        $Category = $Referentials.ProductCategories[$Key]
        $ClusterMatch = $true
        foreach ($Cluster in $Category.Clusters) {
            if ($Clusters -notcontains $Cluster) {
                $ClusterMatch = $false
                break
            }
        }
        if ($ClusterMatch) {
            $DetectedCategory = $Key
            $DetectedCapabilities = $Category.Capabilities
            $Confidence += 0.4
            break
        }
    }
    
    # Si aucune catégorie trouvée par clusters, essayer par modèle
    if ($DetectedCategory -eq "unknown") {
        foreach ($Key in $Referentials.ProductCategories.Keys) {
            $Category = $Referentials.ProductCategories[$Key]
            foreach ($Pattern in $Category.ModelPatterns) {
                $CleanPattern = $Pattern.Replace("*", "")
                if ($CleanPattern.Length -gt 0 -and $Model.Contains($CleanPattern)) {
                    $DetectedCategory = $Key
                    $DetectedCapabilities = $Category.Capabilities
                    $Confidence += 0.3
                    break
                }
            }
            if ($DetectedCategory -ne "unknown") { break }
        }
    }
    
    # Pattern matching du modèle (seulement si pas déjà détecté)
    if ($DetectedCategory -eq "unknown") {
        foreach ($Key in $Referentials.ProductCategories.Keys) {
            $Category = $Referentials.ProductCategories[$Key]
            foreach ($Pattern in $Category.ModelPatterns) {
                $CleanPattern = $Pattern.Replace("*", "")
                if ($CleanPattern.Length -gt 0 -and $Model.Contains($CleanPattern)) {
                    $DetectedCategory = $Key
                    $DetectedCapabilities = $Category.Capabilities
                    $Confidence += 0.1
                    break
                }
            }
            if ($DetectedCategory -ne "unknown") { break }
        }
    }
    
    return @{
        Manufacturer = $DetectedManufacturer
        Category = $DetectedCategory
        Capabilities = $DetectedCapabilities
        Confidence = [Math]::Min($Confidence, 1.0)
        Model = $Model
        OriginalManufacturer = $Manufacturer
        Clusters = $Clusters
    }
}

# Fonction de generation de drivers intelligents
function Generate-IntelligentDriver {
    param(
        [hashtable]$Device
    )
    
    $Manufacturer = $Referentials.Manufacturers[$Device.Manufacturer]
    $Category = $Referentials.ProductCategories[$Device.Category]
    
    $Strategy = "fallback"
    if ($Device.Confidence -ge 0.8) { $Strategy = "optimized" }
    elseif ($Device.Confidence -ge 0.6) { $Strategy = "compatible" }
    
    $DriverTemplate = @{
        id = "$($Device.Manufacturer)-$($Device.Category)-$($Device.Model.ToLower())"
        title = @{
            en = "$($Manufacturer.Name) $($Category.Name) - $($Device.Model)"
            fr = "$($Manufacturer.Name) $($Category.Name) - $($Device.Model)"
            nl = "$($Manufacturer.Name) $($Category.Name) - $($Device.Model)"
            ta = "$($Manufacturer.Name) $($Category.Name) - $($Device.Model)"
        }
        class = "device"
        capabilities = $Device.Capabilities
        images = @{
            small = "/assets/images/small/$($Device.Manufacturer)-$($Device.Category).png"
            large = "/assets/images/large/$($Device.Manufacturer)-$($Device.Category).png"
        }
        pairing = @(
            @{
                id = "generic_switch"
                title = @{
                    en = "Generic Switch"
                    fr = "Interrupteur Générique"
                    nl = "Generieke Schakelaar"
                    ta = "பொதுவான சுவிட்ச்"
                }
                capabilities = $Device.Capabilities
                clusters = $Category.Clusters
            }
        )
        settings = @(
            @{
                id = "manufacturer"
                type = "text"
                title = @{
                    en = "Manufacturer"
                    fr = "Fabricant"
                    nl = "Fabrikant"
                    ta = "உற்பத்தியாளர்"
                }
                value = $Manufacturer.Name
            }
            @{
                id = "model"
                type = "text"
                title = @{
                    en = "Model"
                    fr = "Modèle"
                    nl = "Model"
                    ta = "மாடல்"
                }
                value = $Device.Model
            }
        )
        flow = @{
            triggers = @()
            conditions = @()
            actions = @()
        }
    }
    
    # Ajout des capacités basées sur la catégorie
    if ($Category.Capabilities -contains "dim") {
        $DriverTemplate.flow.actions += @{
            id = "dim"
            title = @{
                en = "Set Dim Level"
                fr = "Définir le Niveau de Luminosité"
                nl = "Dimniveau Instellen"
                ta = "மங்கல் நிலையை அமைக்கவும்"
            }
            args = @(
                @{
                    name = "level"
                    type = "number"
                    title = @{
                        en = "Level"
                        fr = "Niveau"
                        nl = "Niveau"
                        ta = "நிலை"
                    }
                    min = 0
                    max = 100
                }
            )
        }
    }
    
    if ($Category.Capabilities -contains "measure_power") {
        $DriverTemplate.flow.triggers += @{
            id = "power_changed"
            title = @{
                en = "Power Changed"
                fr = "Puissance Modifiée"
                nl = "Vermogen Gewijzigd"
                ta = "சக்தி மாற்றப்பட்டது"
            }
        }
    }
    
    return $DriverTemplate
}

# Fonction principale
function Main {
    param(
        [string]$Action,
        [string]$TargetPath,
        [switch]$ForceUpdate,
        [string]$Manufacturers,
        [string]$Categories
    )
    
    Write-Host "Dynamic Repository Recognition and Constraint Management"
    Write-Host "Action: $Action"
    Write-Host "Target Path: $TargetPath"
    Write-Host "Force Update: $ForceUpdate"
    Write-Host "Manufacturers: $Manufacturers"
    Write-Host "Categories: $Categories"
    
    # Scan de la structure du repertoire
    $Structure = Scan-DirectoryStructure -Path $TargetPath
    
    Write-Host "Directory structure scanned:"
    Write-Host "- Directories: $($Structure.Directories.Count)"
    Write-Host "- Files: $($Structure.Files.Count)"
    Write-Host "- Drivers: $($Structure.Drivers.Count)"
    Write-Host "- Workflows: $($Structure.Workflows.Count)"
    Write-Host "- Documentation: $($Structure.Documentation.Count)"
    Write-Host "- Tools: $($Structure.Tools.Count)"
    
    # Sauvegarde de la structure
    $Structure | ConvertTo-Json -Depth 10 | Out-File -FilePath "ref/directory-structure.json" -Encoding UTF8
    
    # Detection intelligente des appareils de test
    $TestDevices = @(
        @{ Model = "TS0001"; Manufacturer = "Tuya"; Clusters = @("genBasic", "genOnOff") },
        @{ Model = "TS0207"; Manufacturer = "Zemismart"; Clusters = @("genBasic", "genOnOff", "genLevelCtrl") },
        @{ Model = "BW-SHP13"; Manufacturer = "BlitzWolf"; Clusters = @("genBasic", "genOnOff", "genPowerCfg") },
        @{ Model = "MS-104BZ"; Manufacturer = "Moes"; Clusters = @("genBasic", "genOnOff", "genLevelCtrl") },
        @{ Model = "GS-SD01"; Manufacturer = "Gosund"; Clusters = @("genBasic", "genOnOff", "genPowerCfg") },
        @{ Model = "MR-SS01"; Manufacturer = "Meross"; Clusters = @("genBasic", "genOnOff", "genLevelCtrl") },
        @{ Model = "TK-SS01"; Manufacturer = "Teckin"; Clusters = @("genBasic", "genOnOff", "genPowerCfg") },
        @{ Model = "UNKNOWN-001"; Manufacturer = "Unknown"; Clusters = @("genBasic", "genOnOff") }
    )
    
    $DetectedDevices = @()
    foreach ($Device in $TestDevices) {
        $DetectedDevice = Detect-Device -Model $Device.Model -Manufacturer $Device.Manufacturer -Clusters $Device.Clusters
        $DetectedDevices += $DetectedDevice
        Write-Host "Detected: $($Device.Model) -> $($DetectedDevice.Manufacturer) $($DetectedDevice.Category) (Confidence: $($DetectedDevice.Confidence))"
    }
    
    # Sauvegarde des appareils detectés
    $DetectedDevices | ConvertTo-Json -Depth 10 | Out-File -FilePath "ref/detected-devices-powershell.json" -Encoding UTF8
    
    # Generation de drivers intelligents
    $GeneratedDrivers = @()
    foreach ($Device in $DetectedDevices) {
        $Driver = Generate-IntelligentDriver -Device $Device
        $GeneratedDrivers += @{
            Device = $Device
            Driver = $Driver
        }
        Write-Host "Generated driver: $($Driver.id)"
    }
    
    # Creation du repertoire drivers/intelligent si necessaire
    $IntelligentDriversPath = "drivers/intelligent"
    if (-not (Test-Path $IntelligentDriversPath)) {
        New-Item -ItemType Directory -Path $IntelligentDriversPath -Force | Out-Null
    }
    
    # Sauvegarde des drivers generés
    foreach ($DriverData in $GeneratedDrivers) {
        $DriverPath = Join-Path $IntelligentDriversPath "$($DriverData.Driver.id).driver.compose.json"
        $DriverData.Driver | ConvertTo-Json -Depth 10 | Out-File -FilePath $DriverPath -Encoding UTF8
    }
    
    # Resume de generation
    $Summary = @{
        GeneratedAt = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        TotalDrivers = $GeneratedDrivers.Count
        ByConfidence = @{
            High = ($GeneratedDrivers | Where-Object { $_.Device.Confidence -ge 0.8 }).Count
            Medium = ($GeneratedDrivers | Where-Object { $_.Device.Confidence -ge 0.6 -and $_.Device.Confidence -lt 0.8 }).Count
            Low = ($GeneratedDrivers | Where-Object { $_.Device.Confidence -lt 0.6 }).Count
        }
        ByManufacturer = @{}
        ByCategory = @{}
    }
    
    foreach ($DriverData in $GeneratedDrivers) {
        $Manufacturer = $DriverData.Device.Manufacturer
        $Category = $DriverData.Device.Category
        
        if (-not $Summary.ByManufacturer.ContainsKey($Manufacturer)) {
            $Summary.ByManufacturer[$Manufacturer] = 0
        }
        $Summary.ByManufacturer[$Manufacturer]++
        
        if (-not $Summary.ByCategory.ContainsKey($Category)) {
            $Summary.ByCategory[$Category] = 0
        }
        $Summary.ByCategory[$Category]++
    }
    
    $Summary | ConvertTo-Json -Depth 10 | Out-File -FilePath "ref/driver-generation-summary-powershell.json" -Encoding UTF8
    
    Write-Host "Driver generation completed:"
    Write-Host "- Total drivers: $($Summary.TotalDrivers)"
    Write-Host "- High confidence: $($Summary.ByConfidence.High)"
    Write-Host "- Medium confidence: $($Summary.ByConfidence.Medium)"
    Write-Host "- Low confidence: $($Summary.ByConfidence.Low)"
    
    Write-Host "Dynamic repository recognition completed successfully"
}

# Execution principale
Main -Action $Action -TargetPath $TargetPath -ForceUpdate $ForceUpdate -Manufacturers $Manufacturers -Categories $Categories 