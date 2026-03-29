@echo off
chcp 65001 >nul
title Study Tracker - Instalador
color 0A

cd /d "%~dp0"

echo ========================================
echo   Study Tracker - Instalador Windows
echo ========================================
echo.

:: ── 1. Verificar Node.js ─────────────────
echo [1/4] Verificando Node.js...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [!] Node.js nao encontrado.
    echo.
    echo Instale o Node.js v22 ou superior em:
    echo   https://nodejs.org
    echo.
    echo Apos instalar, execute este arquivo novamente.
    start https://nodejs.org
    pause
    exit /b 1
)

for /f %%v in ('node -e "process.stdout.write(String(+process.version.split(\".\")[0].slice(1)))"') do set MAJOR=%%v
if %MAJOR% LSS 22 (
    echo.
    echo [!] Node.js v%MAJOR% encontrado. E necessario v22 ou superior.
    echo Atualize em: https://nodejs.org
    start https://nodejs.org
    pause
    exit /b 1
)

for /f %%v in ('node -v') do set NODEVER=%%v
echo [OK] Node.js %NODEVER%

:: ── 2. Instalar dependencias do servidor ──
echo.
echo [2/4] Instalando dependencias do servidor...
call npm install --prefix server
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias do servidor.
    pause & exit /b 1
)

:: ── 3. Instalar dependencias do cliente ───
echo.
echo [3/4] Instalando dependencias do cliente...
call npm install --prefix client
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias do cliente.
    pause & exit /b 1
)

:: ── 4. Build do cliente ───────────────────
echo.
echo [4/4] Compilando interface...
call npm run build --prefix client
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar a interface.
    pause & exit /b 1
)

:: ── Criar atalho na area de trabalho ──────
echo.
echo Criando atalho na Area de Trabalho...

set "START_BAT=%~dp0start.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\Study Tracker.lnk"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%START_BAT%'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'Iniciar Study Tracker'; $s.IconLocation = 'shell32.dll,13'; $s.Save()"

if exist "%SHORTCUT%" (
    echo [OK] Atalho criado: %USERPROFILE%\Desktop\Study Tracker.lnk
) else (
    echo [!] Nao foi possivel criar o atalho. Use start.bat diretamente.
)

:: ── Concluido ─────────────────────────────
echo.
echo ========================================
echo   Instalacao concluida com sucesso!
echo ========================================
echo.
echo Para iniciar o Study Tracker:
echo   - Clique duas vezes em "Study Tracker" na Area de Trabalho
echo   - Ou execute start.bat nesta pasta
echo.
echo Acesso: http://localhost:3001
echo.

choice /C SN /N /M "Deseja iniciar o Study Tracker agora? [S/N] "
if %errorlevel% equ 1 (
    start "" "%~dp0start.bat"
)
