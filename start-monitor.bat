@echo off
echo Starte Tunnel Monitor...
:: Prüfe Admin-Rechte und fordere sie an
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0monitor-tunnel.ps1""' -Verb RunAs"
