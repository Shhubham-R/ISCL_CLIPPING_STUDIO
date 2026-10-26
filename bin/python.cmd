@echo off
setlocal enabledelayedexpansion
if "%~1"=="-m" (
    if "%~2"=="yt_dlp" (
        set "RAW=%*"
        set "REST=!RAW:*yt_dlp =!"
        "%~dp0yt-dlp.exe" !REST!
        exit /b !ERRORLEVEL!
    )
)
where python >nul 2>nul
if !ERRORLEVEL! equ 0 (
    python %*
    exit /b !ERRORLEVEL!
)
echo [Python Fallback] Command not handled: %*
exit /b 1
