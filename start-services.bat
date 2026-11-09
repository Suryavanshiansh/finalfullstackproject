@echo off
echo Starting Faculty Performance Intelligence System (FPIS)...
start "FPIS Backend API" cmd /k "cd server && node dist/index.js"
start "FPIS Frontend Client" cmd /k "cd client && npx vite --port 5173 --host 0.0.0.0"
echo FPIS is starting up!
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:5000
