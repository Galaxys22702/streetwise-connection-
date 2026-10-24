# JARVIS RF inventory (Windows, read-only)
# Run in PowerShell on the HP. Does not change drivers, connect to devices, or transmit RF.
$ErrorActionPreference = 'Continue'
$report = [ordered]@{
  collectedAt = (Get-Date).ToString('o')
  computer = $env:COMPUTERNAME
  radios = @()
  wifiInterfaces = @()
  wifiDrivers = @()
}
try {
  $report.radios = @(Get-PnpDevice -PresentOnly -ErrorAction Stop |
    Where-Object { $_.FriendlyName -match 'RTL|SDR|Radio|Bluetooth|Wireless|Wi-Fi|2832' } |
    Select-Object Status, Class, FriendlyName)
} catch { Write-Warning "Radio inventory unavailable: $($_.Exception.Message)" }
try { $report.wifiInterfaces = @(netsh wlan show interfaces 2>&1) } catch {}
try { $report.wifiDrivers = @(netsh wlan show drivers 2>&1) } catch {}
$path = Join-Path $env:TEMP 'jarvis-rf-inventory.json'
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $path -Encoding UTF8
Write-Host "Inventory saved: $path"
Write-Host 'Review before sharing: Wi-Fi interface output may include network names and identifiers.'
