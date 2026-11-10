@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\instalar-conector.ps1"
if errorlevel 1 (
  echo No se pudo instalar el conector. Revisa el error anterior.
  pause
  exit /b 1
)
echo Instalacion terminada. Carga la carpeta extension en chrome://extensions.
pause
