param([string]$Gateway = 'http://localhost:18080')

$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $login = Invoke-RestMethod "$Gateway/auth/login" -Method POST -ContentType 'application/json' -Body '{"email":"admin@ecoquest.local","password":"EcoQuest@123"}'
    $headers = @{ Authorization = "Bearer $($login.accessToken)" }
    $paths = @('/catalog/missions', '/catalog/badges', '/catalog/stations', '/catalog/stations/STATION-A1/qr', '/auth/users',
        '/rewards/wallets/SV001', '/rewards/wallets/SV001/transactions',
        '/leaderboards/weekly?limit=100', '/leaderboards/monthly?limit=100',
        '/recognitions/rewards?studentId=SV001', '/reports/analytics/students/SV001')
    function Snapshot([string]$Path) {
        $value = Invoke-RestMethod "$Gateway$Path" -Headers $headers -TimeoutSec 15
        # SQL row order and JSON object property order are not API contracts.
        return (@($value | ForEach-Object {
            $_ | Select-Object -Property ($_.PSObject.Properties.Name | Sort-Object) | ConvertTo-Json -Depth 20 -Compress
        } | Sort-Object) -join "`n")
    }
    $before = @{}
    foreach ($path in $paths) { $before[$path] = Snapshot $path }
    docker compose restart identity-access-service green-catalog-service reward-ledger-service leaderboard-service recognition-service report-service
    if ($LASTEXITCODE -ne 0) { throw 'Service restart failed.' }
    $deadline = (Get-Date).AddSeconds(240)
    do {
        $ready = $true
        foreach ($path in $paths) {
            try { $null = Snapshot $path } catch { $ready = $false; break }
        }
        if (-not $ready) { Start-Sleep -Seconds 3 }
    } while (-not $ready -and (Get-Date) -lt $deadline)
    if (-not $ready) { throw 'Services did not recover after restart.' }
    foreach ($path in $paths) {
        if ((Snapshot $path) -cne $before[$path]) { throw "Data changed during restart: $path" }
        Write-Host "[EcoQuest Restart] Preserved: $path"
    }
    Write-Host '[EcoQuest Restart] PASS: all checked state was preserved.'
} finally { Pop-Location }
