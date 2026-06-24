param(
    [string]$Gateway = "http://localhost:18080",
    [string]$Policy = "http://localhost:8090",
    [switch]$SkipDockerChecks
)

$ErrorActionPreference = "Stop"
$script:DefaultHeaders = @{}

function Write-Step([string]$Message) {
    Write-Host "[EcoQuest Smoke] $Message"
}

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) {
        throw "Assertion failed: $Message"
    }
}

function Invoke-Api {
    param(
        [string]$Method = "GET",
        [string]$Uri,
        $Body = $null
    )
    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $script:DefaultHeaders
    }
    $json = $Body | ConvertTo-Json -Compress
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $script:DefaultHeaders -ContentType "application/json" -Body $json
}

function Invoke-ApiList {
    param(
        [string]$Method = "GET",
        [string]$Uri,
        $Body = $null
    )
    if ($null -eq $Body) {
        $response = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Uri -Headers $script:DefaultHeaders
    } else {
        $json = $Body | ConvertTo-Json -Compress
        $response = Invoke-WebRequest -UseBasicParsing -Method $Method -Uri $Uri -Headers $script:DefaultHeaders -ContentType "application/json" -Body $json
    }
    if ([string]::IsNullOrWhiteSpace($response.Content)) {
        return @()
    }
    $parsed = $response.Content | ConvertFrom-Json
    foreach ($item in @($parsed)) {
        Write-Output $item
    }
}

function Invoke-ApiWithHeaders {
    param(
        [string]$Method = "GET",
        [string]$Uri,
        $Headers = @{},
        $Body = $null
    )
    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
    }
    $json = $Body | ConvertTo-Json -Compress
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ContentType "application/json" -Body $json
}

function Wait-ForApi {
    param(
        [string]$Uri,
        [int]$Attempts = 30,
        [int]$DelaySeconds = 2
    )
    $lastError = $null
    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            return Invoke-Api -Uri $Uri
        } catch {
            $lastError = $_
            Start-Sleep -Seconds $DelaySeconds
        }
    }
    throw $lastError
}

function Wait-ForApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Uri,
        $Body = $null,
        [int]$Attempts = 30,
        [int]$DelaySeconds = 2
    )
    $lastError = $null
    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            return Invoke-Api -Method $Method -Uri $Uri -Body $Body
        } catch {
            $lastError = $_
            Start-Sleep -Seconds $DelaySeconds
        }
    }
    throw $lastError
}

function Wait-Until {
    param(
        [scriptblock]$Condition,
        [string]$Message,
        [int]$Attempts = 30,
        [int]$DelaySeconds = 2
    )
    $lastError = $null
    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            if (& $Condition) {
                return
            }
        } catch {
            $lastError = $_
        }
        Start-Sleep -Seconds $DelaySeconds
    }
    if ($null -ne $lastError) {
        throw "Timed out waiting for $Message. Last error: $lastError"
    }
    throw "Timed out waiting for $Message"
}

function Get-StatusCode {
    param(
        [string]$Method = "GET",
        [string]$Uri,
        $Body = $null
    )
    try {
        if ($null -eq $Body) {
            Invoke-RestMethod -Method $Method -Uri $Uri -Headers $script:DefaultHeaders | Out-Null
        } else {
            $json = $Body | ConvertTo-Json -Compress
            Invoke-RestMethod -Method $Method -Uri $Uri -Headers $script:DefaultHeaders -ContentType "application/json" -Body $json | Out-Null
        }
        return 200
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            return [int]$_.Exception.Response.StatusCode
        }
        throw
    }
}

function New-Key([string]$Prefix) {
    return "$Prefix-$([guid]::NewGuid())"
}

function New-AuthHeaders($Login) {
    return @{ Authorization = "Bearer $($Login.accessToken)" }
}

function Has-ItemWithValue {
    param(
        $Items,
        [string]$PropertyName,
        $ExpectedValue
    )
    foreach ($item in @($Items)) {
        if ($item.$PropertyName -eq $ExpectedValue) {
            return $true
        }
    }
    return $false
}

function Has-Item {
    param(
        $Items,
        [scriptblock]$Predicate
    )
    foreach ($item in @($Items)) {
        if (& $Predicate $item) {
            return $true
        }
    }
    return $false
}

Write-Step "Checking Gateway health"
$health = Wait-ForApi -Uri "$Gateway/actuator/health"
Assert-True ($health.status -eq "UP") "Gateway health should be UP"

$authRunId = (Get-Date -Format "yyyyMMddHHmmss") + "-" + (Get-Random)
Write-Step "Checking Identity Access auth/register/forgot/reset APIs"
$adminLogin = Wait-ForApiRequest -Method "POST" -Uri "$Gateway/auth/login" -Body @{
    email = "admin@ecoquest.local"
    password = "EcoQuest@123"
}
Assert-True ($adminLogin.user.role -eq "ADMIN") "Seeded admin login should return ADMIN role"
Assert-True ($adminLogin.accessToken -like "*.*.*") "Login should return a signed access token"
$adminHeaders = New-AuthHeaders $adminLogin
$script:DefaultHeaders = $adminHeaders
$adminMe = Invoke-ApiWithHeaders -Uri "$Gateway/auth/me" -Headers $adminHeaders
Assert-True ($adminMe.email -eq "admin@ecoquest.local") "Auth /me should resolve bearer token"
$moderatorLogin = Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/auth/login" -Body @{
    email = "moderator@ecoquest.local"
    password = "EcoQuest@123"
}
Assert-True ($moderatorLogin.user.role -eq "MODERATOR") "Seeded moderator login should return MODERATOR role"
$moderatorHeaders = New-AuthHeaders $moderatorLogin
$newAuthEmail = "e2e-$authRunId@ecoquest.local"
$newAuthPassword = "EcoQuest@123"
$newStudentId = "SV_AUTH_$authRunId"
$registered = Invoke-Api -Method "POST" -Uri "$Gateway/auth/register" -Body @{
    email = $newAuthEmail
    password = $newAuthPassword
    displayName = "E2E Auth Student"
    studentId = $newStudentId
}
Assert-True ($registered.user.role -eq "STUDENT") "Registered account should default to STUDENT role"
Assert-True ($registered.user.studentId -eq $newStudentId) "Registered account should keep requested student ID"
Assert-True ($registered.user.status -eq "INACTIVE") "Registered account should be inactive before email verification"
Assert-True ($registered.user.emailVerified -eq $false) "Registered account should require email verification"
Assert-True ([string]::IsNullOrWhiteSpace($registered.accessToken)) "Register should not issue access token before verification"
Assert-True (-not [string]::IsNullOrWhiteSpace($registered.verificationToken)) "Register should return demo verification token for local testing"
$loginBeforeVerifyStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/auth/login" -Body @{
    email = $newAuthEmail
    password = $newAuthPassword
}
Assert-True ($loginBeforeVerifyStatus -eq 403) "Login should fail before email verification"
$verified = Invoke-Api -Method "POST" -Uri "$Gateway/auth/verify-email" -Body @{
    verificationToken = $registered.verificationToken
}
Assert-True ($verified.user.emailVerified -eq $true) "Email verification should mark account verified"
Assert-True ($verified.user.status -eq "ACTIVE") "Email verification should activate account"
$duplicateRegisterStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/auth/register" -Body @{
    email = $newAuthEmail
    password = $newAuthPassword
    displayName = "Duplicate Auth Student"
    studentId = "SV_AUTH_DUP_$authRunId"
}
Assert-True ($duplicateRegisterStatus -eq 409) "Duplicate email register should return HTTP 409"
$forgot = Invoke-Api -Method "POST" -Uri "$Gateway/auth/forgot-password" -Body @{ email = $newAuthEmail }
Assert-True ($forgot.emailKnown -eq $true) "Forgot password should recognize registered email"
Assert-True (-not [string]::IsNullOrWhiteSpace($forgot.resetToken)) "Forgot password should return demo reset token"
$reset = Invoke-Api -Method "POST" -Uri "$Gateway/auth/reset-password" -Body @{
    resetToken = $forgot.resetToken
    newPassword = "EcoQuest@456"
}
Assert-True ($reset.message -match "success") "Reset password should succeed"
$reuseResetStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/auth/reset-password" -Body @{
    resetToken = $forgot.resetToken
    newPassword = "EcoQuest@789"
}
Assert-True ($reuseResetStatus -eq 400) "Used reset token should not be reusable"
$oldPasswordStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/auth/login" -Body @{
    email = $newAuthEmail
    password = $newAuthPassword
}
Assert-True ($oldPasswordStatus -eq 401) "Old password should fail after reset"
$newLogin = Invoke-Api -Method "POST" -Uri "$Gateway/auth/login" -Body @{
    email = $newAuthEmail
    password = "EcoQuest@456"
}
Assert-True ($newLogin.user.email -eq $newAuthEmail) "New password should login after reset"
$newLoginHeaders = New-AuthHeaders $newLogin
$updatedProfile = Invoke-ApiWithHeaders -Method "PUT" -Uri "$Gateway/auth/me/profile" -Headers $newLoginHeaders -Body @{
    displayName = "E2E Auth Student Updated"
    avatarUrl = "https://example.com/avatar.png"
}
Assert-True ($updatedProfile.displayName -eq "E2E Auth Student Updated") "Profile update should persist display name"
$avatarProfile = Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/auth/me/avatar" -Headers $newLoginHeaders -Body @{
    fileName = "avatar.png"
    contentType = "image/png"
    base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
}
Assert-True ($avatarProfile.avatarUrl -like "/auth/media/avatars/*") "Avatar upload should persist a durable Identity media URL"
$avatarDownload = Invoke-WebRequest -UseBasicParsing -Uri "$Gateway$($avatarProfile.avatarUrl)"
Assert-True ($avatarDownload.StatusCode -eq 200) "Uploaded avatar should be downloadable on another client"
Assert-True ($avatarDownload.Headers["Content-Type"] -match "image/png") "Uploaded avatar should preserve content type"
$users = @(Invoke-ApiList -Uri "$Gateway/auth/users")
Assert-True (Has-ItemWithValue $users "email" $newAuthEmail) "Admin should list users"
$promoted = Invoke-Api -Method "PUT" -Uri "$Gateway/auth/users/$($newLogin.user.id)/role" -Body @{ role = "MODERATOR" }
Assert-True ($promoted.role -eq "MODERATOR") "Admin should promote student to moderator"
$inactive = Invoke-Api -Method "PUT" -Uri "$Gateway/auth/users/$($newLogin.user.id)/status" -Body @{
    status = "INACTIVE"
    reason = "E2E status check"
}
Assert-True ($inactive.status -eq "INACTIVE") "Admin should update user status"
$reactivated = Invoke-Api -Method "PUT" -Uri "$Gateway/auth/users/$($newLogin.user.id)/status" -Body @{
    status = "ACTIVE"
    reason = "E2E reactivation"
}
Assert-True ($reactivated.status -eq "ACTIVE") "Admin should reactivate user"
$promotedModeratorLogin = Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/auth/login" -Headers @{} -Body @{
    email = $newAuthEmail
    password = "EcoQuest@456"
}
Assert-True ($promotedModeratorLogin.user.role -eq "MODERATOR") "Promoted user should receive Moderator role on a fresh token"
$promotedModeratorHeaders = New-AuthHeaders $promotedModeratorLogin
$promotedModeratorStudentId = $promotedModeratorLogin.user.studentId

Write-Step "Checking Catalog missions/stations/badges"
$missions = @(Invoke-ApiList -Uri "$Gateway/catalog/missions")
$stations = @(Invoke-ApiList -Uri "$Gateway/catalog/stations")
$badges = @(Invoke-ApiList -Uri "$Gateway/catalog/badges")
Assert-True ($missions.Count -ge 8) "Catalog should have expanded seeded missions"
Assert-True ($stations.Count -ge 5) "Catalog should have expanded seeded stations"
Assert-True ($badges.Count -ge 6) "Catalog should have expanded seeded badges"
Assert-True (Has-ItemWithValue $missions "id" "MISSION-CHECKIN-01") "Catalog should include green check-in mission"
Assert-True (Has-ItemWithValue $missions "id" "MISSION-TRASH-01") "Catalog should include report trash mission"
Assert-True (Has-ItemWithValue $stations "id" "STATION-B2") "Catalog should include refill station"
Assert-True (Has-ItemWithValue $badges "code" "CAMPUS_GUARDIAN") "Catalog should include high-tier badge"
Assert-True (Has-Item $missions { param($m) $m.id -eq "MISSION-RECYCLE-01" -and $m.status -eq "ACTIVE" }) "Seeded missions should expose ACTIVE status"
Assert-True (Has-Item $missions { param($m) $m.id -eq "MISSION-RECYCLE-01" -and $m.stationRequired -eq $true }) "Recycle mission should require a station"
Assert-True (Has-Item $missions { param($m) $m.id -eq "MISSION-TRASH-01" -and $m.stationRequired -eq $false }) "Trash report mission should not require a station"
Assert-True (Has-Item $stations { param($s) $s.id -eq "STATION-B2" -and -not [string]::IsNullOrWhiteSpace($s.imageUrl) }) "Seeded stations should expose image URL"
$stationB2 = $stations | Where-Object { $_.id -eq "STATION-B2" } | Select-Object -First 1
$uploadedStationImage = Invoke-Api -Method "POST" -Uri "$Gateway/catalog/stations/STATION-B2/image" -Body @{
    fileName = "station-b2.png"
    dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
}
Assert-True ($uploadedStationImage.imageUrl -like "/catalog/stations/images/*") "Admin should upload station image to Catalog media storage"
$stationImageDownload = Invoke-WebRequest -UseBasicParsing -Uri "$Gateway$($uploadedStationImage.imageUrl)"
Assert-True ($stationImageDownload.StatusCode -eq 200) "Uploaded station image should be downloadable"
Invoke-Api -Method "PUT" -Uri "$Gateway/catalog/stations/STATION-B2" -Body @{
    id = $stationB2.id
    name = $stationB2.name
    code = $stationB2.code
    stationType = $stationB2.stationType
    location = $stationB2.location
    active = $stationB2.active
    imageUrl = $stationB2.imageUrl
} | Out-Null
$authorizedHeaders = $script:DefaultHeaders
$script:DefaultHeaders = @{}
$catalogNoAuthStatus = Get-StatusCode -Uri "$Gateway/catalog/missions"
Assert-True ($catalogNoAuthStatus -eq 401) "Domain APIs should require JWT bearer tokens"
$script:DefaultHeaders = $authorizedHeaders

Write-Step "Checking Policy admin API is not routed through Gateway"
$gatewayPolicyStatus = Get-StatusCode -Uri "$Gateway/policies/rules"
Assert-True ($gatewayPolicyStatus -eq 404) "Policy admin API should not be public through Gateway"
$script:DefaultHeaders = @{}
$policyNoAuthStatus = Get-StatusCode -Uri "$Policy/policies/rules"
Assert-True ($policyNoAuthStatus -eq 401) "Policy admin API should require a bearer token on direct port"
$script:DefaultHeaders = $adminHeaders
$policyRules = @(Invoke-ApiList -Uri "$Policy/policies/rules")
Assert-True ($policyRules.Count -ge 8) "Policy admin API should expose expanded seeded rules directly"
Assert-True (Has-ItemWithValue $policyRules "actionType" "GREEN_CHECKIN") "Policy rules should include GREEN_CHECKIN"
Assert-True (Has-ItemWithValue $policyRules "actionType" "WATER_REFILL") "Policy rules should include WATER_REFILL"

$runId = (Get-Date -Format "yyyyMMddHHmmss") + "-" + (Get-Random)
$studentAccepted = "SV_E2E_ACCEPTED_$runId"
$studentRejected = "SV_E2E_REJECT_$runId"
$studentApproved = "SV_E2E_APPROVE_$runId"
$studentDaily = "SV_E2E_DAILY_$runId"
$studentCheckin = "SV_E2E_CHECKIN_$runId"
$studentMissingStation = "SV_E2E_MISSING_STATION_$runId"
$studentTrash = "SV_E2E_TRASH_$runId"
$studentUnsupported = "SV_E2E_UNSUPPORTED_$runId"

function New-StudentSession([string]$EmailPrefix, [string]$StudentId) {
    $email = "$EmailPrefix-$runId@ecoquest.local"
    $sessionRegister = Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/auth/register" -Headers @{} -Body @{
        email = $email
        password = "EcoQuest@123"
        displayName = "E2E $EmailPrefix"
        studentId = $StudentId
    }
    Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/auth/verify-email" -Headers @{} -Body @{
        verificationToken = $sessionRegister.verificationToken
    } | Out-Null
    $login = Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/auth/login" -Headers @{} -Body @{
        email = $email
        password = "EcoQuest@123"
    }
    Assert-True ($login.user.studentId -eq $StudentId) "Registered E2E student token should match $StudentId"
    return New-AuthHeaders $login
}

$studentAcceptedHeaders = New-StudentSession "accepted" $studentAccepted
$studentRejectedHeaders = New-StudentSession "rejected" $studentRejected
$studentApprovedHeaders = New-StudentSession "approved" $studentApproved
$studentDailyHeaders = New-StudentSession "daily" $studentDaily
$studentCheckinHeaders = New-StudentSession "checkin" $studentCheckin
$studentMissingStationHeaders = New-StudentSession "missing-station" $studentMissingStation
$studentTrashHeaders = New-StudentSession "trash" $studentTrash
$studentUnsupportedHeaders = New-StudentSession "unsupported" $studentUnsupported

Write-Step "Checking Catalog admin create/update/delete APIs"
$script:DefaultHeaders = $adminHeaders
$tempMissionId = "MISSION-E2E-$runId"
$tempStationId = "STATION-E2E-$runId"
$tempBadgeCode = "BADGE-E2E-$runId"
Write-Step "Creating temporary Catalog mission"
Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/catalog/missions" -Headers $adminHeaders -Body @{
    id = $tempMissionId
    title = "E2E Temporary Mission"
    actionType = "E2E_TEMP_ACTION"
    basePoints = 1
    evidenceRequired = $false
    stationRequired = $false
    description = "Temporary mission created by smoke test."
} | Out-Null
Write-Step "Creating temporary Catalog station"
Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/catalog/stations" -Headers $adminHeaders -Body @{
    id = $tempStationId
    name = "E2E Temporary Station"
    code = "QR-E2E"
    stationType = "TEST"
    location = "Smoke Test"
    active = $true
    imageUrl = "/logo.png"
} | Out-Null
Write-Step "Creating temporary Catalog badge"
Invoke-ApiWithHeaders -Method "POST" -Uri "$Gateway/catalog/badges" -Headers $adminHeaders -Body @{
    code = $tempBadgeCode
    name = "E2E Temporary Badge"
    description = "Temporary badge created by smoke test."
    requiredPoints = 9999
    criteriaType = "POINTS"
    actionType = $null
    requiredCount = 0
} | Out-Null
$createdMissions = @(Invoke-ApiList -Uri "$Gateway/catalog/missions")
$createdStations = @(Invoke-ApiList -Uri "$Gateway/catalog/stations")
$createdBadges = @(Invoke-ApiList -Uri "$Gateway/catalog/badges")
Assert-True (Has-ItemWithValue $createdMissions "id" $tempMissionId) "Catalog mission create should persist temp mission"
Assert-True (Has-ItemWithValue $createdStations "id" $tempStationId) "Catalog station create should persist temp station"
Assert-True (Has-ItemWithValue $createdBadges "code" $tempBadgeCode) "Catalog badge create should persist temp badge"
$tempMission = $createdMissions | Where-Object { $_.id -eq $tempMissionId } | Select-Object -First 1
Assert-True ($tempMission.status -eq "PENDING") "Newly created mission should start as PENDING"
$script:DefaultHeaders = $studentAcceptedHeaders
$pendingMissionSubmitStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "pending-mission-denied"
    studentId = $studentAccepted
    missionId = $tempMissionId
    stationId = $null
    actionType = "E2E_TEMP_ACTION"
    evidenceUrl = $null
}
Assert-True ($pendingMissionSubmitStatus -eq 409) "Action service should reject submission to a PENDING mission"
$script:DefaultHeaders = $adminHeaders
$activatedMission = Invoke-Api -Method "PUT" -Uri "$Gateway/catalog/missions/$tempMissionId/status?status=ACTIVE"
Assert-True ($activatedMission.status -eq "ACTIVE") "Admin should activate pending mission"
Assert-True ((Get-StatusCode -Method "DELETE" -Uri "$Gateway/catalog/missions/$tempMissionId") -eq 200) "Catalog mission delete should return success"
Assert-True ((Get-StatusCode -Method "DELETE" -Uri "$Gateway/catalog/stations/$tempStationId") -eq 200) "Catalog station delete should return success"
Assert-True ((Get-StatusCode -Method "DELETE" -Uri "$Gateway/catalog/badges/$tempBadgeCode") -eq 200) "Catalog badge delete should return success"
$deletedMissions = @(Invoke-ApiList -Uri "$Gateway/catalog/missions")
$deletedStations = @(Invoke-ApiList -Uri "$Gateway/catalog/stations")
$deletedBadges = @(Invoke-ApiList -Uri "$Gateway/catalog/badges")
Assert-True (-not (Has-ItemWithValue $deletedMissions "id" $tempMissionId)) "Catalog mission delete should remove temp mission"
Assert-True (-not (Has-ItemWithValue $deletedStations "id" $tempStationId)) "Catalog station delete should remove temp station"
Assert-True (-not (Has-ItemWithValue $deletedBadges "code" $tempBadgeCode)) "Catalog badge delete should remove temp badge"

Write-Step "Checking role-based access control boundaries"
$script:DefaultHeaders = $studentAcceptedHeaders
$studentCatalogAdminStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/catalog/missions" -Body @{
    id = "MISSION-RBAC-DENIED-$runId"
    title = "Denied Mission"
    actionType = "DENIED"
    basePoints = 1
    evidenceRequired = $false
    description = "Should not be created by a student."
}
Assert-True ($studentCatalogAdminStatus -eq 403) "Student should not create Catalog missions"
$studentReviewStatus = Get-StatusCode -Uri "$Gateway/actions/review"
Assert-True ($studentReviewStatus -eq 403) "Student should not access Moderator review queue"
$studentOtherActionsStatus = Get-StatusCode -Uri "$Gateway/actions/user/$studentRejected"
Assert-True ($studentOtherActionsStatus -eq 403) "Student should not read another student's actions"
$script:DefaultHeaders = $promotedModeratorHeaders
$moderatorSubmitOtherStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "moderator-submit-other-denied"
    studentId = $studentAccepted
    missionId = "MISSION-RECYCLE-01"
    stationId = "STATION-A1"
    actionType = "RECYCLE_BOTTLE"
    evidenceUrl = "https://example.com/evidence/moderator-denied.jpg"
}
Assert-True ($moderatorSubmitOtherStatus -eq 403) "Moderator should not submit actions for another student"
$moderatorOwnPending = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "moderator-own-pending"
    studentId = $promotedModeratorStudentId
    missionId = "MISSION-CLEANUP-01"
    stationId = "STATION-A1"
    actionType = "CLEANUP_EVENT"
    evidenceUrl = ""
}
Assert-True ($moderatorOwnPending.status -eq "PENDING_REVIEW") "Moderator should be able to submit their own student action"
$moderatorSelfApproveStatus = Get-StatusCode -Method "PUT" -Uri "$Gateway/actions/$($moderatorOwnPending.id)/approve"
Assert-True ($moderatorSelfApproveStatus -eq 403) "Moderator should not approve their own action"
$script:DefaultHeaders = $studentAcceptedHeaders
$studentCloseSeasonStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/leaderboards/seasons/RBAC-DENIED-$runId/close?type=weekly&winners=1"
Assert-True ($studentCloseSeasonStatus -eq 403) "Student should not close leaderboard seasons"
$studentAdjustStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/rewards/adjust" -Body @{
    studentId = $studentAccepted
    points = 1
    reason = "RBAC denial check"
}
Assert-True ($studentAdjustStatus -eq 403) "Student should not manually adjust rewards"

Write-Step "Checking Action draft stored in Redis"
$script:DefaultHeaders = $studentAcceptedHeaders
$draft = @{
    studentId = $studentAccepted
    missionId = "MISSION-RECYCLE-01"
    stationId = "STATION-A1"
    actionType = "RECYCLE_BOTTLE"
    evidenceUrl = "https://example.com/evidence/draft.jpg"
}
$draftKey = Invoke-Api -Method "POST" -Uri "$Gateway/actions/drafts" -Body $draft
Assert-True ($draftKey -like "ecoquest:draft:*") "Draft endpoint should return Redis draft key"
if (-not $SkipDockerChecks) {
    $draftValue = docker exec microservices-se361-redis-1 redis-cli GET $draftKey
    Assert-True ($draftValue -match $studentAccepted) "Draft key should exist in Redis"
}

Write-Step "Checking evidence upload to MinIO through Action service"
$evidenceUpload = Invoke-Api -Method "POST" -Uri "$Gateway/actions/evidence" -Body @{
    fileName = "evidence.png"
    dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
}
Assert-True ($evidenceUpload.evidenceUrl -like "/actions/evidence/*") "Evidence upload should return an Action evidence URL"
$authorizedHeaders = $script:DefaultHeaders
$script:DefaultHeaders = @{}
$evidenceDownloadStatus = Get-StatusCode -Uri "$Gateway$($evidenceUpload.evidenceUrl)"
Assert-True ($evidenceDownloadStatus -eq 200) "Evidence download should be available for image preview"
$script:DefaultHeaders = $authorizedHeaders

Write-Step "Checking accepted submit, idempotency, Reward, badges, and Leaderboard"
$acceptedPayload = @{
    idempotencyKey = New-Key "accepted"
    studentId = $studentAccepted
    missionId = "MISSION-RECYCLE-01"
    stationId = "STATION-A1"
    actionType = "RECYCLE_BOTTLE"
    evidenceUrl = $evidenceUpload.evidenceUrl
}
$accepted = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body $acceptedPayload
Assert-True ($accepted.status -eq "ACCEPTED") "Recycle action should be accepted"
Assert-True ($accepted.points -eq 10) "Recycle action should grant 10 suggested points"
$duplicateStatus = Get-StatusCode -Method "POST" -Uri "$Gateway/actions/submit" -Body $acceptedPayload
Assert-True ($duplicateStatus -eq 409) "Same idempotency key should return HTTP 409"
Wait-Until -Message "accepted action to update Reward Ledger and Leaderboard" -Attempts 45 -DelaySeconds 2 -Condition {
    $wallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentAccepted"
    $transactions = @(Invoke-ApiList -Uri "$Gateway/rewards/wallets/$studentAccepted/transactions")
    $rank = Invoke-Api -Uri "$Gateway/leaderboards/users/$studentAccepted/rank?type=weekly"
    return ($wallet.totalPoints -ge 10) `
        -and (Has-ItemWithValue $transactions "sourceActionId" $accepted.id) `
        -and ($null -ne $rank.rank)
}
$acceptedWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentAccepted"
$acceptedTransactions = @(Invoke-ApiList -Uri "$Gateway/rewards/wallets/$studentAccepted/transactions")
$acceptedBadges = @(Invoke-ApiList -Uri "$Gateway/rewards/wallets/$studentAccepted/badges")
$acceptedRank = Invoke-Api -Uri "$Gateway/leaderboards/users/$studentAccepted/rank?type=weekly"
Assert-True ($acceptedWallet.totalPoints -eq 10) "Accepted student wallet should have 10 points"
Assert-True (Has-ItemWithValue $acceptedTransactions "sourceActionId" $accepted.id) "Reward transaction should reference source action id"
Assert-True (Has-ItemWithValue $acceptedBadges "badgeCode" "GREEN_STARTER") "First accepted action should unlock GREEN_STARTER"
Assert-True ($null -ne $acceptedRank.rank) "Accepted student should appear on weekly leaderboard"

Write-Step "Checking audited positive and negative admin point adjustments"
$script:DefaultHeaders = $adminHeaders
$positiveAdjustment = Invoke-Api -Method "POST" -Uri "$Gateway/rewards/adjust" -Body @{
    studentId = $studentAccepted
    points = 5
    reason = "E2E approved bonus"
}
Assert-True ($positiveAdjustment.reason -eq "E2E approved bonus") "Manual adjustment should persist audit reason"
Assert-True (-not [string]::IsNullOrWhiteSpace($positiveAdjustment.adjustedByUserId)) "Manual adjustment should persist admin identity"
$negativeAdjustment = Invoke-Api -Method "POST" -Uri "$Gateway/rewards/adjust" -Body @{
    studentId = $studentAccepted
    points = -5
    reason = "E2E correction"
}
Assert-True ($negativeAdjustment.points -eq -5) "Admin should be able to deduct points without a negative wallet"
$script:DefaultHeaders = $studentAcceptedHeaders
$walletAfterAdjustments = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentAccepted"
Assert-True ($walletAfterAdjustments.totalPoints -eq 10) "Positive and negative test adjustments should net to zero"

$script:DefaultHeaders = $adminHeaders
Invoke-Api -Method "PUT" -Uri "$Policy/policies/rules/RECYCLE_BOTTLE" -Body @{
    actionType = "RECYCLE_BOTTLE"
    basePoints = 10
    evidenceRequired = $true
    stationRequired = $true
    dailyLimit = 12
    active = $true
} | Out-Null
$script:DefaultHeaders = $studentAcceptedHeaders
for ($i = 2; $i -le 10; $i++) {
    $recycle = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
        idempotencyKey = New-Key "recycle-badge"
        studentId = $studentAccepted
        missionId = "MISSION-RECYCLE-01"
        stationId = "STATION-A1"
        actionType = "RECYCLE_BOTTLE"
        evidenceUrl = $evidenceUpload.evidenceUrl
    }
    Assert-True ($recycle.status -eq "ACCEPTED") "Recycle action #$i should be accepted for count-based badge"
}
Wait-Until -Message "ten recycle transactions to unlock RECYCLING_HERO" -Attempts 45 -DelaySeconds 2 -Condition {
    $badges = @(Invoke-ApiList -Uri "$Gateway/rewards/wallets/$studentAccepted/badges")
    return Has-ItemWithValue $badges "badgeCode" "RECYCLING_HERO"
}
$countBadges = @(Invoke-ApiList -Uri "$Gateway/rewards/wallets/$studentAccepted/badges")
Assert-True (Has-ItemWithValue $countBadges "badgeCode" "RECYCLING_HERO") "Ten recycle actions should unlock RECYCLING_HERO"
Wait-Until -Message "notifications from accepted action and badge events" -Attempts 45 -DelaySeconds 2 -Condition {
    $notifications = @(Invoke-ApiList -Uri "$Gateway/notifications")
    return (Has-ItemWithValue $notifications "type" "ACTION_ACCEPTED") -and (Has-ItemWithValue $notifications "type" "BADGE_UNLOCKED")
}
$acceptedNotifications = @(Invoke-ApiList -Uri "$Gateway/notifications")
$firstNotification = $acceptedNotifications | Select-Object -First 1
Assert-True ($null -ne $firstNotification) "Student should have notifications"
$readNotification = Invoke-Api -Method "PUT" -Uri "$Gateway/notifications/$($firstNotification.id)/read"
Assert-True ($readNotification.read -eq $true) "Notification should be markable as read"
$script:DefaultHeaders = $adminHeaders
Invoke-Api -Method "PUT" -Uri "$Policy/policies/rules/RECYCLE_BOTTLE" -Body @{
    actionType = "RECYCLE_BOTTLE"
    basePoints = 10
    evidenceRequired = $true
    stationRequired = $true
    dailyLimit = 5
    active = $true
} | Out-Null

Write-Step "Checking expanded seeded mission policies"
$script:DefaultHeaders = $studentCheckinHeaders
$checkinAccepted = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "checkin"
    studentId = $studentCheckin
    missionId = "MISSION-CHECKIN-01"
    stationId = "STATION-A1"
    actionType = "GREEN_CHECKIN"
    evidenceUrl = ""
}
Assert-True ($checkinAccepted.status -eq "ACCEPTED") "Green check-in should be accepted without evidence when station exists"
Assert-True ($checkinAccepted.points -eq 5) "Green check-in should grant 5 points"
$script:DefaultHeaders = $studentMissingStationHeaders
$missingStation = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "checkin-missing-station"
    studentId = $studentMissingStation
    missionId = "MISSION-CHECKIN-01"
    stationId = ""
    actionType = "GREEN_CHECKIN"
    evidenceUrl = ""
}
Assert-True ($missingStation.status -eq "PENDING_REVIEW") "Station-required policy should send missing station action to review"
$script:DefaultHeaders = $studentTrashHeaders
$trashReport = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "trash"
    studentId = $studentTrash
    missionId = "MISSION-TRASH-01"
    stationId = ""
    actionType = "REPORT_TRASH"
    evidenceUrl = "https://example.com/evidence/trash.jpg"
}
Assert-True ($trashReport.status -eq "ACCEPTED") "Report trash should be accepted with evidence and without station"
Assert-True ($trashReport.points -eq 15) "Report trash should grant 15 points"
Write-Step "Checking Report service create/list/review flow"
$reportEvidence = Invoke-Api -Method "POST" -Uri "$Gateway/reports/evidence" -Body @{
    fileName = "report-evidence.png"
    dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
}
Assert-True ($reportEvidence.evidenceUrl -like "/reports/evidence/*") "Report evidence should be stored by Report service"
$reportEvidenceDownload = Invoke-WebRequest -UseBasicParsing -Uri "$Gateway$($reportEvidence.evidenceUrl)"
Assert-True ($reportEvidenceDownload.StatusCode -eq 200) "Report evidence should be downloadable"
$createdReport = Invoke-Api -Method "POST" -Uri "$Gateway/reports" -Body @{
    targetType = "MISSION"
    targetId = "MISSION-TRASH-01"
    reason = "E2E report for mission content"
    evidenceUrl = $reportEvidence.evidenceUrl
}
Assert-True ($createdReport.status -eq "OPEN") "Report should start as OPEN"
$mineReports = @(Invoke-ApiList -Uri "$Gateway/reports/mine")
Assert-True (Has-ItemWithValue $mineReports "id" $createdReport.id) "Reporter should see own report"
$script:DefaultHeaders = $moderatorHeaders
$allReports = @(Invoke-ApiList -Uri "$Gateway/reports")
Assert-True (Has-ItemWithValue $allReports "id" $createdReport.id) "Moderator should see report queue"
$reviewedReport = Invoke-Api -Method "PUT" -Uri "$Gateway/reports/$($createdReport.id)/review" -Body @{
    status = "ACCEPTED"
    note = "E2E report accepted"
}
Assert-True ($reviewedReport.status -eq "ACCEPTED") "Moderator should review report"
$script:DefaultHeaders = $studentCheckinHeaders
Wait-Until -Message "expanded seeded accepted actions to update Reward Ledger" -Attempts 45 -DelaySeconds 2 -Condition {
    $wallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentCheckin"
    return $wallet.totalPoints -eq 5
}
$checkinWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentCheckin"
Assert-True ($checkinWallet.totalPoints -eq 5) "Expanded seeded action should flow through Reward Ledger"
$script:DefaultHeaders = $adminHeaders
Wait-Until -Message "Report analytics read model to consume action events" -Attempts 45 -DelaySeconds 2 -Condition {
    $summary = Invoke-Api -Uri "$Gateway/reports/analytics/summary?period=weekly"
    return ($summary.acceptedActions -ge 3) -and ($summary.totalPoints -ge 30)
}
$analyticsSummary = Invoke-Api -Uri "$Gateway/reports/analytics/summary?period=weekly"
Assert-True ($analyticsSummary.acceptedActions -ge 3) "Report analytics should count accepted actions"
Assert-True ($analyticsSummary.totalPoints -ge 30) "Report analytics should aggregate granted points"
Assert-True ($null -ne $analyticsSummary.topStudents) "Report analytics contract should expose topStudents for the admin UI"
$studentAnalytics = Invoke-Api -Uri "$Gateway/reports/analytics/students/$studentAccepted"
Assert-True ($studentAnalytics.actionCount -ge 1) "Student analytics should include accepted student's actions"
Assert-True ($studentAnalytics.totalPoints -ge 10) "Student analytics should include accepted student's points"

Write-Step "Checking unsupported action rejection"
$unsupportedMissionId = "MISSION-E2E-UNSUPPORTED-$runId"
$script:DefaultHeaders = $adminHeaders
Invoke-Api -Method "POST" -Uri "$Gateway/catalog/missions" -Body @{
    id = $unsupportedMissionId
    title = "E2E Unsupported Policy Mission"
    actionType = "UNKNOWN_ACTION"
    basePoints = 1
    evidenceRequired = $false
    stationRequired = $false
    description = "Temporary active mission used to verify unsupported Policy decisions."
} | Out-Null
Invoke-Api -Method "PUT" -Uri "$Gateway/catalog/missions/$unsupportedMissionId/status?status=ACTIVE" | Out-Null
$script:DefaultHeaders = $studentUnsupportedHeaders
$unsupported = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "unsupported"
    studentId = $studentUnsupported
    missionId = $unsupportedMissionId
    stationId = ""
    actionType = "UNKNOWN_ACTION"
    evidenceUrl = ""
}
Assert-True ($unsupported.status -eq "REJECTED") "Unsupported action should be rejected"
Assert-True ($unsupported.points -eq 0) "Unsupported action should not grant points"
$script:DefaultHeaders = $adminHeaders
Assert-True ((Get-StatusCode -Method "DELETE" -Uri "$Gateway/catalog/missions/$unsupportedMissionId") -eq 200) "Unsupported-policy temp mission should be deleted"

Write-Step "Checking Moderator reject flow"
$script:DefaultHeaders = $studentRejectedHeaders
$pendingReject = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "pending-reject"
    studentId = $studentRejected
    missionId = "MISSION-CLEANUP-01"
    stationId = "STATION-A1"
    actionType = "CLEANUP_EVENT"
    evidenceUrl = ""
}
Assert-True ($pendingReject.status -eq "PENDING_REVIEW") "Missing evidence cleanup should require manual review"
$script:DefaultHeaders = $moderatorHeaders
$reviewList = @(Invoke-ApiList -Uri "$Gateway/actions/review")
Assert-True (Has-ItemWithValue $reviewList "id" $pendingReject.id) "Pending action should appear in review list"
$rejected = Invoke-Api -Method "PUT" -Uri "$Gateway/actions/$($pendingReject.id)/reject" -Body @{ reason = "Smoke test rejection" }
Assert-True ($rejected.status -eq "REJECTED") "Moderator reject should mark action rejected"
Start-Sleep -Seconds 2
$script:DefaultHeaders = $studentRejectedHeaders
$rejectedWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentRejected"
Assert-True ($rejectedWallet.totalPoints -eq 0) "Rejected action should not grant points"

Write-Step "Checking Moderator approve flow"
$script:DefaultHeaders = $studentApprovedHeaders
$pendingApprove = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "pending-approve"
    studentId = $studentApproved
    missionId = "MISSION-CLEANUP-01"
    stationId = "STATION-A1"
    actionType = "CLEANUP_EVENT"
    evidenceUrl = ""
}
Assert-True ($pendingApprove.status -eq "PENDING_REVIEW") "Cleanup without evidence should be pending before approve"
$script:DefaultHeaders = $moderatorHeaders
$approved = Invoke-Api -Method "PUT" -Uri "$Gateway/actions/$($pendingApprove.id)/approve"
Assert-True ($approved.status -eq "ACCEPTED") "Moderator approve should accept action"
$script:DefaultHeaders = $studentApprovedHeaders
Wait-Until -Message "moderator approved action to update Reward Ledger" -Attempts 45 -DelaySeconds 2 -Condition {
    $wallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentApproved"
    return $wallet.totalPoints -eq 30
}
$approvedWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentApproved"
Assert-True ($approvedWallet.totalPoints -eq 30) "Approved cleanup should grant 30 points"

Write-Step "Checking daily limit policy"
$dailyMissionId = "MISSION-E2E-DAILY-$runId"
$dailyRule = @{
    actionType = "E2E_DAILY_LIMIT"
    basePoints = 7
    evidenceRequired = $true
    stationRequired = $false
    dailyLimit = 1
    active = $true
}
$script:DefaultHeaders = $adminHeaders
Invoke-Api -Method "PUT" -Uri "$Policy/policies/rules/E2E_DAILY_LIMIT" -Body $dailyRule | Out-Null
Invoke-Api -Method "POST" -Uri "$Gateway/catalog/missions" -Body @{
    id = $dailyMissionId
    title = "E2E Daily Limit Mission"
    actionType = "E2E_DAILY_LIMIT"
    basePoints = 7
    evidenceRequired = $true
    stationRequired = $false
    description = "Temporary active mission used to verify the daily policy limit."
} | Out-Null
Invoke-Api -Method "PUT" -Uri "$Gateway/catalog/missions/$dailyMissionId/status?status=ACTIVE" | Out-Null
$script:DefaultHeaders = $studentDailyHeaders
$dailyFirst = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "daily-first"
    studentId = $studentDaily
    missionId = $dailyMissionId
    stationId = ""
    actionType = "E2E_DAILY_LIMIT"
    evidenceUrl = "https://example.com/evidence/daily-first.jpg"
}
$dailySecond = Invoke-Api -Method "POST" -Uri "$Gateway/actions/submit" -Body @{
    idempotencyKey = New-Key "daily-second"
    studentId = $studentDaily
    missionId = $dailyMissionId
    stationId = ""
    actionType = "E2E_DAILY_LIMIT"
    evidenceUrl = "https://example.com/evidence/daily-second.jpg"
}
Assert-True ($dailyFirst.status -eq "ACCEPTED") "First daily-limited action should be accepted"
Assert-True ($dailySecond.status -eq "REJECTED") "Second daily-limited action should be rejected"
Assert-True ($dailySecond.policyReason -match "Daily limit") "Daily limit rejection should include reason"
Wait-Until -Message "daily-limited first action to update Reward Ledger" -Attempts 45 -DelaySeconds 2 -Condition {
    $wallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentDaily"
    return $wallet.totalPoints -eq 7
}
$dailyWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentDaily"
Assert-True ($dailyWallet.totalPoints -eq 7) "Daily limit should only grant points once"
$script:DefaultHeaders = $adminHeaders
Assert-True ((Get-StatusCode -Method "DELETE" -Uri "$Gateway/catalog/missions/$dailyMissionId") -eq 200) "Daily-limit temp mission should be deleted"

Write-Step "Checking season close, snapshots, certificate generation, and PDF download"
$season = "E2E-SEASON-$runId"
$script:DefaultHeaders = $adminHeaders
$closeFirst = @(Invoke-ApiList -Method "POST" -Uri "$Gateway/leaderboards/seasons/$season/close?type=weekly&winners=500")
$closeSecond = @(Invoke-ApiList -Method "POST" -Uri "$Gateway/leaderboards/seasons/$season/close?type=weekly&winners=500")
$snapshots = @(Invoke-ApiList -Uri "$Gateway/leaderboards/seasons/$season/snapshots")
Assert-True ($closeFirst.Count -eq $closeSecond.Count) "Repeated close should return same winner count"
Assert-True ($snapshots.Count -eq $closeFirst.Count) "Snapshots should not duplicate on repeated close"
$script:DefaultHeaders = $studentAcceptedHeaders
Wait-Until -Message "Recognition to issue season certificate" -Attempts 45 -DelaySeconds 2 -Condition {
    $certs = @(Invoke-ApiList -Uri "$Gateway/recognitions/certificates/user/$studentAccepted")
    $cert = $certs | Where-Object { $_.seasonId -eq $season } | Select-Object -First 1
    return $null -ne $cert
}
$certificates = @(Invoke-ApiList -Uri "$Gateway/recognitions/certificates/user/$studentAccepted")
$certificate = $certificates | Where-Object { $_.seasonId -eq $season } | Select-Object -First 1
Assert-True ($null -ne $certificate) "Recognition should issue certificate for accepted student"
$download = Invoke-WebRequest -Uri "$Gateway/recognitions/certificates/$($certificate.id)/download" -UseBasicParsing
Assert-True ($download.StatusCode -eq 200) "Certificate download should return HTTP 200"
Assert-True ($download.Headers["Content-Type"] -match "application/pdf") "Certificate download should be PDF"
Assert-True ($download.Headers["Content-Disposition"] -match "inline") "Certificate PDF should be previewable inline"
$claim = Invoke-Api -Method "POST" -Uri "$Gateway/recognitions/rewards/reward-cafe/claim" -Body @{
    studentId = $studentAccepted
    rewardName = "Campus Cafe Voucher"
}
Assert-True ($claim.status -eq "ISSUED") "Reward claim should be persisted as ISSUED"
Assert-True ($claim.voucherCode -like "ECO-*") "Reward claim should generate a voucher code"
$claims = @(Invoke-ApiList -Uri "$Gateway/recognitions/rewards/claims/user/$studentAccepted")
Assert-True (Has-ItemWithValue $claims "id" $claim.id) "Student should see persisted reward claims"
Wait-Until -Message "certificate notification" -Attempts 45 -DelaySeconds 2 -Condition {
    $notifications = @(Invoke-ApiList -Uri "$Gateway/notifications")
    return Has-ItemWithValue $notifications "type" "CERTIFICATE_ISSUED"
}

if (-not $SkipDockerChecks) {
    Write-Step "Checking RabbitMQ queues are drained"
    $queues = docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers
    $messageRows = $queues | Select-String -Pattern "^(leaderboard|recognition|reward|notification|report)\."
    foreach ($row in $messageRows) {
        $parts = ($row.ToString() -split "\s+")
        Assert-True ([int]$parts[1] -eq 0) "RabbitMQ queue $($parts[0]) should have 0 pending messages"
        Assert-True ([int]$parts[2] -ge 1) "RabbitMQ queue $($parts[0]) should have a consumer"
    }
}

Write-Host ""
Write-Host "EcoQuest backend smoke test PASSED"
Write-Host "Gateway: $Gateway"
Write-Host "Students: $studentAccepted, $studentRejected, $studentApproved, $studentDaily, $studentCheckin"
Write-Host "Season: $season"
