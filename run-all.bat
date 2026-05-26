@echo off
echo Starting Antbox HR Web Platform...
echo.

echo Starting Frontend on Port 3000...
start "Antbox HR - Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"

echo Starting Backend on Port 3001...
start "Antbox HR - Backend (Port 3001)" cmd /k "cd backend && npm run dev"

echo.
echo Both servers are launching!
echo Frontend will be active at: http://localhost:3000
echo Backend will be active at: http://localhost:3001
echo.
pause
