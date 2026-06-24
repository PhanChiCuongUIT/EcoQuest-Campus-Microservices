ALTER TABLE user_accounts
    ADD COLUMN IF NOT EXISTS status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS status_reason TEXT;

UPDATE user_accounts
SET status = CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END
WHERE status IS NULL;

UPDATE user_accounts
SET email_verified = TRUE
WHERE email_verified IS NULL;

ALTER TABLE user_accounts
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN email_verified SET NOT NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_email_verification_token_hash
    ON email_verification_tokens (token_hash);
