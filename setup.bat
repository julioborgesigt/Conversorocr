@echo off
echo ================================================
echo   Conversor OCR - Setup e Instalacao
echo ================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js nao esta instalado!
    echo Por favor, instale o Node.js primeiro: https://nodejs.org/
    pause
    exit /b 1
)

echo OK Node.js encontrado
echo.

echo Instalando dependencias do backend...
cd backend
call npm install

if %ERRORLEVEL% EQU 0 (
    echo OK Dependencias instaladas com sucesso!
) else (
    echo X Erro ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Instalacao Concluida!
echo ================================================
echo.
echo Para usar o sistema:
echo.
echo 1. VERSAO WEB (Mais Simples):
echo    - Abra o arquivo 'index.html' no seu navegador
echo.
echo 2. VERSAO SERVIDOR (Mais Poderosa):
echo    - Execute: cd backend e npm start
echo    - Acesse: http://localhost:3000
echo.
echo ================================================
pause