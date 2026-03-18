@echo off
echo ========================================
echo    Building Alvic Home
echo ========================================

echo.
echo [1/4] Building frontend...
cd /d "%~dp0"
call npm run build
if errorlevel 1 goto error

echo.
echo [2/4] Copying frontend into server folder...
if not exist "server\frontend-dist" mkdir "server\frontend-dist"
xcopy /E /I /Y "dist\*" "server\frontend-dist\"
if errorlevel 1 goto error

echo.
echo [3/4] Building backend...
cd server
call npm run build
if errorlevel 1 goto error
cd ..

echo.
echo [4/4] Building Electron installer...
cd electron
call npm install
call npm run build:win
if errorlevel 1 goto error
cd ..

echo.
echo ========================================
echo    Done! Installer is in electron/dist/
echo ========================================
goto end

:error
echo.
echo BUILD FAILED — check errors above
:end
pause
```

---

## Final folder structure after build
```
alvic-home/
├── electron/
│   ├── main.js
│   ├── loading.html
│   ├── error.html
│   ├── icon.png
│   ├── icon.ico
│   ├── package.json
│   └── dist/
│       └── AlvicHome Setup 1.0.0.exe  ← give this to customer
├── server/
│   ├── src/
│   ├── dist/                          ← compiled backend
│   ├── frontend-dist/                 ← built frontend copied here
│   └── .env
└── src/                               ← your React source