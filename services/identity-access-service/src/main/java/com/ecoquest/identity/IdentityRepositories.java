package com.ecoquest.identity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

interface UserAccountRepository extends JpaRepository<UserAccount, String> {
    Optional<UserAccount> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByStudentIdIgnoreCase(String studentId);
}

interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {
    Optional<PasswordResetToken> findFirstByTokenHashAndUsedAtIsNull(String tokenHash);
}

interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, String> {
    Optional<EmailVerificationToken> findFirstByTokenHashAndUsedAtIsNull(String tokenHash);
}
