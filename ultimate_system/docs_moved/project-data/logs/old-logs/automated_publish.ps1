param([string]$Action = "publish")

# Function to handle Homey app publish with automated responses
function Publish-HomeyApp {
    $ErrorActionPreference = "Continue"
    
    Write-Host "Starting Homey app publication process..." -ForegroundColor Green
    
    # Create input for the interactive prompts
    $responses = @(
        "n",  # Don't update version
        "SDK v3 Zigbee compatibility update - Enhanced device support for 550+ devices with proper endpoint definitions and zero validation errors. Production ready with full Homey SDK 3 compliance."  # Changelog
    )
    
    try {
        # Use cmd to handle the input piping properly
        $inputString = $responses -join "`r`n"
        $inputString += "`r`n"
        
        Write-Host "Input prepared: $inputString" -ForegroundColor Yellow
        
        # Execute the command with input redirection
        $process = Start-Process -FilePath "cmd" -ArgumentList "/c", "echo $($inputString.Replace('`r`n', '& echo ')) | homey app publish" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "publish_output.txt" -RedirectStandardError "publish_error.txt"
        
        # Check the exit code
        if ($process.ExitCode -eq 0) {
            Write-Host "Publication successful!" -ForegroundColor Green
            Get-Content "publish_output.txt" -ErrorAction SilentlyContinue
        } else {
            Write-Host "Publication failed with exit code: $($process.ExitCode)" -ForegroundColor Red
            Write-Host "Output:" -ForegroundColor Yellow
            Get-Content "publish_output.txt" -ErrorAction SilentlyContinue
            Write-Host "Errors:" -ForegroundColor Red
            Get-Content "publish_error.txt" -ErrorAction SilentlyContinue
            return $false
        }
        
        return $true
        
    } catch {
        Write-Host "Error during publication: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
if ($Action -eq "publish") {
    $success = Publish-HomeyApp
    if (-not $success) {
        Write-Host "Retrying publication..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        $success = Publish-HomeyApp
    }
    
    if ($success) {
        Write-Host "Homey app published successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Failed to publish Homey app after retries." -ForegroundColor Red
        exit 1
    }
}
