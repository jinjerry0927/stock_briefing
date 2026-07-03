@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo Stock Briefing Web Launcher
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not available in PATH.
  echo Install Node.js first, then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not available in PATH.
  echo Reinstall Node.js or check your PATH setting.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies. This can take a few minutes on first run.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Stock Briefing dev server...
echo Browser will open at http://localhost:3000
echo.

start "Stock Briefing Dev Server" cmd /k "cd /d ""%~dp0"" && npm run dev"

timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

endlocal
