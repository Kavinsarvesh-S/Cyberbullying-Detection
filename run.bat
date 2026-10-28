@echo off
title Cyberbullying Detection System
cd /d "%~dp0"

echo ========================================================
echo       Cyberbullying Detection System
echo ========================================================
echo.

REM Determine which Python executable to use
if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
    echo [INFO] Using virtual environment Python.
) else (
    set "PYTHON_EXE=python"
    echo [INFO] Virtual environment not found, using system Python.
)

REM Test if Python is callable
%PYTHON_EXE% --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Python was not found on your system.
    echo Please make sure Python is installed and added to PATH.
    echo.
    pause
    exit /b 1
)

REM Open the web browser
echo [INFO] Opening web app in your default browser...
start http://127.0.0.1:5000

REM Start Flask application
echo [INFO] Starting Flask web application...
echo [INFO] Server URL: http://127.0.0.1:5000
echo.
echo ========================================================
echo Application is running.
echo To stop the server, press Ctrl+C or close this window.
echo ========================================================
echo.

%PYTHON_EXE% app.py

echo.
echo Application stopped.
pause
