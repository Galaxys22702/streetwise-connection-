# No credentials are saved to disk.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -or [int]((node --version).TrimStart('v').Split('.')[0]) -lt 24) {
    Write-Host 'Install Node.js 24 LTS for Windows from https://nodejs.org/en/download, then reopen this launcher.'
    exit 1
}
$portValue = 3000
if ($env:PORT -and (-not [int]::TryParse($env:PORT, [ref]$portValue) -or $portValue -lt 1 -or $portValue -gt 65535)) {
    Write-Host 'PORT must be a number between 1 and 65535.'
    exit 1
}
$url = "http://127.0.0.1:$portValue"
$probe = [System.Net.Sockets.TcpClient]::new()
try {
    $probe.Connect('127.0.0.1', $portValue)
    Write-Host "Port $portValue is already in use. Close the other JARVIS window first."
    exit 1
} catch [System.Net.Sockets.SocketException] {
    # A refused connection means the local port is available.
} finally { $probe.Dispose() }
$previousKey = $env:OPENAI_API_KEY
$process = $null
$keySecure = Read-Host 'OpenAI API key (hidden; leave blank for offline planners)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keySecure)
try { $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr); $keySecure.Dispose() }
try {
    $process = Start-Process -FilePath $node.Source -ArgumentList 'server.js' -WorkingDirectory $PSScriptRoot -NoNewWindow -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($process.HasExited) { throw 'JARVIS exited before startup completed.' }
        try {
            $health = Invoke-RestMethod -Uri "$url/health" -TimeoutSec 1
            if ($health.ok) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw 'JARVIS did not become ready.' }
    Start-Process $url
    Write-Host "JARVIS is ready at $url. Keep this window open."
    Write-Host 'Press Enter here to stop JARVIS.'
    [void](Read-Host)
} finally {
    if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id }
    if ($null -eq $previousKey) { Remove-Item Env:\OPENAI_API_KEY -ErrorAction SilentlyContinue }
    else { $env:OPENAI_API_KEY = $previousKey }
    $previousKey = $null
}
