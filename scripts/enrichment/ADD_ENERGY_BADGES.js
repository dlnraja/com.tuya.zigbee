#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * ADD ENERGY BADGES TO DRIVER IMAGES
 * Ajoute le petit logo de type d'énergie en bas à droite
 * AC power, Battery, Low battery
 */

class EnergyBadgeAdder {
  constructor() {
    this.stats = {
      ac_powered: [],
      battery_powered: [],
      hybrid_powered: [],
      no_energy_info: [],
      badges_added: 0
    };
  }

  async analyzeDriverEnergy() {
    console.log('🔋 ANALYZING DRIVER ENERGY TYPES\n');
    
    const driversDir = path.join(__dirname, '../..', 'drivers');
    const folders = await fs.readdir(driversDir);
    
    for (const folder of folders) {
      try {
        const driverPath = path.join(driversDir, folder);
        const stats = await fs.stat(driverPath);
        if (!stats.isDirectory()) continue;
        
        // Read driver.compose.json
        const composePath = path.join(driverPath, 'driver.compose.json');
        try {
          const compose = JSON.parse(await fs.readFile(composePath, 'utf8'));
          
          if (compose.energy) {
            if (compose.energy.batteries) {
              this.stats.battery_powered.push({
                driver: folder,
                batteries: compose.energy.batteries
              });
            } else {
              this.stats.ac_powered.push(folder);
            }
          } else {
            // Infer from name
            if (folder.includes('battery') || folder.includes('cr2032') || folder.includes('cr2450')) {
              this.stats.battery_powered.push({
                driver: folder,
                batteries: ['inferred']
              });
            } else if (folder.includes('hybrid')) {
              this.stats.hybrid_powered.push(folder);
            } else if (folder.includes('_ac') || folder.endsWith('ac')) {
              this.stats.ac_powered.push(folder);
            } else {
              this.stats.no_energy_info.push(folder);
            }
          }
        } catch (err) {
          // No compose file
        }
      } catch (err) {
        // Skip
      }
    }
    
    console.log('📊 Energy Type Distribution:\n');
    console.log(`  🔌 AC powered: ${this.stats.ac_powered.length} drivers`);
    console.log(`  🔋 Battery powered: ${this.stats.battery_powered.length} drivers`);
    console.log(`  ⚡ Hybrid powered: ${this.stats.hybrid_powered.length} drivers`);
    console.log(`  ❓ No energy info: ${this.stats.no_energy_info.length} drivers`);
  }

  async generateBadgeOverlayScript() {
    console.log('\n🎨 GENERATING BADGE OVERLAY SCRIPT\n');
    
    // Create PowerShell script for ImageMagick overlay
    const script = `# Add Energy Badges to Driver Images
# Requires ImageMagick: https://imagemagick.org/

Write-Host "🔋 Energy Badge Overlay Tool" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check ImageMagick
$magickCmd = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magickCmd) {
    Write-Host "ERROR: ImageMagick not found!" -ForegroundColor Red
    Write-Host "Install from: https://imagemagick.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found ImageMagick: $($magickCmd.Source)" -ForegroundColor Green
Write-Host ""

$rootPath = "${path.join(__dirname, '../..').replace(/\\/g, '\\\\')}"
$iconPath = "$rootPath\\assets\\icons"

# Function to add badge
function Add-EnergyBadge {
    param(
        [string]$imagePath,
        [string]$badgeType
    )
    
    $badgePath = "$iconPath\\power-$badgeType.svg"
    
    if (-not (Test-Path $badgePath)) {
        Write-Host "  ⚠️  Badge not found: $badgePath" -ForegroundColor Yellow
        return $false
    }
    
    # Create backup
    $backupPath = $imagePath + ".nobadge"
    if (-not (Test-Path $backupPath)) {
        Copy-Item $imagePath $backupPath -Force
    }
    
    # Add badge overlay (bottom-right corner, 20% size)
    try {
        # Convert SVG badge to PNG first
        $tempBadge = "$env:TEMP\\badge-$badgeType.png"
        magick convert $badgePath -resize 100x100 $tempBadge
        
        # Composite badge onto image
        magick composite -gravity SouthEast -geometry +10+10 $tempBadge $imagePath $imagePath
        
        Remove-Item $tempBadge -Force
        return $true
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
        return $false
    }
}

# Process battery-powered drivers
Write-Host "🔋 Processing battery-powered drivers..." -ForegroundColor Yellow
$batteryDrivers = @(
${this.stats.battery_powered.map(d => `    "${d.driver}"`).join(',\n')}
)

$processed = 0
foreach ($driver in $batteryDrivers) {
    $imagePath = "$rootPath\\drivers\\$driver\\assets\\large.png"
    if (Test-Path $imagePath) {
        if (Add-EnergyBadge -imagePath $imagePath -badgeType "battery") {
            Write-Host "  ✅ $driver" -ForegroundColor Green
            $processed++
        }
    }
}

# Process AC-powered drivers
Write-Host ""
Write-Host "🔌 Processing AC-powered drivers..." -ForegroundColor Yellow
$acDrivers = @(
${this.stats.ac_powered.map(d => `    "${d}"`).join(',\n')}
)

foreach ($driver in $acDrivers) {
    $imagePath = "$rootPath\\drivers\\$driver\\assets\\large.png"
    if (Test-Path $imagePath) {
        if (Add-EnergyBadge -imagePath $imagePath -badgeType "ac") {
            Write-Host "  ✅ $driver" -ForegroundColor Green
            $processed++
        }
    }
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Processed: $processed drivers" -ForegroundColor Green
Write-Host "Backups saved with .nobadge extension" -ForegroundColor Yellow
`;

    const scriptPath = path.join(__dirname, '../../scripts/add-energy-badges.ps1');
    await fs.writeFile(scriptPath, script);
    console.log(`  ✅ Generated: scripts/add-energy-badges.ps1`);
  }

  async createMissingBadgeIcons() {
    console.log('\n🎨 CHECKING ENERGY BADGE ICONS\n');
    
    const iconsPath = path.join(__dirname, '../..', 'assets/icons');
    
    const requiredIcons = [
      'power-ac.svg',
      'power-battery.svg',
      'power-battery-low.svg'
    ];
    
    for (const icon of requiredIcons) {
      const iconPath = path.join(iconsPath, icon);
      try {
        await fs.access(iconPath);
        console.log(`  ✅ ${icon}`);
      } catch (err) {
        console.log(`  ❌ ${icon} - NOT FOUND`);
        console.log(`     Creating placeholder...`);
        
        // Create simple SVG placeholder
        let svg = '';
        if (icon.includes('battery')) {
          svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="2" y="7" width="16" height="10" rx="1" fill="#4CAF50"/>
  <path d="M18 10h2v4h-2"/>
  <text x="6" y="15" font-size="8" fill="white" font-family="Arial">BAT</text>
</svg>`;
        } else {
          svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="8" fill="#FF9800"/>
  <path d="M12 8v8M8 12h8" stroke="white" stroke-width="2"/>
</svg>`;
        }
        
        await fs.writeFile(iconPath, svg);
        console.log(`     ✅ Created placeholder ${icon}`);
      }
    }
  }

  async generateReport() {
    console.log('\n\n📊 ENERGY BADGE REPORT\n');
    console.log('='.repeat(50));
    
    console.log('\n📈 Statistics:');
    console.log(`  Total drivers analyzed: ${this.stats.ac_powered.length + this.stats.battery_powered.length + this.stats.hybrid_powered.length + this.stats.no_energy_info.length}`);
    console.log(`  Battery powered: ${this.stats.battery_powered.length}`);
    console.log(`  AC powered: ${this.stats.ac_powered.length}`);
    console.log(`  Hybrid: ${this.stats.hybrid_powered.length}`);
    console.log(`  Unknown: ${this.stats.no_energy_info.length}`);
    
    console.log('\n🎨 Badge Icons:');
    console.log('  ✅ power-ac.svg - AC powered devices');
    console.log('  ✅ power-battery.svg - Battery powered devices');
    console.log('  ✅ power-battery-low.svg - Low battery warning');
    
    console.log('\n📝 To Add Badges:');
    console.log('  1. Install ImageMagick: https://imagemagick.org/');
    console.log('  2. Run: pwsh scripts/add-energy-badges.ps1');
    console.log('  3. Review images with badges');
    console.log('  4. Commit changes');
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_drivers: this.stats.ac_powered.length + this.stats.battery_powered.length + this.stats.hybrid_powered.length + this.stats.no_energy_info.length,
        ac_powered: this.stats.ac_powered.length,
        battery_powered: this.stats.battery_powered.length,
        hybrid_powered: this.stats.hybrid_powered.length,
        unknown: this.stats.no_energy_info.length
      },
      drivers: {
        battery: this.stats.battery_powered,
        ac: this.stats.ac_powered,
        hybrid: this.stats.hybrid_powered,
        unknown: this.stats.no_energy_info
      },
      script: 'scripts/add-energy-badges.ps1'
    };
    
    const reportPath = path.join(__dirname, '../../reports/ENERGY_BADGES_REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report: ${reportPath}`);
  }
}

async function main() {
  console.log('🔋 ENERGY BADGE MANAGER\n');
  console.log('This tool will:');
  console.log('  1. Analyze driver energy types');
  console.log('  2. Create badge icons if missing');
  console.log('  3. Generate PowerShell overlay script');
  console.log('  4. Prepare batch badge addition\n');
  console.log('='.repeat(50) + '\n');
  
  const badger = new EnergyBadgeAdder();
  
  await badger.analyzeDriverEnergy();
  await badger.createMissingBadgeIcons();
  await badger.generateBadgeOverlayScript();
  await badger.generateReport();
  
  console.log('\n\n✅ ENERGY BADGE SETUP COMPLETE!\n');
  console.log('🎨 Next: Run badge overlay script');
  console.log('📝 Review: reports/ENERGY_BADGES_REPORT.json\n');
}

main().catch(console.error);
