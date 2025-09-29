
# PowerShell version with proper input handling
$changelog = "🔧 FLOW CARDS FIX! Added working triggers, actions, and conditions for comprehensive automation. Fixed compilation issue that prevented flow cards from appearing on app page. Professional automation now available!"

Write-Host "📦 Publishing v1.0.9 with automatic changelog..."

# Use SendKeys properly
Add-Type -AssemblyName System.Windows.Forms
$proc = Start-Process "homey" -ArgumentList "app", "publish" -PassThru -WindowStyle Normal
Start-Sleep 2
[System.Windows.Forms.SendKeys]::SendWait("n{ENTER}")
Start-Sleep 3
[System.Windows.Forms.SendKeys]::SendWait("$changelog{ENTER}")
$proc.WaitForExit()
Write-Host "✅ Publication completed!"
