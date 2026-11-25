@echo off
setlocal enabledelayedexpansion

title CNG SmartPlan - One-Click Launcher

echo ===============================================================================
echo                CNG SMARTPLAN - NETWORK EXPANSION DECISION SUPPORT
echo                Gujarat Gas Co. Ltd. - Hackathon Final Prototype
echo ===============================================================================
echo.

:: 1. Verify Prerequisites
echo [1/3] Verifying runtime dependencies...

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in system PATH.
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in system PATH.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo   - Detected: %PY_VER%
echo   - Detected: Node.js %NODE_VER%
echo.

:: 2. Launch FastAPI Backend
echo [2/3] Launching FastAPI backend server on http://localhost:8000 ...
start "CNG SmartPlan - Backend (Port 8000)" cmd /k "cd /d %~dp0 && python -m uvicorn main:app --app-dir server --host 127.0.0.1 --port 8000 --reload"

:: 3. Launch React/Vite Frontend
echo [3/3] Launching React/Vite frontend on http://localhost:5173 ...
start "CNG SmartPlan - Frontend (Port 5173)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ===============================================================================
echo                      CNG SMARTPLAN SERVICES RUNNING
echo ===============================================================================
echo   * Web Application:     http://localhost:5173
echo   * API Interactive Docs: http://localhost:8000/docs
echo   * API Health Check:     http://localhost:8000/api/v1/health
echo   * Maps Candidate Status: http://localhost:8000/api/v1/maps/status
echo ===============================================================================
echo.
echo Waiting 3 seconds before opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo Press any key in this window to exit this launcher (services will keep running in their own windows).
pause >nul

