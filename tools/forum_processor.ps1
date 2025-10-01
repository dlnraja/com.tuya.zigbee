# PowerShell Forum Processor
# Downloads and processes Homey forum content locally

$url = "https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/"
$outputFile = "forum_analysis.json"

# Download forum page
$html = Invoke-WebRequest -Uri $url -UseBasicParsing

# Extract threads
$threads = @()
$html.ParsedHtml.getElementsByClassName('topic-list-item') | ForEach-Object {
    $title = $_.getElementsByClassName('title')[0].innerText
    $author = $_.getElementsByClassName('creator')[0].innerText
    $date = $_.getElementsByClassName('date')[0].innerText
    
    $threads += [PSCustomObject]@{
        Title = $title
        Author = $author
        Date = $date
    }
}

# Save results
$threads | ConvertTo-Json | Out-File $outputFile

Write-Host "Saved $($threads.Count) threads to $outputFile"
