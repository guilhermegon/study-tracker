@echo off
chcp 65001 >nul
title Study Tracker
color 0A

cd /d "%~dp0"

echo ========================================
echo   Study Tracker
echo ========================================
echo.

:: Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado.
    echo Execute install.bat primeiro.
    pause
    exit /b 1
)

:: Verificar se o build existe
if not exist "client\dist\index.html" (
    echo [!] Interface nao compilada. Compilando...
    echo.
    call npm install --prefix client
    call npm run build --prefix client
    echo.
)

echo Servidor iniciando em http://localhost:3001
echo Feche esta janela para encerrar o servidor.
echo.

:: Abrir navegador apos 3 segundos (sem janela visivel)
echo Set o = CreateObject("WScript.Shell") > "%TEMP%\st_browser.vbs"
echo WScript.Sleep 3000 >> "%TEMP%\st_browser.vbs"
echo o.Run "http://localhost:3001" >> "%TEMP%\st_browser.vbs"
start /b wscript "%TEMP%\st_browser.vbs"

:: Iniciar servidor em foreground (fechar janela = encerrar)
node --experimental-sqlite server\src\index.js

echo.
echo Servidor encerrado.
pause
