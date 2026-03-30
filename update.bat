@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Study Tracker - Atualizando...
color 0E

echo ========================================
echo   Study Tracker - Atualizacao
echo ========================================
echo.

echo Aguardando servidor encerrar...
timeout /t 4 /nobreak >nul

:: Backup do banco de dados
echo Fazendo backup do banco de dados...
set TIMESTAMP=%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP=%TEMP%\study-tracker-backup-%TIMESTAMP%.db
if exist "server\data\study.db" (
  copy "server\data\study.db" "%BACKUP%" >nul
  echo Backup salvo em: %BACKUP%
) else (
  echo [AVISO] Banco de dados nao encontrado, ignorando backup.
)

:: Download da nova versao
echo.
echo Baixando versao %UPDATE_VERSION%...
set ZIPFILE=%TEMP%\study-tracker-update.zip
powershell -Command "Invoke-WebRequest -Uri '%UPDATE_URL%' -OutFile '%ZIPFILE%' -UseBasicParsing"
if errorlevel 1 (
  echo [ERRO] Falha ao baixar atualizacao. Verifique a conexao com a internet.
  pause
  exit /b 1
)

:: Extrair zip
echo Extraindo arquivos...
set TMPDIR=%TEMP%\study-tracker-update
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"
powershell -Command "Expand-Archive -Path '%ZIPFILE%' -DestinationPath '%TMPDIR%' -Force"
if errorlevel 1 (
  echo [ERRO] Falha ao extrair arquivos.
  pause
  exit /b 1
)

:: Encontrar pasta extraida (GitHub cria subpasta com nome do repo)
set SRCDIR=
for /d %%d in ("%TMPDIR%\*") do set SRCDIR=%%d
if not defined SRCDIR (
  echo [ERRO] Pasta extraida nao encontrada.
  pause
  exit /b 1
)

:: Copiar arquivos excluindo server\data
echo Copiando arquivos (exceto dados)...
robocopy "%SRCDIR%" "%~dp0" /E /XD "%SRCDIR%\server\data" /NFL /NDL /NJH /NJS /NC /NS >nul

:: Restaurar banco de dados
echo Restaurando banco de dados...
if exist "%BACKUP%" (
  if not exist "server\data" mkdir "server\data"
  copy /y "%BACKUP%" "server\data\study.db" >nul
  echo Banco de dados restaurado.
)

:: Instalar dependencias e compilar
echo.
echo Instalando dependencias...
call npm install >nul 2>&1
call npm install --prefix server >nul 2>&1
call npm install --prefix client >nul 2>&1
echo Compilando interface...
call npm run build --prefix client >nul 2>&1

:: Reiniciar servidor
echo.
echo Reiniciando servidor...
start "Study Tracker" node --experimental-sqlite server\src\index.js

echo.
echo ========================================
echo   Atualizacao concluida!
echo   Recarregue o navegador em instantes.
echo ========================================
echo.
timeout /t 5 /nobreak >nul
