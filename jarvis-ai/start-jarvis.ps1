# JARVIS AI private Windows launcher
# Run in PowerShell from the jarvis-ai directory. No API key is stored on disk.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
 Write-Host 'Node.js 20+ is required. Install the LTS version from https://nodejs.org/en/download, then re-run this script.' -ForegroundColor Yellow
 exit 1
}
$versionText = (node --version).TrimStart('v')
if ([int]($versionText.Split('.')[0]) -lt 20) {
 Write-Host 'Please update Node.js to version 20 or later.' -ForegroundColor Yellow
 exit 1
}
Write-Host 'JARVIS runs only on this computer: http://127.0.0.1:3000'
Write-Host 'Your API key is never saved to a file or sent to this script author.'
$keySecure = Read-Host 'Paste your OpenAI API key (hidden input)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keySecure)
try {
 $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
if ([string]::IsNullOrWhiteSpace($env:OPENAI_API_KEY)) {
 Write-Host 'No API key supplied; JARVIS not started.' -ForegroundColor Yellow
 exit 1
}
try {
 Start-Process 'http://127.0.0.1:3000'
 Write-Host 'Starting JARVIS. Keep this PowerShell window open. Press Ctrl+C to stop.' -ForegroundColor Cyan
 node server.js
} finally {
 Remove-Item Env:\OPENAI_API_KEY -ErrorAction SilentlyContinue
}
