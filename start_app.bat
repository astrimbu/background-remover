@echo off
start "Backend Server" cmd /k "cd path\to\app && .\venv\Scripts\activate && python app.py"
start "Frontend Server" cmd /k "cd path\to\app\frontend && npm run dev"
start "ComfyUI Server" cmd /k "cd path\to\comfyui && python main.py --enable-cors-header"

REM Wait for servers to initialize before opening browser
timeout /t 15 >nul
start "" "http://localhost:3000"
