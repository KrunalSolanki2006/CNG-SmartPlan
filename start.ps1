# CNG SmartPlan - One-Click PowerShell Launcher
# Starts FastAPI backend (port 8000) and React frontend (port 5173) with process lifecycle management.

$ErrorActionPreference = "Stop"

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "             CNG SMARTPLAN - NETWORK EXPANSION DECISION SUPPORT" -ForegroundColor Green
Write-Host "             Gujarat Gas Co. Ltd. - Hackathon Final Prototype" -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Dependency checks
Write-Host "[1/4] Checking system prerequisites..." -ForegroundColor Yellow
try {
    $pythonVer = python --version 2>&1
    Write-Host "  - Python detected: $pythonVer" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

try {
    $nodeVer = node --version 2>&1
    Write-Host "  - Node.js detected: $nodeVer" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

$rootPath = $PSScriptRoot
if (-not $rootPath) { $rootPath = Get-Location }

# 2. Launch Backend Process
Write-Host "`n[2/4] Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "python" `
    -ArgumentList "-m uvicorn main:app --app-dir server --host 127.0.0.1 --port 8000 --reload" `
    -WorkingDirectory $rootPath `
    -PassThru

# 3. Launch Frontend Process
Write-Host "[3/4] Starting React/Vite frontend on http://localhost:5173 ..." -ForegroundColor Yellow
$clientPath = Join-Path $rootPath "client"
$frontendProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev" `
    -WorkingDirectory $clientPath `
    -PassThru

# 4. Banner & URL launcher
Write-Host "`n[4/4] Opening default web browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "`n===============================================================================" -ForegroundColor Green
Write-Host "                      CNG SMARTPLAN SERVICES ACTIVE" -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "  * React Application:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "  * FastAPI Swagger Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  * Backend Health Check: http://localhost:8000/api/v1/health" -ForegroundColor Cyan
Write-Host "  * Maps Candidate Status: http://localhost:8000/api/v1/maps/status" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "`n[INFO] Both services are running in background processes." -ForegroundColor White
Write-Host "Press Ctrl+C or enter 'stop' to terminate both services and exit cleanly.`n" -ForegroundColor Yellow

try {
    while ($true) {
        $input = Read-Host "Type 'stop' or 'q' to shut down all services"
        if ($input -eq 'stop' -or $input -eq 'q' -or $input -eq 'exit') {
            break
        }
    }
} finally {
    Write-Host "`nStopping CNG SmartPlan services..." -ForegroundColor Yellow
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  - Backend stopped (PID: $($backendProcess.Id))" -ForegroundColor Gray
    }
    if ($frontendProcess -and -not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  - Frontend stopped (PID: $($frontendProcess.Id))" -ForegroundColor Gray
    }
    Write-Host "Shutdown complete." -ForegroundColor Green
}

