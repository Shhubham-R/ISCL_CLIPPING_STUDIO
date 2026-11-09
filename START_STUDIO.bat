@echo off
setlocal enabledelayedexpansion
title ISCL CLIP STUDIO - Professional Live Cricket Production Suite

echo =========================================================================
echo       ISCL CLIP STUDIO - LIVE CRICKET VIDEO ^& SOCIAL PRODUCTION
echo                   Indian Softball Cricket League (ISCL)
echo =========================================================================
echo.

cd /d "%~dp0"

:: 1. Add bundled portable binaries (Node.js, FFmpeg, yt-dlp) to local PATH
if exist "%~dp0bin" (
    set "PATH=%~dp0bin;%PATH%"
)

:: 2. Find Node executable
set "NODE_CMD="
if exist "%~dp0bin\node.exe" (
    set "NODE_CMD=%~dp0bin\node.exe"
) else (
    where node >nul 2>nul
    if !ERRORLEVEL! equ 0 set "NODE_CMD=node"
)

if "%NODE_CMD%"=="" (
    echo [ERROR] Portable Node.js runtime not found in bin\node.exe or system PATH.
    pause
    exit /b 1
)

:: 3. Find Electron executable
set "ELECTRON_CMD="
if exist "%~dp0node_modules\electron\dist\electron.exe" (
    set "ELECTRON_CMD=%~dp0node_modules\electron\dist\electron.exe"
) else (
    where electron >nul 2>nul
    if !ERRORLEVEL! equ 0 set "ELECTRON_CMD=electron"
)

:: 4. Verify client production build
if not exist "%~dp0client\dist\index.html" (
    echo [WARNING] client\dist\index.html not found!
    echo Please make sure the client bundle is in client\dist\
    pause
    exit /b 1
)

echo [READY] Launching ISCL Clip Studio Native Desktop Suite...
echo.

if not "%ELECTRON_CMD%"=="" (
    "%ELECTRON_CMD%" "%~dp0electron\main.cjs"
) else (
    echo [INFO] Running in Web App mode...
    start "" "%NODE_CMD%" "%~dp0server\index.js"
    timeout /t 2 /nobreak >nul
    start http://localhost:5050
)

echo.
echo Application session finished.
exit /b 0
