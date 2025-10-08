$url = "https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/"
$html = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
$html -match '<title>(.*?)</title>' | Out-Null
$title = $Matches[1]
"Title: $title" > forum_data.txt
