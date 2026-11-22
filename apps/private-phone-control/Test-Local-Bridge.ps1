# PowerShell. Creates one local, synthetic inbound event. Makes NO phone/API calls.
# Run AFTER Start-Private-Control.bat. No key or private phone text is printed.
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8789'
$keyFile = Join-Path $HOME '.streetwise-private/owner-key'
if (-not (Test-Path -LiteralPath $keyFile)) { throw 'Start the private controller once first.' }
$owner = (Get-Content -LiteralPath $keyFile -Raw).Trim()
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$null = Invoke-RestMethod -Uri "$base/api/login" -Method Post -WebSession $session -ContentType 'application/json' -Body (@{ key=$owner } | ConvertTo-Json)
Remove-Variable owner
$headers = @{ 'X-Streetwise-Request' = 'owner-ui' }
$device = Invoke-RestMethod -Uri "$base/api/devices" -Method Post -WebSession $session -Headers $headers -ContentType 'application/json' -Body (@{alias='Synthetic bridge test';platform='Other';integration='localhost diagnostic'} | ConvertTo-Json)
$bridge = Invoke-RestMethod -Uri "$base/api/devices/$($device.device.id)/bridge-token" -Method Post -WebSession $session -Headers $headers -ContentType 'application/json' -Body '{}'
$bridgeHeaders = @{'X-Streetwise-Device'=$device.device.id; 'X-Streetwise-Bridge-Key'=$bridge.bridgeKey}
$ref = 'synthetic-' + ([guid]::NewGuid().ToString('N'))
$result = Invoke-RestMethod -Uri "$base/api/bridge/event" -Method Post -Headers $bridgeHeaders -ContentType 'application/json' -Body (@{kind='sms';reference=$ref;fromLast4='0000'} | ConvertTo-Json)
Remove-Variable bridge, bridgeHeaders
Write-Host "Accepted synthetic event: $($result.accepted); event ID: $($result.eventId)"
Write-Host 'Open Events & approvals in the dashboard. This is NOT a carrier SMS.'
