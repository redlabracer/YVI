<#
.SYNOPSIS
    Überwacht den Cloudflare Tunnel Status und startet den Dienst bei Fehlern neu.
    Muss als Administrator ausgeführt werden.

.DESCRIPTION
    Dieses Script prüft alle 60 Sekunden, ob:
    1. Der 'cloudflared' Dienst läuft.
    2. Die URL 'https://app.werkstatt-terhaag.uk' erreichbar ist (Kein Cloudflare Fehler 1033/530).
    
    Falls ein Fehler erkannt wird, wird der Dienst automatisch neu gestartet.
#>

$ServiceName = "cloudflared"
$TargetUrl = "https://app.werkstatt-terhaag.uk"
$LocalPort = 3000
$CheckIntervalSeconds = 60
$UpdateLockFile = Join-Path $PSScriptRoot "update.lock"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Cloudflare Tunnel Wächter (Monitor)" -ForegroundColor Cyan
Write-Host "==================================================="
Write-Host "Dienst: $ServiceName"
Write-Host "URL:    $TargetUrl"
Write-Host "Lokal:  Port $LocalPort (Prüfung auf Server-Status)"
Write-Host "Intervall: $CheckIntervalSeconds Sekunden"
Write-Host "Lockfile: $UpdateLockFile"
Write-Host ""

# 0. Initialer Start-Delay (Warte auf Systemstart)
Write-Host "Warte 5 Minuten (Initialer Start-Delay)..." -ForegroundColor Yellow
Start-Sleep -Seconds 300

# Prüfe Admin-Rechte
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "ACHTUNG: Dieses Script benötigt Administrator-Rechte, um den Dienst neu zu starten."
    Write-Warning "Bitte Rechtsklick -> 'Mit PowerShell als Administrator ausführen'."
    # Wir machen weiter, aber Restart-Service wird wahrscheinlich fehlschlagen
}

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"

    # 0. Check Update Lock
    if (Test-Path $UpdateLockFile) {
        Write-Host "[$timestamp] UPDATE LÄUFT: 'update.lock' gefunden. Pausiere Monitoring..." -ForegroundColor Cyan
        Start-Sleep -Seconds 30
        continue
    }

    # 0.5. Check Local Server Status (Ist die App überhaupt an?)
    # Wenn update.bat geschlossen wurde, ist Port 3000 zu. Monitor soll sich dann beenden.
    $localConnection = Test-NetConnection -ComputerName localhost -Port $LocalPort -InformationLevel Quiet
    if (-not $localConnection) {
        Write-Host "[$timestamp] SHUTDOWN: Lokaler Server (Port $LocalPort) ist NICHT erreichbar." -ForegroundColor Red
        Write-Host "   -> Es scheint, als ob die YVI App beendet wurde."
        Write-Host "   -> Monitor beendet sich automatisch."
        Start-Sleep -Seconds 3
        exit
    }

    $restartNeeded = $false

    # 1. Dienst-Status prüfen
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($null -eq $service) {
        Write-Host "[$timestamp] WARNUNG: Dienst '$ServiceName' nicht gefunden." -ForegroundColor Red
    }
    elseif ($service.Status -ne 'Running') {
        Write-Host "[$timestamp] FEHLER: Dienst '$ServiceName' läuft nicht (Status: $($service.Status))." -ForegroundColor Red
        $restartNeeded = $true
    }
    else {
        # 2. URL Erreichbarkeit prüfen (End-to-End Test)
        try {
            # Timeout kurz halten (10s)
            $response = Invoke-WebRequest -Uri $TargetUrl -Method Head -TimeoutSec 10 -ErrorAction Stop
            
            # Alles OK (Status 200-299)
            Write-Host "[$timestamp] OK: Tunnel aktiv (HTTP $($response.StatusCode))." -ForegroundColor Green
        }
        catch {
            # HTTP Fehler analysieren
            if ($_.Exception.Response -ne $null) {
                $statusCode = $_.Exception.Response.StatusCode.value__
                
                # Cloudflare Error 1033 ist meist HTTP 530
                if ($statusCode -eq 530) {
                     Write-Host "[$timestamp] FEHLER: Cloudflare Tunnel Fehler erkannt (HTTP 530 / Error 1033)." -ForegroundColor Red
                     $restartNeeded = $true
                }
                elseif ($statusCode -eq 502) {
                     Write-Host "[$timestamp] FEHLER: Bad Gateway (HTTP 502). App läuft evtl. nicht, aber Tunnel könnte OK sein." -ForegroundColor Yellow
                     # Optional: Auch hier neustarten? Eher App-Problem.
                     # Wir starten den Tunnel trotzdem neu, schadet meist nicht.
                     $restartNeeded = $true
                }
                else {
                     # Andere Fehler (404, 500) -> Tunnel steht, Server liefert Fehler.
                     Write-Host "[$timestamp] INFO: URL liefert Status $statusCode (Tunnel aktiv)." -ForegroundColor Gray
                }
            }
            else {
                # Netzwerk/Timeout Fehler
                Write-Host "[$timestamp] WARNUNG: Verbindungsfehler: $($_.Exception.Message)" -ForegroundColor Yellow
                
                # Prüfen, ob wir überhaupt Internet haben (Ping Google DNS)
                if (Test-Connection "8.8.8.8" -Count 1 -Quiet) {
                    Write-Host "   -> Internet ist verfügbar. Tunnel scheint down zu sein." -ForegroundColor Red
                    $restartNeeded = $true
                } else {
                    Write-Host "   -> Kein Internet. Neustart wird wahrscheinlich nicht helfen." -ForegroundColor Gray
                }
            }
        }
    }

    # Neustart durchführen falls nötig
    if ($restartNeeded) {
        Write-Host "[$timestamp] ACTION: Starte '$ServiceName' neu..." -ForegroundColor Login
        try {
            Restart-Service -Name $ServiceName -Force -ErrorAction Stop
            Write-Host "   -> Neustart erfolgreich." -ForegroundColor Green
            # Wartezeit für Reconnect
            Write-Host "   -> Warte 15 Sekunden auf Reconnect..."
            Start-Sleep -Seconds 15
        }
        catch {
            Write-Error "   -> Neustart fehlgeschlagen: $($_.Exception.Message)"
        }
    }

    Start-Sleep -Seconds $CheckIntervalSeconds
}
