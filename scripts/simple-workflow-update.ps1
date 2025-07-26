# Simple Workflow Update Script
Write-Host "Updating workflows..." -ForegroundColor Green

# Create weekly optimization workflow
$WeeklyContent = @"
name: Weekly Optimization

on:
  schedule:
    - cron: '0 2 * * 1'
  workflow_dispatch:

jobs:
  weekly-optimization:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Run Weekly Optimization
        run: |
          powershell -ExecutionPolicy Bypass -File "scripts/weekly-optimization.ps1"
"@

Set-Content -Path ".github/workflows/weekly-optimization-simple.yml" -Value $WeeklyContent -Encoding UTF8
Write-Host "Weekly optimization workflow created" -ForegroundColor Green

# Create continuous monitoring workflow
$MonitoringContent = @"
name: Continuous Monitoring

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  monitor-project:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Generate Statistics
        run: |
          SDK3_COUNT=\$(find drivers/sdk3 -type d 2>/dev/null | wc -l)
          LEGACY_COUNT=\$(find drivers/legacy -type d 2>/dev/null | wc -l)
          IN_PROGRESS_COUNT=\$(find drivers/in_progress -type d 2>/dev/null | wc -l)
          TOTAL_DRIVERS=\$((SDK3_COUNT + LEGACY_COUNT + IN_PROGRESS_COUNT))
          
          mkdir -p dashboard
          echo "# Dashboard de Monitoring" > dashboard/monitoring.md
          echo "" >> dashboard/monitoring.md
          echo "## Drivers" >> dashboard/monitoring.md
          echo "- Total: \$TOTAL_DRIVERS" >> dashboard/monitoring.md
          echo "- SDK3: \$SDK3_COUNT" >> dashboard/monitoring.md
          echo "- Legacy: \$LEGACY_COUNT" >> dashboard/monitoring.md
          echo "- En cours: \$IN_PROGRESS_COUNT" >> dashboard/monitoring.md
          echo "" >> dashboard/monitoring.md
          echo "Date: \$(date '+%Y-%m-%d %H:%M:%S')" >> dashboard/monitoring.md
          
      - name: Commit Dashboard
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add dashboard/monitoring.md
          git commit -m "Dashboard updated - \$(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes"
          git push
"@

Set-Content -Path ".github/workflows/continuous-monitoring.yml" -Value $MonitoringContent -Encoding UTF8
Write-Host "Continuous monitoring workflow created" -ForegroundColor Green

# Create driver migration workflow
$MigrationContent = @"
name: Driver Migration

on:
  schedule:
    - cron: '0 4 * * *'
  workflow_dispatch:

jobs:
  migrate-drivers:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Migrate Drivers
        run: |
          mkdir -p drivers/sdk3 drivers/legacy drivers/in_progress
          
          for driver_dir in drivers/*/; do
            if [ -d "\$driver_dir" ]; then
              driver_name=\$(basename "\$driver_dir")
              
              if [[ "\$driver_name" =~ ^(sdk3|legacy|in_progress)\$ ]]; then
                continue
              fi
              
              device_file="\$driver_dir/device.js"
              if [ -f "\$device_file" ]; then
                if grep -q "Homey\.Device\|SDK3\|v3" "\$device_file"; then
                  echo "Migrating \$driver_name to SDK3"
                  mv "\$driver_dir" "drivers/sdk3/"
                elif grep -q "Homey\.Manager\|SDK2\|v2" "\$device_file"; then
                  echo "Migrating \$driver_name to Legacy"
                  mv "\$driver_dir" "drivers/legacy/"
                else
                  echo "Migrating \$driver_name to In Progress"
                  mv "\$driver_dir" "drivers/in_progress/"
                fi
              else
                echo "Migrating \$driver_name to In Progress (no device.js)"
                mv "\$driver_dir" "drivers/in_progress/"
              fi
            fi
          done
          
      - name: Commit Changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add -A
          git commit -m "Driver migration completed - \$(date '+%Y-%m-%d %H:%M:%S')"
          git push
"@

Set-Content -Path ".github/workflows/driver-migration.yml" -Value $MigrationContent -Encoding UTF8
Write-Host "Driver migration workflow created" -ForegroundColor Green

Write-Host "All workflows updated successfully!" -ForegroundColor Green 


