$ErrorActionPreference = 'Stop'
$fixture = @{}
$fixture.now = [DateTime]::SpecifyKind([DateTime]'2026-10-28T12:00:00', [DateTimeKind]::Utc)
$fixture.missions = @{}
$fixture.actions = [Collections.Generic.List[object]]::new()
$fixture.grants = [Collections.Generic.List[object]]::new()
$fixture.uploads = 0
$fixture.scans = 0

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

# Run the real seed script with an isolated clock and HTTP boundary. No containers
# or application records are modified; runtime smoke tests cover the real APIs.
function Get-Date { return $fixture.now }
function Invoke-RestMethod {
    param($Method, $Uri, $Headers, $TimeoutSec, $ContentType, $Body)
    $path = ([Uri]$Uri).PathAndQuery
    $payload = if ($null -ne $Body) { [Text.Encoding]::UTF8.GetString($Body) | ConvertFrom-Json } else { $null }
    if ($path -eq '/auth/login') { return @{ accessToken = 'mock-token' } }
    if ($path -eq '/catalog/missions' -and $Method -eq 'GET') { return @($fixture.missions.Values) }
    if ($path -eq '/catalog/missions' -and $Method -eq 'POST') {
        Assert-True (-not $fixture.missions.ContainsKey($payload.id)) 'Duplicate mission creation'
        $payload | Add-Member status 'PENDING'
        $fixture.missions[$payload.id] = $payload
        return $payload
    }
    if ($path -match '^/catalog/missions/([^/]+)/status\?status=ACTIVE$') {
        $fixture.missions[$Matches[1]].status = 'ACTIVE'
        return $fixture.missions[$Matches[1]]
    }
    if ($path -match '^/actions/user/(.+)$') {
        $id = $Matches[1]
        return @($fixture.actions | Where-Object { $_.studentId -eq $id })
    }
    if ($path -eq '/actions/evidence') {
        $fixture.uploads++
        return @{ evidenceUrl = '/actions/evidence/mock.png' }
    }
    if ($path -match '^/catalog/stations/(.+)/qr$') { return @{ qrToken = $Matches[1] } }
    if ($path -eq '/catalog/stations/scan') {
        $fixture.scans++
        return @{ scanReceipt = "receipt-$($fixture.scans)" }
    }
    if ($path -eq '/actions/submit') {
        Assert-True ($payload.missionId -like "MISSION-DEMO-$($fixture.now.ToString('yyyy-MM'))-*") 'Submission uses a future or stale campaign'
        if ($payload.stationId) { Assert-True ($payload.stationScanReceipt -like 'receipt-*') 'Missing QR receipt' }
        $payload | Add-Member id "action-$($fixture.actions.Count)"
        $payload | Add-Member status 'PENDING_REVIEW'
        $payload | Add-Member submittedAt $fixture.now.ToString('o')
        $fixture.actions.Add($payload)
        return $payload
    }
    if ($path -match '^/actions/(.+)/approve$') {
        $id = $Matches[1]
        $action = $fixture.actions | Where-Object { $_.id -eq $id }
        Assert-True ($action.status -eq 'PENDING_REVIEW') 'Duplicate approval'
        $action.status = 'ACCEPTED'
        $fixture.grants.Add(@{ studentId = $action.studentId; sourceActionId = $action.id })
        return $action
    }
    if ($path -match '^/rewards/wallets/([^/]+)/transactions$') {
        $id = $Matches[1]
        return @($fixture.grants | Where-Object { $_.studentId -eq $id })
    }
    throw "Unexpected API call: $Method $path"
}

$seed = Join-Path $PSScriptRoot 'refresh-demo-data.ps1'
& $seed -Gateway 'http://seed.invalid' -PrepareNextMonth
Assert-True ($fixture.missions.Count -eq 6) 'Expected October and November campaigns'
Assert-True ($fixture.actions.Count -eq 30 -and $fixture.grants.Count -eq 20) 'Expected 30 submissions and 20 approvals'
Assert-True ($fixture.scans -eq 20 -and $fixture.uploads -eq 10) 'Expected station receipts and evidence for each student'
Write-Host 'PASS: prepares next month without future actions; current actions require approval and QR.'

& $seed -Gateway 'http://seed.invalid' -PrepareNextMonth
Assert-True ($fixture.missions.Count -eq 6 -and $fixture.actions.Count -eq 30 -and $fixture.grants.Count -eq 20) 'Same-day seed duplicated records'
Assert-True ($fixture.uploads -eq 10 -and $fixture.scans -eq 20) 'Same-day seed uploaded or scanned again'
Write-Host 'PASS: repeated run creates no duplicate missions, actions, grants or uploads.'

$fixture.now = $fixture.now.AddDays(1)
& $seed -Gateway 'http://seed.invalid'
Assert-True ($fixture.actions.Count -eq 60 -and $fixture.grants.Count -eq 40) 'Next day did not add exactly one batch'
Write-Host 'PASS: next day appends activity while retaining previous records.'

$fixture.now = [DateTime]::SpecifyKind([DateTime]'2026-11-01T12:00:00', [DateTimeKind]::Utc)
& $seed -Gateway 'http://seed.invalid'
Assert-True ($fixture.missions.Count -eq 6 -and $fixture.actions.Count -eq 90) 'November failed to reuse prepared campaigns'
Write-Host 'PASS: November automatically uses its prepared campaigns.'

$fixture.now = [DateTime]::SpecifyKind([DateTime]'2026-12-31T12:00:00', [DateTimeKind]::Utc)
& $seed -Gateway 'http://seed.invalid' -PrepareNextMonth
Assert-True ($fixture.missions.ContainsKey('MISSION-DEMO-2027-01-RECYCLE')) 'Next-year campaign missing'
Write-Host 'PASS: December prepares January in the next year.'

$fixture.missions['MISSION-DEMO-2026-12-RECYCLE'].status = 'CANCELLED'
$countBefore = $fixture.actions.Count
$rejected = $false
try { & $seed -Gateway 'http://seed.invalid' } catch { $rejected = $_.Exception.Message -like '*Existing moderation decisions are preserved*' }
Assert-True ($rejected -and $fixture.actions.Count -eq $countBefore) 'Seed overrode a cancelled mission'
Assert-True ($fixture.missions['MISSION-DEMO-2026-12-RECYCLE'].status -eq 'CANCELLED') 'Cancelled status changed'
Write-Host 'PASS: cancelled campaigns are not reactivated.'
Write-Host 'Demo refresh regression: 6 scenarios PASSED (mock APIs, no database writes).'
