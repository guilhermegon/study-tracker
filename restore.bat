@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Study Tracker - Restaurando backup...

echo Aguardando servidor encerrar...
timeout /t 4 /nobreak >nul

echo Restaurando banco de dados...
if not exist "server\data" mkdir "server\data"
copy /y "%RESTORE_FILE%" "server\data\study.db" >nul
if errorlevel 1 (
  echo [ERRO] Falha ao restaurar o banco de dados.
  pause
  exit /b 1
)
del /q "%RESTORE_FILE%" >nul 2>&1

echo Reiniciando servidor...
start "Study Tracker" node --experimental-sqlite server\src\index.js

echo Backup restaurado com sucesso!
timeout /t 3 /nobreak >nul
