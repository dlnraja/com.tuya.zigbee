# PowerShell script for Homey app publication
$responses = @("y", "y", "", "v1.1.0 MASSIVE EXPANSION: 101 New Community Drivers + 110 Updated Drivers - Complete community integration with 1500+ devices from 80+ manufacturers. Professional device images, SDK3 compliance, and comprehensive validation.", "")

$process = Start-Process -FilePath "homey" -ArgumentList "app", "publish" -PassThru -NoNewWindow -RedirectStandardInput -RedirectStandardOutput -RedirectStandardError

foreach ($response in $responses) {
    Start-Sleep -Seconds 2
    $process.StandardInput.WriteLine($response)
    $process.StandardInput.Flush()
}

$process.WaitForExit()
Write-Host "Publication completed with exit code: $($process.ExitCode)"
