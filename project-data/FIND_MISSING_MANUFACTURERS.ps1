# Script pour identifier les manufacturer names manquants et similaires
# Recherche les patterns et suggère des ajouts pour compléter la couverture

$driversPath = "c:\Users\HP\Desktop\homey app\tuya_repair\drivers"

# Patterns connus de manufacturer IDs Tuya
$knownPrefixes = @{
    "_TZ3000_" = "Standard Tuya Zigbee 3.0 devices"
    "_TZE200_" = "Tuya MCU devices with cluster 0xEF00"
    "_TZE204_" = "Tuya MCU devices variant 204"
    "_TZE284_" = "Tuya MCU devices variant 284"
    "_TZ3210_" = "Tuya Zigbee 3.0 variant 210"
    "_TYZB01_" = "Older Tuya Zigbee devices"
    "_TYZB02_" = "Older Tuya Zigbee devices variant 2"
    "_TZ2000_" = "Tuya Zigbee 2.0 devices"
    "_TZ3040_" = "Tuya Zigbee 3.0 variant 040"
    "_TZ3400_" = "Tuya Zigbee 3.0 variant 400"
    "_TZ1800_" = "Tuya Zigbee variant 1800"
}

# Lire tous les manufacturers existants
$allManufacturers = @{}
Get-ChildItem -Path $driversPath -Recurse -Filter "driver.compose.json" | ForEach-Object {
    try {
        $json = Get-Content $_.FullName -Raw | ConvertFrom-Json
        if ($json.zigbee -and $json.zigbee.manufacturerName) {
            $json.zigbee.manufacturerName | ForEach-Object {
                $allManufacturers[$_] = $true
            }
        }
    } catch {}
}

Write-Host "📋 MANUFACTURERS EXISTANTS DANS LE PROJET" -ForegroundColor Green
Write-Host "=" * 80
Write-Host "Total: $($allManufacturers.Count) manufacturer names uniques`n"

# Grouper par préfixe
$byPrefix = @{}
foreach ($mfr in $allManufacturers.Keys) {
    foreach ($prefix in $knownPrefixes.Keys) {
        if ($mfr.StartsWith($prefix)) {
            if (-not $byPrefix.ContainsKey($prefix)) {
                $byPrefix[$prefix] = @()
            }
            $byPrefix[$prefix] += $mfr
            break
        }
    }
}

foreach ($prefix in $byPrefix.Keys | Sort-Object) {
    $count = $byPrefix[$prefix].Count
    $description = $knownPrefixes[$prefix]
    Write-Host ("{0,-15} : {1,3} IDs - {2}" -f $prefix, $count, $description)
}

Write-Host "`n🔍 MANUFACTURER NAMES MANQUANTS À RECHERCHER" -ForegroundColor Cyan
Write-Host "=" * 80
Write-Host "Basé sur les patterns de la communauté Tuya/Zigbee2MQTT:"

# Liste des manufacturer IDs connus mais potentiellement manquants
# Source: Zigbee2MQTT, GitHub issues, forums Homey
$potentialMissing = @{
    "_TZ3000_" = @(
        "vzopcetz", "1obwwnmq", "4uf3d0ax", "wzauvbcs", "vmpbygs5",
        "qd7hej8u", "12sxjap4", "hlijwsai", "q50zhdsc", "8uaoilu9",
        "9cpuaca6", "kdpxju99", "h1jnz6l8", "5bsf8vaj", "oborybow",
        "49qchf10", "el5kt5im", "dbou1ap4", "keabpigv", "odygigth",
        "riwp3k79", "obacbukl", "dl4pxp1r", "qqjaziws", "i8l0nqdu",
        "ukuvyhaa", "utagpnzs", "gek6snaj", "lvhy15ix", "92chsky7",
        "ktuoyvt5", "mgusv51k", "zmy4lslw", "pmz6mjyu", "4js9lo5d",
        "fisb3ajo", "bvrlqyj7", "jl7qyupf", "7ed9cqgi", "18ejxno0",
        "llfaquvp", "lmlsduws", "qaa59zqd", "odzoiovu"
    )
    "_TZE200_" = @(
        "3p5ydos3", "la2c2uo9", "ip2akl4w", "1agwnems", "579lguh2",
        "vucankjx", "4mh6tyyo", "e3oitdyu", "gwkapsoq", "fjjbhx9d",
        "s8gkrkxk", "ztc6ggyl", "2aaelwxk", "sgpeacqp", "wukb7rhc",
        "xpq2rzhq", "holel4dk", "jva8ink8", "lyetpprm", "ikvncluo",
        "yvx5lh6k", "8ygsuhe1", "mja3fuja", "ryfmq5rl", "c2fmom5z"
    )
    "_TZE204_" = @(
        "hlx9tnzb", "n9ctkb6j", "9qhuzgo0", "zenj4lxv", "bxoo2swd",
        "xsm7l9xa", "qasjif9e", "ijxvkhd0", "sxm7l9xa", "ztc6ggyl",
        "upagmta9", "ntcy3xu1", "1fuxihti", "aoclfnxz", "myd45weu"
    )
    "_TZE284_" = @(
        "vvmbj46n", "aao3yzhs", "sgabhwa6", "hhrtiq0x"
    )
    "_TZ3210_" = @(
        "ngqk6jia", "zxbtub8r", "weaqkhab", "k1msuvg6", "wdexaypg",
        "3mpwqzuu", "pagajpog", "4ubylghk", "x13bu7za", "k1pe6ibm",
        "r0xgkft5", "invesber", "iystcadi", "mja6r5ix", "zdrhqmo0",
        "dwytrmda", "ol1uhvza", "eymunffl", "7jnk7l3k", "ncw88jfq"
    )
    "_TYZB01_" = @(
        "qezuin6k", "v8gtiaed", "iuepbmpv", "xfpdrwvc", "qeqvmvti",
        "seqwasot", "mtlhqn48", "6sadkhcy", "vzrytttn", "2athzhfr",
        "xiuox57i", "b8cr31hp", "mqel1whf", "ymcdbl3u", "4tlksk8a",
        "phjeraqq", "ncutbjdi", "aneiicmq", "zsl6z0pw", "digziiav",
        "sqmd19i1", "dsjszp0x", "wqcac7lo", "xph99wvr", "ftdkanlj",
        "kvwjujy9", "jytabjkb", "dl7cejts", "cbiezpds", "hjsgdkfl",
        "a476raq2"
    )
    "_TYZB02_" = @(
        "keyjqthh", "keyjhapk", "key8kk7r"
    )
    "_TZ3400_" = @(
        "keyjhapk"
    )
    "_TZ2000_" = @(
        "a476raq2", "xogb73am", "avdnvykf", "hjsgdkfl"
    )
    "_TZ1800_" = @(
        "ejwkn2h2", "fcdjzz3s"
    )
}

foreach ($prefix in $potentialMissing.Keys | Sort-Object) {
    $missing = @()
    foreach ($suffix in $potentialMissing[$prefix]) {
        $fullId = $prefix + $suffix
        if (-not $allManufacturers.ContainsKey($fullId)) {
            $missing += $fullId
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "`n$prefix ($($missing.Count) manquants)" -ForegroundColor Yellow
        $missing | Sort-Object | ForEach-Object {
            Write-Host "  ❌ $_" -ForegroundColor Red
        }
    } else {
        Write-Host "`n$prefix ✅ Tous présents" -ForegroundColor Green
    }
}

# Générer un rapport détaillé
$report = @"
# RAPPORT D'ANALYSE - MANUFACTURER NAMES MANQUANTS
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Statistiques
- **Total manufacturers dans le projet**: $($allManufacturers.Count)
- **Préfixes identifiés**: $($byPrefix.Count)

## Manufacturer Names à ajouter

### Sources recommandées pour la recherche:
1. **Zigbee2MQTT Database**: https://www.zigbee2mqtt.io/supported-devices/
2. **GitHub Issues**: https://github.com/JohanBendz/com.tuya.zigbee/issues
3. **Homey Community Forum**: https://community.homey.app/t/app-pro-tuya-zigbee-app/
4. **Diagnostic Reports**: Analyser les rapports d'utilisateurs

### Méthodologie de recherche:
1. Rechercher chaque manufacturer ID manquant sur Zigbee2MQTT
2. Identifier le product ID (TS0201, TS0601, etc.)
3. Déterminer les capabilities (temperature, humidity, motion, etc.)
4. Assigner au driver approprié
5. Tester avec un appareil physique si possible

### Patterns à surveiller:
"@

foreach ($prefix in $byPrefix.Keys | Sort-Object) {
    $count = $byPrefix[$prefix].Count
    $report += "`n- **$prefix**: $count IDs existants - $($knownPrefixes[$prefix])"
}

$report += @"

## Actions recommandées:

### Phase 1: Compléter les variantes _TZE284_
Les manufacturer IDs _TZE284_ sont des variantes de _TZE204_ et _TZE200_.
Vérifier systématiquement pour chaque _TZE204_xxx si _TZE284_xxx existe.

### Phase 2: Rechercher les _TZ3210_ manquants
Pattern émergent pour les dimmers et LED controllers.
"@

$reportPath = "c:\Users\HP\Desktop\homey app\tuya_repair\MISSING_MANUFACTURERS_REPORT.md"
$report | Set-Content $reportPath

Write-Host "`n✅ Rapport détaillé généré: MISSING_MANUFACTURERS_REPORT.md" -ForegroundColor Green

Write-Host "`n🌐 PROCHAINES ÉTAPES:" -ForegroundColor Magenta
Write-Host "=" * 80
Write-Host "1. Consulter Zigbee2MQTT pour chaque ID manquant"
Write-Host "2. Vérifier les GitHub issues pour les demandes d'utilisateurs"
Write-Host "3. Analyser les diagnostic reports récents"
Write-Host "4. Créer une matrice manufacturer ID → driver approprié"
Write-Host "5. Tester avec des appareils physiques si disponibles"
Write-Host "`n💡 Astuce: Beaucoup de manufacturer IDs sont des variantes"
Write-Host "   du même appareil avec différentes versions firmware."
