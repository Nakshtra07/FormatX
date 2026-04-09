# ============================================
# FormatX v1.0 - Development Server Launcher
# ============================================
# Architecture:
#   - Marketing Site (Static) → Port 8000 (Main Landing)
#   - React App (Vite)       → Port 5173 (Web App at /app/)
#   - Backend API (FastAPI)  → Port 8080
#
# The Marketing site links to the React app via /app/ routes.

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   FormatX v1.0 - Starting Servers" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "backend"
$frontendDir = Join-Path $scriptDir "frontend"
$marketingDir = Join-Path $scriptDir "marketing"

# Check if directories exist
if (-not (Test-Path $backendDir)) {
    Write-Host "[ERROR] Backend directory not found: $backendDir" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $frontendDir)) {
    Write-Host "[ERROR] Frontend directory not found: $frontendDir" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $marketingDir)) {
    Write-Host "[ERROR] Marketing directory not found: $marketingDir" -ForegroundColor Red
    exit 1
}

# ============================================
# Start Backend Server (FastAPI + Uvicorn)
# ============================================
Write-Host "[1/3] Starting Backend API (FastAPI)..." -ForegroundColor Yellow

$backendCommand = @"
cd '$backendDir'
Write-Host '========================================' -ForegroundColor Green
Write-Host '   FormatX Backend API' -ForegroundColor Green
Write-Host '   http://localhost:8080' -ForegroundColor Green
Write-Host '   API Docs: http://localhost:8080/docs' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''

# Activate virtual environment if it exists
if (Test-Path '.\venv\Scripts\Activate.ps1') {
    Write-Host 'Activating virtual environment...' -ForegroundColor Cyan
    . .\venv\Scripts\Activate.ps1
} else {
    Write-Host 'No virtual environment found. Using system Python.' -ForegroundColor Yellow
}

# Start the server
python -m uvicorn main:app --reload --port 8080
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
Write-Host "   Backend API at: http://localhost:8080" -ForegroundColor Green
Write-Host "   API Docs at: http://localhost:8080/docs" -ForegroundColor Green
Write-Host ""

# Wait for backend to initialize
Start-Sleep -Seconds 2

# ============================================
# Start React App (Vite) - Standalone on 5173
# ============================================
Write-Host "[2/3] Starting React App (Vite)..." -ForegroundColor Yellow

$frontendCommand = @"
cd '$frontendDir'
Write-Host '========================================' -ForegroundColor Magenta
Write-Host '   FormatX React App (Standalone)' -ForegroundColor Magenta
Write-Host '   http://localhost:5173' -ForegroundColor Magenta
Write-Host '========================================' -ForegroundColor Magenta
Write-Host ''

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path '.\node_modules')) {
    Write-Host 'Installing dependencies...' -ForegroundColor Cyan
    npm install
}

# Start the dev server on port 5173
npm run dev -- --port 5173
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand
Write-Host "   React App at: http://localhost:5173" -ForegroundColor Green
Write-Host ""

# Wait a moment
Start-Sleep -Seconds 2

# ============================================
# Start Marketing Site (Static Server on 8000)
# ============================================
Write-Host "[3/3] Starting Marketing Site (Static)..." -ForegroundColor Yellow

$marketingCommand = @"
cd '$marketingDir'
Write-Host '========================================' -ForegroundColor Blue
Write-Host '   FormatX Marketing Site' -ForegroundColor Blue
Write-Host '   http://localhost:8000' -ForegroundColor Blue
Write-Host '========================================' -ForegroundColor Blue
Write-Host ''

# Use npx to serve static files (http-server or serve)
# Check if http-server is available, otherwise use Python
`$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if (`$pythonCheck) {
    Write-Host 'Starting static server with Python...' -ForegroundColor Cyan
    python -m http.server 8000
} else {
    Write-Host 'Python not found. Trying npx serve...' -ForegroundColor Yellow
    npx -y serve -l 8000
}
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $marketingCommand
Write-Host "   Marketing Site at: http://localhost:8000" -ForegroundColor Green
Write-Host ""

# ============================================
# Summary
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   All Servers Started!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   MAIN (Marketing):  http://localhost:8000" -ForegroundColor White
Write-Host "   React App:         http://localhost:5173" -ForegroundColor White
Write-Host "   Backend API:       http://localhost:8080" -ForegroundColor White
Write-Host "   API Docs:          http://localhost:8080/docs" -ForegroundColor White
Write-Host ""
Write-Host "   NOTE: Marketing site links to /app/ will need" -ForegroundColor Gray
Write-Host "         to be updated to http://localhost:5173" -ForegroundColor Gray
Write-Host "         for local development." -ForegroundColor Gray
Write-Host ""
Write-Host "   Press Ctrl+C in each terminal to stop." -ForegroundColor Gray
Write-Host ""
