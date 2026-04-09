@echo off
echo Starting FormatX/Amarika Services...
echo.

echo Starting Backend (Port 8000)...
start "Backend API" cmd /k "cd /d d:\College\Amarika\Web-app\backend && .\venv\Scripts\activate.bat && python main.py"

echo Starting Frontend (Port 5173)...
start "Frontend Web App" cmd /k "cd /d d:\College\Amarika\Web-app\frontend && npm run dev -- --port 5173"

echo Starting Marketing Site (Port 5500)...
start "Marketing Site" cmd /k "cd /d d:\College\Amarika\Web-app\marketing && python -m http.server 5500"

echo All servers are starting in separate command prompt windows!
echo Keep those separate windows open. You can close this one.
pause
