$ErrorActionPreference = 'Stop'
$prefix = 'ecoquest:test:dedup:' + [guid]::NewGuid().ToString('N')
$keys = @("${prefix}:seen", "${prefix}:weekly", "${prefix}:monthly")
$lua = Get-Content (Join-Path $PSScriptRoot '../services/leaderboard-service/src/main/resources/apply-points.lua') -Raw
function Apply-Grant([string]$Id, [string]$Points) {
    $result = $lua | docker compose exec -T redis redis-cli -x EVAL 'return loadstring(ARGV[4])()' 3 @keys $Id $Points 'SV_E2E_DEDUP'
    if ($LASTEXITCODE -ne 0 -or $result -notmatch '^[01]$') { throw "Redis script failed: $result" }
    return [int]$result
}
try {
    if ((Apply-Grant 'grant-1' '10') -ne 1) { throw 'First grant not applied' }
    if ((Apply-Grant 'grant-1' '10') -ne 0) { throw 'Duplicate grant was applied' }
    if ((Apply-Grant 'grant-2' '5') -ne 1) { throw 'Distinct grant not applied' }
    foreach ($key in $keys[1..2]) {
        $score = docker compose exec -T redis redis-cli ZSCORE $key SV_E2E_DEDUP
        if ($LASTEXITCODE -ne 0 -or $score -ne '15') { throw "Unexpected score: $score" }
    }
    docker compose exec -T redis redis-cli DEL $keys[2] | Out-Null
    docker compose exec -T redis redis-cli SET $keys[2] invalid-type | Out-Null
    $rejected = $false
    try { Apply-Grant 'grant-3' '20' | Out-Null } catch { $rejected = $_.Exception.Message -match 'Unexpected leaderboard key type' }
    if (-not $rejected) { throw 'Wrong-type key was not rejected explicitly' }
    $score = docker compose exec -T redis redis-cli ZSCORE $keys[1] SV_E2E_DEDUP
    $seen = docker compose exec -T redis redis-cli SISMEMBER $keys[0] grant-3
    if ($score -ne '15' -or $seen -ne '0') { throw 'Wrong-type failure partially applied a grant' }
    Write-Host 'Leaderboard Redis deduplication PASSED (weekly/monthly=15; wrong-type failure leaves score and grant marker unchanged).'
} finally {
    docker compose exec -T redis redis-cli DEL @keys | Out-Null
}
