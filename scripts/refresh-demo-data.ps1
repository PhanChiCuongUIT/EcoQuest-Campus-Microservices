param(
    [string]$Gateway = 'http://localhost:18080',
    [string]$DemoPassword = 'EcoQuest@123'
)

$ErrorActionPreference = 'Stop'
$Gateway = $Gateway.TrimEnd('/')
$today = [DateTime]::UtcNow
$batch = $today.ToString('yyyy-MM-dd')
$month = $today.ToString('yyyy-MM')

function Api([string]$Method, [string]$Path, $Headers, $Body = $null) {
    $parameters = @{ Method = $Method; Uri = "$Gateway$Path"; Headers = $Headers; TimeoutSec = 60 }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json; charset=utf-8'
        $parameters.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 10 -Compress))
    }
    $response = Invoke-RestMethod @parameters
    if ($response -is [array]) {
        foreach ($item in $response) { Write-Output $item }
    } else {
        Write-Output $response
    }
}

function Login([string]$Email) {
    $session = Api 'POST' '/auth/login' @{} @{ email = $Email; password = $DemoPassword }
    return @{ Authorization = "Bearer $($session.accessToken)" }
}

$admin = Login 'admin@ecoquest.local'
$moderator = Login 'moderator@ecoquest.local'
$catalog = @(Api 'GET' '/catalog/missions' $admin)
$templates = @(
    @{ suffix = 'RECYCLE'; title = 'Campus recycling'; actionType = 'RECYCLE_BOTTLE'; points = 10; station = 'STATION-A1' },
    @{ suffix = 'ENERGY'; title = 'Classroom energy saving'; actionType = 'ENERGY_SAVING'; points = 20; station = $null },
    @{ suffix = 'TREE'; title = 'Campus garden care'; actionType = 'TREE_CARE'; points = 25; station = 'STATION-E5' }
)
foreach ($template in $templates) {
    $template.id = "MISSION-DEMO-$month-$($template.suffix)"
    $mission = $catalog | Where-Object { $_.id -eq $template.id } | Select-Object -First 1
    if (-not $mission) {
        $mission = Api 'POST' '/catalog/missions' $admin @{
            id = $template.id; title = "$($template.title) - $month"; actionType = $template.actionType
            basePoints = $template.points; evidenceRequired = $true
            stationRequired = ($null -ne $template.station)
            allowedStationIds = @($template.station | Where-Object { $_ })
            description = "Sample campus campaign for $month. Evidence used by this data refresh is the project logo."
        }
        $mission = Api 'PUT' "/catalog/missions/$($template.id)/status?status=ACTIVE" $admin
    }
    if ($mission.status -ne 'ACTIVE') {
        throw "Mission $($template.id) is $($mission.status). Existing moderation decisions are preserved."
    }
}

$logoPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'web-apps/ecoquest-web/public/logo.png'
$logo = [Convert]::ToBase64String([IO.File]::ReadAllBytes($logoPath))
$created = 0
$existing = 0
$grants = @()
for ($studentNumber = 1; $studentNumber -le 10; $studentNumber++) {
    $studentId = 'SV{0:D3}' -f $studentNumber
    $email = if ($studentNumber -eq 1) { 'student@ecoquest.local' } else { "student$studentNumber@ecoquest.local" }
    $student = Login $email
    $history = @(Api 'GET' "/actions/user/$studentId" $student)
    $evidence = $null
    for ($index = 0; $index -lt $templates.Count; $index++) {
        $template = $templates[$index]
        # Persisted action history, not the six-hour Redis TTL, prevents repeat batches.
        $action = $history | Where-Object {
            $_.missionId -eq $template.id -and ([DateTimeOffset]$_.submittedAt).UtcDateTime.ToString('yyyy-MM-dd') -eq $batch
        } | Select-Object -First 1
        if ($action) { $existing++ }
        else {
            if (-not $evidence) {
                $evidence = Api 'POST' '/actions/evidence' $student @{
                    fileName = 'demo-project-logo.png'; contentType = 'image/png'; base64 = $logo
                }
            }
            $scan = $null
            if ($template.station) {
                $qr = Api 'GET' "/catalog/stations/$($template.station)/qr" $admin
                $scan = Api 'POST' '/catalog/stations/scan' $student @{ qrToken = $qr.qrToken; missionId = $template.id }
            }
            $action = Api 'POST' '/actions/submit' $student @{
                stationScanReceipt = $scan.scanReceipt
                idempotencyKey = "demo-refresh-$batch-$studentId-$index"
                studentId = $studentId; missionId = $template.id; actionType = $template.actionType
                stationId = $template.station; evidenceUrl = $evidence.evidenceUrl
                evidenceUrls = @($evidence.evidenceUrl)
            }
            $created++
            if ($action.status -ne 'PENDING_REVIEW') {
                throw "$studentId/$($template.id): $($action.status), $($action.policyReason). Check the current daily policy limit."
            }
        }
        # Vary accepted totals while leaving a real review backlog for demonstration.
        if ($index -lt (1 + ($studentNumber % 3)) -and $action.status -eq 'PENDING_REVIEW') {
            $action = Api 'PUT' "/actions/$($action.id)/approve" $moderator
        }
        if ($action.status -eq 'ACCEPTED') { $grants += @{ studentId = $studentId; actionId = $action.id } }
    }
    Write-Host "[EcoQuest Data] $studentId completed"
}

$deadline = (Get-Date).AddSeconds(120)
do {
    $missing = 0
    foreach ($group in ($grants | Group-Object { $_.studentId })) {
        $transactions = @(Api 'GET' "/rewards/wallets/$($group.Name)/transactions" $admin)
        foreach ($grant in $group.Group) {
            if (-not ($transactions | Where-Object { $_.sourceActionId -eq $grant.actionId })) { $missing++ }
        }
    }
    if ($missing -eq 0) { break }
    Start-Sleep -Seconds 2
} while ((Get-Date) -lt $deadline)
if ($missing -gt 0) { throw "$missing point transactions are still missing. Check Action outbox and RabbitMQ consumers." }
Write-Host "[EcoQuest Data] PASS: $created new actions, $existing existing actions, $($grants.Count) accepted actions verified in Reward Ledger. UTC batch: $batch."
