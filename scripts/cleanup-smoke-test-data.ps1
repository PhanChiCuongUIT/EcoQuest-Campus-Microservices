param(
    [switch]$SkipRabbitMqCheck
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "[EcoQuest Cleanup] $Message"
}

function Exec-Postgres {
    param(
        [string]$Container,
        [string]$Database,
        [string]$Sql
    )
    docker exec $Container psql -U ecoquest -d $Database -v ON_ERROR_STOP=1 -c $Sql
    if ($LASTEXITCODE -ne 0) { throw "Cleanup failed for $Database; stopped before further deletes." }
}

$testUserIds = @(docker exec microservices-se361-identity-db-1 psql -U ecoquest -d identity_db -At -c "SELECT id FROM user_accounts WHERE email LIKE 'e2e-%@ecoquest.local' OR student_id LIKE 'SV_E2E%' OR student_id LIKE 'SV_AUTH%'")
if ($LASTEXITCODE -ne 0) { throw 'Could not collect E2E user IDs; no data has been removed.' }
$testUserSql = (@($testUserIds | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { "'$($_.Replace("'", "''"))'" }) -join ',')
if (-not $testUserSql) { $testUserSql = 'NULL' }
Write-Step "Cleaning station scan receipts owned by E2E users"
Exec-Postgres "microservices-se361-catalog-db-1" "catalog_db" "DELETE FROM station_scan_receipt WHERE user_id IN ($testUserSql);"

Write-Step "Cleaning Identity E2E users/tokens"
Exec-Postgres "microservices-se361-identity-db-1" "identity_db" @"
WITH e2e_users AS (
    SELECT id
    FROM user_accounts
    WHERE email LIKE 'e2e-%@ecoquest.local'
       OR student_id LIKE 'SV_E2E%'
       OR student_id LIKE 'SV_AUTH%'
)
DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM e2e_users);
WITH e2e_users AS (
    SELECT id
    FROM user_accounts
    WHERE email LIKE 'e2e-%@ecoquest.local'
       OR student_id LIKE 'SV_E2E%'
       OR student_id LIKE 'SV_AUTH%'
)
DELETE FROM email_verification_tokens WHERE user_id IN (SELECT id FROM e2e_users);
DELETE FROM user_accounts
WHERE email LIKE 'e2e-%@ecoquest.local'
   OR student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%';
"@

Write-Step "Cleaning Catalog temporary missions/stations/badges"
Exec-Postgres "microservices-se361-catalog-db-1" "catalog_db" @"
DELETE FROM station_scan_receipt WHERE mission_id LIKE 'MISSION-E2E%' OR submission_key ILIKE '%e2e%';
DELETE FROM mission_allowed_station_ids WHERE mission_id IN (SELECT id FROM mission WHERE id LIKE 'MISSION-E2E%' OR action_type LIKE 'E2E_%');
DELETE FROM mission
WHERE id LIKE 'MISSION-E2E%'
   OR action_type LIKE 'E2E_%';
DELETE FROM green_station
WHERE id LIKE 'STATION-E2E%';
DELETE FROM badge_definition
WHERE code LIKE 'BADGE-E2E%';
"@

Write-Step "Cleaning Policy temporary E2E rules"
Exec-Postgres "microservices-se361-policy-db-1" "policy_db" @"
DELETE FROM policy_rule
WHERE action_type LIKE 'E2E_%';
"@

Write-Step "Cleaning Action MongoDB E2E actions/outbox"
$mongoCleanup = @'
const studentPattern = /^(SV_E2E|SV_AUTH)/;
const missionPattern = /^MISSION-E2E/;
const actionPattern = /^E2E_/;
const actionDelete = db.eco_actions.deleteMany({
  $or: [
    { studentId: studentPattern },
    { missionId: missionPattern },
    { actionType: actionPattern }
  ]
});
const outboxDelete = db.action_outbox.deleteMany({
  $where: function () {
    const payload = this.payload || {};
    return /^(SV_E2E|SV_AUTH)/.test(payload.studentId || null)
      || /^MISSION-E2E/.test(payload.missionId || null)
      || /^E2E_/.test(payload.actionType || null)
      || /^E2E-SEASON/.test(payload.seasonId || null);
  }
});
printjson({ eco_actions_deleted: actionDelete.deletedCount, action_outbox_deleted: outboxDelete.deletedCount });
'@
docker exec microservices-se361-action-db-1 mongosh action_db --quiet --eval $mongoCleanup

Write-Step "Cleaning Reward Ledger E2E wallets/transactions/badges"
Exec-Postgres "microservices-se361-reward-db-1" "reward_db" @"
DELETE FROM coupon_debit_record WHERE student_id LIKE 'SV_E2E%' OR student_id LIKE 'SV_AUTH%';
DELETE FROM badge_rule_projection WHERE code LIKE 'BADGE-E2E%';
DELETE FROM reward_transaction
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%'
   OR source_action_id IN (
      SELECT source_action_id FROM reward_transaction WHERE source_action_id LIKE '%E2E%'
   )
   OR mission_id LIKE 'MISSION-E2E%'
   OR action_type LIKE 'E2E_%';
DELETE FROM badge_achievement
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%';
DELETE FROM reward_wallet
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%';
"@

Write-Step "Cleaning Leaderboard E2E snapshots"
Exec-Postgres "microservices-se361-leaderboard-db-1" "leaderboard_db" @"
DELETE FROM leaderboard_snapshot
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%'
   OR season_id LIKE 'E2E-SEASON%';
"@

Write-Step "Cleaning Recognition E2E certificates/claims/profiles/offers"
$testCertificateIds = @(docker exec microservices-se361-recognition-db-1 psql -U ecoquest -d recognition_db -At -c "SELECT id FROM certificate_record WHERE season_id LIKE 'E2E-SEASON%'")
if ($LASTEXITCODE -ne 0) { throw 'Could not collect test certificate IDs.' }
$testCertificateSql = (@($testCertificateIds | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { "'$($_.Replace("'", "''"))'" }) -join ',')
if (-not $testCertificateSql) { $testCertificateSql = 'NULL' }
Exec-Postgres "microservices-se361-recognition-db-1" "recognition_db" @"
UPDATE student_recognition_profile AS profile
SET certificate_count = GREATEST(0, profile.certificate_count - removed.total)
FROM (SELECT student_id, COUNT(*)::integer AS total FROM certificate_record
      WHERE season_id LIKE 'E2E-SEASON%' GROUP BY student_id) AS removed
WHERE profile.student_id = removed.student_id;
UPDATE reward_offer
SET remaining_stock = remaining_stock + (
    SELECT COUNT(*)
    FROM reward_claim
    WHERE reward_claim.reward_id = reward_offer.id
      AND status <> 'FAILED'
      AND (student_id LIKE 'SV_E2E%' OR student_id LIKE 'SV_AUTH%')
)
WHERE id IN (
    SELECT reward_id
    FROM reward_claim
    WHERE student_id LIKE 'SV_E2E%' OR student_id LIKE 'SV_AUTH%'
);
DELETE FROM reward_claim
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%'
   OR reward_id LIKE 'reward-e2e%';
DELETE FROM certificate_record
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%'
   OR season_id LIKE 'E2E-SEASON%';
DELETE FROM student_recognition_profile
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%';
DELETE FROM reward_offer
WHERE id LIKE 'reward-e2e%';
"@

Write-Step "Cleaning Report workflow and analytics E2E rows"
Exec-Postgres "microservices-se361-report-db-1" "report_db" @"
DELETE FROM user_report
WHERE reporter_student_id LIKE 'SV_E2E%'
   OR reporter_student_id LIKE 'SV_AUTH%'
   OR target_id LIKE 'SV_E2E%'
   OR target_id LIKE 'SV_AUTH%'
   OR target_id LIKE 'MISSION-E2E%'
   OR target_id LIKE 'ACT-E2E%'
   OR reason ILIKE '%E2E%'
   OR evidence_url ILIKE '%E2E%';
DELETE FROM action_analytics_record
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%'
   OR mission_id LIKE 'MISSION-E2E%'
   OR action_type LIKE 'E2E_%'
   OR source_action_id LIKE '%E2E%';
DELETE FROM badge_analytics_record
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%'
   OR badge_code LIKE 'BADGE-E2E%';
DELETE FROM certificate_analytics_record
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%'
   OR certificate_id IN ($testCertificateSql)
   OR certificate_id IN (
      SELECT certificate_id FROM certificate_analytics_record WHERE certificate_id LIKE '%E2E%'
   );
DELETE FROM mission_analytics_record
WHERE mission_id LIKE 'MISSION-E2E%';
DELETE FROM student_reward_snapshot
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%';
DELETE FROM user_analytics_record
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%';
"@

Write-Step "Cleaning Notification E2E rows"
Exec-Postgres "microservices-se361-notification-db-1" "notification_db" @"
DELETE FROM user_notification
WHERE student_id LIKE 'SV_E2E%'
   OR student_id LIKE 'SV_AUTH%'
   OR title ILIKE '%E2E%'
   OR message ILIKE '%E2E%'
   OR link ILIKE '%E2E%';
"@

Write-Step "Cleaning Redis E2E draft/idempotency/leaderboard keys"
$redisKeys = @(docker exec microservices-se361-redis-1 redis-cli --scan --pattern "*E2E*") + @(docker exec microservices-se361-redis-1 redis-cli --scan --pattern "*SV_AUTH*")
if ($redisKeys) {
    foreach ($key in $redisKeys) {
        docker exec microservices-se361-redis-1 redis-cli DEL $key | Out-Null
    }
    Write-Host "Deleted Redis keys: $($redisKeys.Count)"
} else {
    Write-Host "Deleted Redis keys: 0"
}

$removedLeaderboardMembers = 0
$leaderboardKeys = docker exec microservices-se361-redis-1 redis-cli --scan --pattern "ecoquest:leaderboard:*"
foreach ($key in @($leaderboardKeys)) {
    if ([string]::IsNullOrWhiteSpace($key) -or $key -notmatch '^ecoquest:leaderboard:(weekly|monthly)(:|$)') {
        continue
    }
    $members = docker exec microservices-se361-redis-1 redis-cli ZRANGE $key 0 -1
    foreach ($member in @($members)) {
        if ($member -match "^(SV_E2E|SV_AUTH)") {
            docker exec microservices-se361-redis-1 redis-cli ZREM $key $member | Out-Null
            $removedLeaderboardMembers++
        }
    }
}
Write-Host "Deleted Redis leaderboard E2E members: $removedLeaderboardMembers"

if (-not $SkipRabbitMqCheck) {
    Write-Step "Checking RabbitMQ queues after cleanup"
    docker exec microservices-se361-rabbitmq-1 rabbitmqctl list_queues name messages consumers
}

Write-Host ""
Write-Host "EcoQuest smoke-test data cleanup finished."
Write-Host "Seed/demo data and manual UI data without E2E/SV_AUTH prefixes were kept."
