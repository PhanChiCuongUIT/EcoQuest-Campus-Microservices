package com.ecoquest.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

enum UserRole {
    STUDENT,
    MODERATOR,
    ADMIN
}

enum UserStatus {
    ACTIVE,
    INACTIVE,
    BANNED
}

@Entity
@Table(
        name = "user_accounts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_accounts_email", columnNames = "email"),
                @UniqueConstraint(name = "uk_user_accounts_student_id", columnNames = "studentId")
        }
)
class UserAccount {
    @Id
    public String id;

    @Column(nullable = false)
    public String email;

    @Column(nullable = false)
    public String passwordHash;

    @Column(nullable = false)
    public String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public UserStatus status;

    public String studentId;
    public boolean active;
    public boolean emailVerified;
    public String avatarUrl;
    public String statusReason;
    public Instant createdAt;
    public Instant updatedAt;
}

@Entity
@Table(
        name = "password_reset_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uk_password_reset_token_hash", columnNames = "tokenHash")
)
class PasswordResetToken {
    @Id
    public String id;

    @Column(nullable = false)
    public String userId;

    @Column(nullable = false)
    public String tokenHash;

    @Column(nullable = false)
    public Instant expiresAt;

    public Instant usedAt;
    public Instant createdAt;
}

@Entity
@Table(
        name = "email_verification_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uk_email_verification_token_hash", columnNames = "tokenHash")
)
class EmailVerificationToken {
    @Id
    public String id;

    @Column(nullable = false)
    public String userId;

    @Column(nullable = false)
    public String tokenHash;

    @Column(nullable = false)
    public Instant expiresAt;

    public Instant usedAt;
    public Instant createdAt;
}

record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, max = 128) String password,
        @NotBlank String displayName,
        String studentId
) {
}

record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
}

record ForgotPasswordRequest(@Email @NotBlank String email) {
}

record ResetPasswordRequest(@NotBlank String resetToken, @NotBlank @Size(min = 8, max = 128) String newPassword) {
}

record VerifyEmailRequest(@NotBlank String verificationToken) {
}

record ResendVerificationRequest(@Email @NotBlank String email) {
}

record UpdateProfileRequest(String displayName, String avatarUrl) {
}

record UploadAvatarRequest(String fileName, String contentType, String dataUrl, String base64) {
}

record UpdateUserRoleRequest(@NotBlank String role) {
}

record UpdateUserStatusRequest(@NotBlank String status, String reason) {
}

record AuthResponse(String accessToken, String tokenType, long expiresInSeconds, UserProfile user,
                    String verificationToken, String message) {
}

record UserProfile(String id, String email, String displayName, String role, String studentId,
                   String status, boolean emailVerified, String avatarUrl) {
}

record ForgotPasswordResponse(boolean emailKnown, String message, String resetToken, Instant expiresAt) {
}

record VerifyEmailResponse(String message, UserProfile user) {
}

record ResetPasswordResponse(String message) {
}
