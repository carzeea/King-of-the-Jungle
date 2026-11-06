@echo off
setlocal
cd /d "%~dp0game"
echo Starting King of the Jungle V2 local server...
echo Keep this window open while playing.
echo Then open http://localhost:8000 in Chrome or Edge.
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python -m http.server 8000
  ) else (
    echo Python was not found. Install Python 3 or use the alternate Node.js command in README.md.
    pause
  )
)
endlocal
