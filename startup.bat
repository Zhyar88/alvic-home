@echo off
start "Alvic Backend" cmd /k "cd /d C:\alvic-home-main\server && npm run dev"
timeout /t 3
start "Alvic Frontend" cmd /k "cd /d C:\alvic-home-main && npm run dev"