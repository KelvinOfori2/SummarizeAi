# SummarizeAI - PowerShell launcher
# Usage: Right-click -> Run with PowerShell
#        OR in PowerShell:  .\start.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "   SummarizeAI  -  Local Development Launcher" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  -> http://localhost:8000/api/docs" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "  Admin: admin@summarizeai.com  /  Admin@123456" -ForegroundColor Yellow
Write-Host ""

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; python app.py" -WindowStyle Normal

# Wait for backend to start
Write-Host "  Waiting 6s for backend to start..." -ForegroundColor Gray
Start-Sleep -Seconds 6

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "  Both servers started. Open http://localhost:5173 in your browser." -ForegroundColor Cyan
Write-Host ""
Read-Host "  Press Enter to exit this launcher"
