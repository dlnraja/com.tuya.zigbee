# BUFFER-SAFE HOMEY PUBLISH v1.0.31
Write-Host "Buffer-Safe Publisher v1.0.31" -ForegroundColor Green

# Clean cache
Remove-Item ".homeybuild" -Recurse -Force -ErrorAction SilentlyContinue

# Create log directory
New-Item -ItemType Directory -Path "logs" -Force -ErrorAction SilentlyContinue

# Publish with output redirection to avoid buffer overflow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "logs\publish-$timestamp.log"

Write-Host "Publishing with buffer management..." -ForegroundColor Yellow

try {
    # Use cmd with redirection to avoid PowerShell buffer limits
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "homey app publish > `"$logFile`" 2>&1" -Wait -PassThru -WindowStyle Hidden
    
    Write-Host "Process exit code: $($process.ExitCode)" -ForegroundColor Green
    
    # Show last few lines
    if (Test-Path $logFile) {
        $lastLines = Get-Content $logFile -Tail 5
        $lastLines | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Publication completed! Check: $logFile" -ForegroundColor Green
