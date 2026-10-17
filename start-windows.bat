@echo off
setlocal
cd /d "%~dp0"
title Shirley's English Games
where node >nul 2>nul
if errorlevel 1 goto offline
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 goto oldnode
echo.
echo  Starting Shirley's English Games...
echo  Keep this window open during the lesson. Close it to stop the games.
echo  Tablets and phones on the same Wi-Fi: open the "network" address shown below.
echo.
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:3000"
node --no-warnings server.js
goto end
:oldnode
echo Node.js is too old (need version 22.13 or newer).
:offline
echo Node.js 22.13+ not found - opening the games in OFFLINE mode (results are not saved).
start "" "%~dp0public\index.html"
timeout /t 6 >nul
:end
