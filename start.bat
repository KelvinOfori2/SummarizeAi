@echo off
title SummarizeAI Launcher
color 0B

echo.
echo  ============================================================
echo   SummarizeAI  -  Local Development Launcher
echo  ============================================================
echo.
echo  Starting backend  (Python / FastAPI)  on http://localhost:8000
echo  Starting frontend (React / Vite)      on http://localhost:5173
echo.
echo  Admin login:
echo    Email   : admin@summarizeai.com
echo    Password: Admin@123456
echo.
echo  Press Ctrl+C in each window to stop the servers.
echo  ============================================================
echo.

:: Start the backend in a new window
start "SummarizeAI  Backend  [localhost:8000]" cmd /k "cd /d %~dp0backend && python app.py"

:: Give the backend 6 seconds to start before the frontend opens
timeout /t 6 /nobreak > nul

:: Start the frontend in a new window
start "SummarizeAI  Frontend [localhost:5173]" cmd /k "cd /d %~dp0frontend && npm run dev"

echo  Both servers are starting in separate windows.
echo.
echo  Open your browser to:  http://localhost:5173
echo.
pause
