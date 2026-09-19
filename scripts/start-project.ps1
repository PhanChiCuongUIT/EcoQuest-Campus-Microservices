param(
    [switch]$Build,
    [switch]$RefreshData,
    [switch]$LocalMail,
    [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = 'Stop'
$previousMail = $env:IDENTITY_MAIL_ENABLED
$previousMailHealth = $env:IDENTITY_MAIL_HEALTH_ENABLED
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Open Docker Desktop, wait for Engine running, then run this script again.' }
    if (-not (Test-Path .env)) { Copy-Item .env.example .env }
    if ($LocalMail) {
        $env:IDENTITY_MAIL_ENABLED = 'false'
        $env:IDENTITY_MAIL_HEALTH_ENABLED = 'false'
    }
    $configuration = docker compose config --format json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Invalid Docker Compose configuration.' }
    $arguments = @('compose', 'up', '-d')
    if ($Build) { $arguments += '--build' }
    & docker @arguments
    if ($LASTEXITCODE -ne 0) { throw 'Compose startup failed. Check the error above, especially port conflicts.' }

    $serviceNames = @('api-gateway', 'identity-access-service', 'green-catalog-service',
        'eco-action-service', 'verification-policy-grpc-service', 'reward-ledger-service',
        'leaderboard-service', 'recognition-service', 'report-service', 'notification-service')
    $checks = @{}
    foreach ($name in $serviceNames) {
        $service = $configuration.services.$name
        $port = @($service.ports | Where-Object { $_.target -ne 9090 })[0].published
        $checks[$name] = "http://localhost:$port/actuator/health"
    }
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ($checks.Count -gt 0 -and (Get-Date) -lt $deadline) {
        foreach ($name in @($checks.Keys)) {
            try {
                $health = Invoke-RestMethod $checks[$name] -TimeoutSec 5
                if ($health.status -eq 'UP') {
                    Write-Host "[EcoQuest] $name UP"
                    $checks.Remove($name)
                }
            } catch { }
        }
        if ($checks.Count -gt 0) {
            Write-Host "[EcoQuest] Waiting: $($checks.Keys -join ', ')"
            Start-Sleep -Seconds 3
        }
    }
    if ($checks.Count -gt 0) {
        throw "Services not ready: $($checks.Keys -join ', '). Run docker compose logs --tail=100 <service>."
    }
    $gatewayPort = $configuration.services.'api-gateway'.ports[0].published
    $webPort = $configuration.services.'ecoquest-web'.ports[0].published
    $web = Invoke-WebRequest "http://localhost:$webPort" -UseBasicParsing -TimeoutSec 15
    if ($web.StatusCode -ne 200) { throw 'Frontend is not ready.' }
    if ($RefreshData) { & "$PSScriptRoot/refresh-demo-data.ps1" -Gateway "http://localhost:$gatewayPort" }
    Write-Host "[EcoQuest] Web: http://localhost:$webPort"
    Write-Host "[EcoQuest] Gateway health: http://localhost:$gatewayPort/actuator/health"
    foreach ($name in @('rabbitmq', 'minio')) {
        $target = if ($name -eq 'rabbitmq') { 15672 } else { 9001 }
        $port = ($configuration.services.$name.ports | Where-Object { $_.target -eq $target }).published
        Write-Host "[EcoQuest] $name console: http://localhost:$port"
    }
} finally {
    $env:IDENTITY_MAIL_ENABLED = $previousMail
    $env:IDENTITY_MAIL_HEALTH_ENABLED = $previousMailHealth
    Pop-Location
}
