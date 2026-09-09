# Run this file from an elevated PowerShell window.
$ErrorActionPreference = "Stop"

Write-Host "Checking Windows component store..." -ForegroundColor Cyan
DISM /Online /Cleanup-Image /RestoreHealth

Write-Host "Checking and repairing protected Windows files..." -ForegroundColor Cyan
sfc /scannow

Write-Host "Re-registering Remote Desktop ActiveX client..." -ForegroundColor Cyan
regsvr32.exe /s "$env:windir\System32\mstscax.dll"
if (Test-Path "$env:windir\SysWOW64\mstscax.dll") {
    regsvr32.exe /s "$env:windir\SysWOW64\mstscax.dll"
}

Write-Host "Updating WSL, used by Docker Desktop..." -ForegroundColor Cyan
wsl --update

Write-Host "Restarting WSL so Docker Desktop picks up the repaired state..." -ForegroundColor Cyan
wsl --shutdown

Write-Host "Done. Restart Docker Desktop, then run: docker compose up --build" -ForegroundColor Green
