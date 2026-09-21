# Invoked by backend-smoke-test.ps1 after the baseline scenarios.
Write-Step 'Checking station QR enforcement, dynamic badges and coupon debit workflow'
$script:DefaultHeaders = $adminHeaders
$qr = Invoke-Api -Uri "$Gateway/catalog/stations/STATION-A1/qr"
Assert-True (-not [string]::IsNullOrWhiteSpace($qr.qrToken)) 'Admin can retrieve a printable station token'
foreach ($headers in @($adminHeaders, $moderatorHeaders, $studentMissingStationHeaders)) {
    $lookup = Invoke-ApiWithHeaders -Method POST -Uri "$Gateway/catalog/stations/scan" -Headers $headers -Body @{qrToken=$qr.qrToken}
    Assert-True ($lookup.station.id -eq 'STATION-A1') 'Every role can look up station details by QR'
    Assert-True (@($lookup.missions | Where-Object { $_.id -eq 'MISSION-RECYCLE-01' }).Count -eq 1) 'QR lookup lists assigned active missions'
}
Assert-True ((Get-StatusCode -Method DELETE -Uri "$Gateway/catalog/stations/STATION-A1") -eq 409) 'Station referenced by missions cannot be deleted'
$qrMission = "MISSION-E2E-QR-$runId"
$qrActionType = "E2E_QR_$runId"
$qrBadge = "BADGE-E2E-QR-$runId"
Invoke-Api -Method POST -Uri "$Policy/policies/rules" -Body @{actionType=$qrActionType;basePoints=7;evidenceRequired=$false;stationRequired=$true;dailyLimit=20;active=$true} | Out-Null
$missionBody = @{id=$qrMission;title='E2E QR mission';actionType=$qrActionType;basePoints=7;evidenceRequired=$false;stationRequired=$true;allowedStationIds=@('STATION-A1')}
$invalidMission = $missionBody.Clone(); $invalidMission.allowedStationIds = @()
Assert-ApiError POST "$Gateway/catalog/missions" @{id="MISSION-E2E-INVALID-$runId";title='E2E invalid';basePoints=10} 400 'actionType'
Assert-True ((Get-StatusCode -Method POST -Uri "$Gateway/catalog/missions" -Body $invalidMission) -eq 400) 'Station-required mission needs assignments'
Invoke-Api -Method POST -Uri "$Gateway/catalog/missions" -Body $missionBody | Out-Null
Assert-True ((Get-StatusCode -Method POST -Uri "$Gateway/catalog/missions" -Body $missionBody) -eq 409) 'Duplicate create cannot overwrite a mission'
Invoke-Api -Method PUT -Uri "$Gateway/catalog/missions/$qrMission/status?status=ACTIVE" | Out-Null
$editedMission = Invoke-Api -Method PUT -Uri "$Gateway/catalog/missions/$qrMission" -Body $missionBody
Assert-True ($editedMission.status -eq 'ACTIVE') 'Admin editing a mission without status must preserve its active state'
$badgeBody = @{code=$qrBadge;name='E2E QR achievement';criteriaType='ACTION_COUNT';actionType=$qrActionType;requiredCount=2;requiredPoints=0;active=$true}
Invoke-Api -Method POST -Uri "$Gateway/catalog/badges" -Body $badgeBody | Out-Null
$invalidBadge = $badgeBody.Clone(); $invalidBadge.requiredCount = 0
Assert-True ((Get-StatusCode -Method PUT -Uri "$Gateway/catalog/badges/$qrBadge" -Body $invalidBadge) -eq 400) 'Invalid count badge update must be rejected'
$badgeImage = Invoke-Api -Method POST -Uri "$Gateway/catalog/badges/$qrBadge/image" -Body @{dataUrl='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='}
Assert-True ((Invoke-WebRequest -UseBasicParsing "$Gateway$($badgeImage.imageUrl)").StatusCode -eq 200) 'Badge image stored in Catalog MinIO is accessible'
$script:DefaultHeaders = $studentMissingStationHeaders
Assert-True ((Get-StatusCode -Uri "$Gateway/catalog/stations/STATION-A1/qr") -eq 403) 'Student cannot retrieve printable station secrets by ID'
$body = @{idempotencyKey=(New-Key 'qr-enforcement');studentId=$studentMissingStation;missionId=$qrMission;actionType=$qrActionType;stationId='STATION-A1'}
Assert-True ((Get-StatusCode -Method POST -Uri "$Gateway/actions/submit" -Body $body) -eq 400) 'Correct station ID alone cannot bypass QR scanning'
$wrongQr = Invoke-ApiWithHeaders -Uri "$Gateway/catalog/stations/STATION-B2/qr" -Headers $adminHeaders
Assert-True ((Get-StatusCode -Method POST -Uri "$Gateway/catalog/stations/scan" -Body @{qrToken=$wrongQr.qrToken;missionId=$qrMission}) -eq 400) 'QR of another station cannot satisfy this mission'
Assert-ApiError POST "$Gateway/catalog/stations/scan" @{qrToken=$wrongQr.qrToken;missionId=$qrMission} 400 'station is not assigned'
Assert-ApiError POST "$Gateway/actions/submit" $body 400 'Scan the station QR'
$foreignScan = Invoke-ApiWithHeaders -Method POST -Uri "$Gateway/catalog/stations/scan" -Headers $studentAcceptedHeaders -Body @{qrToken=$qr.qrToken;missionId=$qrMission}
$body.stationScanReceipt = $foreignScan.scanReceipt
Assert-True ((Get-StatusCode -Method POST -Uri "$Gateway/actions/submit" -Body $body) -eq 403) 'Scan receipts are bound to the signed-in account'
$scan = Invoke-Api -Method POST -Uri "$Gateway/catalog/stations/scan" -Body @{qrToken=$qr.qrToken;missionId=$qrMission}
$body.stationScanReceipt = $scan.scanReceipt
$qrFirst = Invoke-Api -Method POST -Uri "$Gateway/actions/submit" -Body $body
Assert-True ($qrFirst.status -eq 'PENDING_REVIEW') 'QR-confirmed action still requires moderator approval'
$body.idempotencyKey = New-Key 'qr-reuse'
Assert-True ((Get-StatusCode -Method POST -Uri "$Gateway/actions/submit" -Body $body) -eq 409) 'A used scan cannot authorize a new submission'
Invoke-ApiWithHeaders -Method PUT -Uri "$Gateway/actions/$($qrFirst.id)/approve" -Headers $moderatorHeaders | Out-Null
$scan = Invoke-Api -Method POST -Uri "$Gateway/catalog/stations/scan" -Body @{qrToken=$qr.qrToken;missionId=$qrMission}
$body.stationScanReceipt = $scan.scanReceipt
$qrSecond = Invoke-Api -Method POST -Uri "$Gateway/actions/submit" -Body $body
Invoke-ApiWithHeaders -Method PUT -Uri "$Gateway/actions/$($qrSecond.id)/approve" -Headers $moderatorHeaders | Out-Null
Wait-Until -Message 'Catalog-defined count badge awarded by Reward projection' -Attempts 45 -DelaySeconds 2 -Condition {
    $achievements = @(Invoke-ApiList -Uri "$Gateway/rewards/wallets/$studentMissingStation/badges")
    return Has-ItemWithValue $achievements 'badgeCode' $qrBadge
}
$qrWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentMissingStation"
Assert-True ($qrWallet.totalPoints -eq 14 -and $qrWallet.availablePoints -eq 14) 'Two approved actions grant 14 points'
$script:DefaultHeaders = $adminHeaders
Invoke-Api -Method DELETE -Uri "$Gateway/catalog/badges/$qrBadge" | Out-Null
$achievements = @(Invoke-ApiList -Uri "$Gateway/rewards/wallets/$studentMissingStation/badges")
Assert-True (Has-ItemWithValue $achievements 'badgeCode' $qrBadge) 'Retiring a definition does not revoke earned badges'
$couponIds = @("reward-e2e-qr-a-$runId", "reward-e2e-qr-b-$runId")
foreach ($id in $couponIds) {
    Invoke-Api -Method POST -Uri "$Gateway/recognitions/rewards" -Body @{id=$id;name='E2E QR coupon';requiredPoints=8;requiredBadges=0;requiredCertificates=0;remainingStock=1;active=$true} | Out-Null
}
$script:DefaultHeaders = $studentMissingStationHeaders
foreach ($id in $couponIds) { Invoke-Api -Method POST -Uri "$Gateway/recognitions/rewards/$id/claim" -Body @{studentId=$studentMissingStation} | Out-Null }
Wait-Until -Message 'coupon decisions against the same spendable balance' -Attempts 45 -DelaySeconds 2 -Condition {
    $script:qrClaims = @(Invoke-ApiList -Uri "$Gateway/recognitions/rewards/claims/user/$studentMissingStation")
    return $script:qrClaims.Count -eq 2 -and @($script:qrClaims | Where-Object { $_.status -eq 'PENDING' }).Count -eq 0
}
Assert-True (@($script:qrClaims | Where-Object { $_.status -eq 'ISSUED' }).Count -eq 1) 'Only one coupon can spend the available 14 points'
Assert-True (@($script:qrClaims | Where-Object { $_.status -eq 'FAILED' }).Count -eq 1) 'Overspending must fail without issuing a voucher'
$qrWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentMissingStation"
Assert-True ($qrWallet.totalPoints -eq 14 -and $qrWallet.availablePoints -eq 6 -and $qrWallet.spentPoints -eq 8) 'Coupon debit does not reduce cumulative points'
$offers = @(Invoke-ApiList -Uri "$Gateway/recognitions/rewards?studentId=$studentMissingStation")
$failed = $script:qrClaims | Where-Object { $_.status -eq 'FAILED' } | Select-Object -First 1
Assert-True (($offers | Where-Object { $_.id -eq $failed.rewardId }).remainingStock -eq 1) 'Failed debit releases reserved stock'
$issued = $script:qrClaims | Where-Object { $_.status -eq 'ISSUED' } | Select-Object -First 1
$again = Invoke-Api -Method POST -Uri "$Gateway/recognitions/rewards/$($issued.rewardId)/claim" -Body @{studentId=$studentMissingStation}
Assert-True ($again.id -eq $issued.id) 'Retry returns the same issued claim'
$qrWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentMissingStation"
Assert-True ($qrWallet.availablePoints -eq 6) 'Claim retry cannot charge points again'
$script:DefaultHeaders = $adminHeaders
Write-Step 'Checking a zero-cost coupon for a student without point grants'
$freeCoupon = "reward-e2e-free-$runId"
Invoke-Api -Method POST -Uri "$Gateway/recognitions/rewards" -Body @{id=$freeCoupon;name='E2E welcome coupon';requiredPoints=0;requiredBadges=0;requiredCertificates=0;remainingStock=1;active=$true} | Out-Null
$script:DefaultHeaders = $studentUnsupportedHeaders
$freeClaim = Invoke-Api -Method POST -Uri "$Gateway/recognitions/rewards/$freeCoupon/claim" -Body @{studentId=$studentUnsupported}
Wait-Until -Message 'zero-cost coupon issued without an existing funded wallet' -Attempts 30 -DelaySeconds 2 -Condition {
    $freeClaims = @(Invoke-ApiList -Uri "$Gateway/recognitions/rewards/claims/user/$studentUnsupported")
    return @($freeClaims | Where-Object { $_.id -eq $freeClaim.id -and $_.status -eq 'ISSUED' }).Count -eq 1
}
$freeWallet = Invoke-Api -Uri "$Gateway/rewards/wallets/$studentUnsupported"
Assert-True ($freeWallet.totalPoints -eq 0 -and $freeWallet.availablePoints -eq 0) 'A free coupon does not change points'
$script:DefaultHeaders = $adminHeaders
Write-Step 'QR, dynamic badge and spendable coupon cases PASSED'
