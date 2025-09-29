# This script automates the Homey app publishing process.
# It answers interactive prompts and logs the output to a file to prevent buffer errors.

# Create project-data directory if it doesn't exist
if (-not (Test-Path -Path 'project-data')) {
  New-Item -ItemType Directory -Path 'project-data' | Out-Null
}

# CRITICAL: Clean .homeycompose directory to prevent cached file issues
Write-Host "Cleaning .homeycompose directory to prevent cached file issues..."
if (Test-Path ".homeycompose") {
  Remove-Item ".homeycompose" -Recurse -Force
  Write-Host "✓ Cleaned .homeycompose directory"
} else {
  Write-Host "✓ .homeycompose directory not present"
}

# The input string sequence:
# 1. 'y' + Enter -> Yes, continue with uncommitted changes.
# 2. 'y' + Enter -> Yes, update the app's version number.
# 3. Down arrow + Enter -> Select 'Patch' for the version bump.
# Note: The down arrow is represented by the ANSI escape sequence for Down Arrow.
$downArrow = "`e[B"
$inputs = "y`ny`n$downArrow`n"

# Run the publish command with automated input and log the output.
Write-Host "Starting Homey app publish..."
$process = Start-Process -FilePath "homey" -ArgumentList "app publish" -RedirectStandardInput -RedirectStandardOutput -RedirectStandardError -PassThru -NoNewWindow

# Send the automated inputs to the process.
$process.StandardInput.WriteLine($inputs)

# Capture and log the output.
$output = $process.StandardOutput.ReadToEnd()
$errorOutput = $process.StandardError.ReadToEnd()
$process.WaitForExit()

$logFile = "project-data\publish-log-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').txt"

"--- STDOUT ---" | Out-File -FilePath $logFile -Encoding utf8
$output | Out-File -FilePath $logFile -Encoding utf8 -Append

if ($errorOutput) {
  "`n--- STDERR ---" | Out-File -FilePath $logFile -Encoding utf8 -Append
  $errorOutput | Out-File -FilePath $logFile -Encoding utf8 -Append
}

Write-Host "Publish process finished. See log file for details: $logFile"

# Display the output in the console as well
Write-Host "--- PUBLISH OUTPUT ---"
Write-Host $output
if ($errorOutput) {
    Write-Host "--- PUBLISH ERRORS ---"
    Write-Host $errorOutput -ForegroundColor Red
}

if ($process.ExitCode -ne 0) {
    Write-Host "Publish command failed with exit code $($process.ExitCode)." -ForegroundColor Red
}
