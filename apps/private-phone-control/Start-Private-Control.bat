@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js was not found. Install Node.js 24 LTS, then start this file again.
    pause
    exit /b 1
)
echo.
echo ============================================
echo  STREETWISE PRIVATE COMMUNICATIONS CONTROL
echo ============================================
echo  Browser: http://127.0.0.1:8789/
echo  LOCAL ONLY. NOT CONNECTED TO LIVE CALLS/SMS.
echo  The owner key is stored in your Windows user profile.
echo  Do not share any key or open port 8789 to the Internet.
echo.
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8789/'"
node "%~dp0server.mjs"
echo The local controller has stopped.
pause
