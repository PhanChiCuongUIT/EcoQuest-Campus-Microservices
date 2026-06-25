package com.ecoquest.identity;

import jakarta.transaction.Transactional;
import com.ecoquest.messaging.events.UserStatusChangedEvent;
import com.ecoquest.messaging.events.UserRegisteredEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
class IdentityService {
    private final UserAccountRepository users;
    private final PasswordResetTokenRepository resetTokens;
    private final EmailVerificationTokenRepository verificationTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final UserAccountMapper userMapper;
    private final IdentityMailService mailService;
    private final IdentityMediaStorage mediaStorage;
    private final RabbitTemplate rabbit;
    private final long resetTokenTtlMinutes;
    private final long verificationTokenTtlMinutes;

    IdentityService(
            UserAccountRepository users,
            PasswordResetTokenRepository resetTokens,
            EmailVerificationTokenRepository verificationTokens,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            UserAccountMapper userMapper,
            IdentityMailService mailService,
            IdentityMediaStorage mediaStorage,
            RabbitTemplate rabbit,
            @Value("${identity.reset-token-ttl-minutes}") long resetTokenTtlMinutes,
            @Value("${identity.verification-token-ttl-minutes:1440}") long verificationTokenTtlMinutes
    ) {
        this.users = users;
        this.resetTokens = resetTokens;
        this.verificationTokens = verificationTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.userMapper = userMapper;
        this.mailService = mailService;
        this.mediaStorage = mediaStorage;
        this.rabbit = rabbit;
        this.resetTokenTtlMinutes = resetTokenTtlMinutes;
        this.verificationTokenTtlMinutes = verificationTokenTtlMinutes;
    }

    @Transactional
    AuthResponse register(RegisterRequest request) {
        var email = normalizeEmail(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered.");
        }
        var studentId = normalizeStudentId(request.studentId());
        if (StringUtils.hasText(studentId) && users.existsByStudentIdIgnoreCase(studentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Student ID is already registered.");
        }
        if (!StringUtils.hasText(studentId)) {
            studentId = generateStudentId();
        }

        var now = Instant.now();
        var user = new UserAccount();
        user.id = UUID.randomUUID().toString();
        user.email = email;
        user.passwordHash = passwordEncoder.encode(request.password());
        user.displayName = request.displayName().trim();
        user.role = UserRole.STUDENT;
        user.status = UserStatus.INACTIVE;
        user.studentId = studentId;
        user.active = false;
        user.emailVerified = false;
        user.createdAt = now;
        user.updatedAt = now;
        users.save(user);
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.USER_REGISTERED,
                new UserRegisteredEvent(UUID.randomUUID().toString(), Instant.now(), user.id, user.email,
                        user.displayName, user.role.name(), user.studentId));
        var token = createVerificationToken(user);
        mailService.sendVerification(user.email, user.displayName, token.rawToken());
        return new AuthResponse(null, "Bearer", 0, userMapper.toProfile(user), token.rawToken(),
                "Verification email generated. Verify email before login.");
    }

    AuthResponse login(LoginRequest request) {
        var user = users.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));
        if (!passwordEncoder.matches(request.password(), user.passwordHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }
        if (!user.emailVerified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Email must be verified before login.");
        }
        if (user.status == UserStatus.BANNED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Account is banned." + statusReasonSuffix(user.statusReason));
        }
        if (user.status == UserStatus.INACTIVE || !user.active) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Account is inactive." + statusReasonSuffix(user.statusReason));
        }
        return toAuthResponse(user);
    }

    private String statusReasonSuffix(String reason) {
        return reason == null || reason.isBlank() ? "" : " Reason: " + reason.trim();
    }

    @Transactional
    ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        var maybeUser = users.findByEmailIgnoreCase(normalizeEmail(request.email()));
        if (maybeUser.isEmpty() || maybeUser.get().status == UserStatus.BANNED) {
            return new ForgotPasswordResponse(false, "If the email exists, a reset link has been generated.", null, null);
        }

        var rawToken = UUID.randomUUID() + "-" + UUID.randomUUID();
        var expiresAt = Instant.now().plus(resetTokenTtlMinutes, ChronoUnit.MINUTES);
        var token = new PasswordResetToken();
        token.id = UUID.randomUUID().toString();
        token.userId = maybeUser.get().id;
        token.tokenHash = sha256(rawToken);
        token.expiresAt = expiresAt;
        token.createdAt = Instant.now();
        resetTokens.save(token);
        mailService.sendPasswordReset(maybeUser.get().email, maybeUser.get().displayName, rawToken);

        return new ForgotPasswordResponse(
                true,
                "Password reset link generated and emailed when SMTP is enabled.",
                rawToken,
                expiresAt
        );
    }

    @Transactional
    ResetPasswordResponse resetPassword(ResetPasswordRequest request) {
        var tokenHash = sha256(request.resetToken());
        var token = resetTokens.findFirstByTokenHashAndUsedAtIsNull(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid reset token."));
        if (Instant.now().isAfter(token.expiresAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token expired.");
        }
        var user = users.findById(token.userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token user not found."));
        user.passwordHash = passwordEncoder.encode(request.newPassword());
        user.updatedAt = Instant.now();
        token.usedAt = Instant.now();
        users.save(user);
        resetTokens.save(token);
        return new ResetPasswordResponse("Password reset successfully.");
    }

    @Transactional
    VerifyEmailResponse verifyEmail(VerifyEmailRequest request) {
        var token = verificationTokens.findFirstByTokenHashAndUsedAtIsNull(sha256(request.verificationToken()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification token."));
        if (Instant.now().isAfter(token.expiresAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification token expired.");
        }
        var user = users.findById(token.userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification token user not found."));
        user.emailVerified = true;
        user.status = UserStatus.ACTIVE;
        user.active = true;
        user.updatedAt = Instant.now();
        token.usedAt = Instant.now();
        users.save(user);
        verificationTokens.save(token);
        return new VerifyEmailResponse("Email verified successfully.", userMapper.toProfile(user));
    }

    @Transactional
    ForgotPasswordResponse resendVerification(ResendVerificationRequest request) {
        var maybeUser = users.findByEmailIgnoreCase(normalizeEmail(request.email()));
        if (maybeUser.isEmpty() || maybeUser.get().emailVerified) {
            return new ForgotPasswordResponse(false, "If verification is required, an email has been generated.", null, null);
        }
        var token = createVerificationToken(maybeUser.get());
        mailService.sendVerification(maybeUser.get().email, maybeUser.get().displayName, token.rawToken());
        return new ForgotPasswordResponse(true, "Verification email generated.", token.rawToken(), token.expiresAt());
    }

    UserProfile me(String bearerToken) {
        var userId = jwtTokenService.readSubject(bearerToken);
        var user = users.findById(userId)
                .filter(account -> account.active && account.status == UserStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not active."));
        return userMapper.toProfile(user);
    }

    @Transactional
    UserProfile updateProfile(String bearerToken, UpdateProfileRequest request) {
        var user = requireCurrentUser(bearerToken);
        if (StringUtils.hasText(request.displayName())) {
            user.displayName = request.displayName().trim();
        }
        if (request.avatarUrl() != null) {
            user.avatarUrl = request.avatarUrl().trim();
        }
        user.updatedAt = Instant.now();
        users.save(user);
        return userMapper.toProfile(user);
    }

    @Transactional
    UserProfile uploadAvatar(String bearerToken, UploadAvatarRequest request) {
        var user = requireCurrentUser(bearerToken);
        user.avatarUrl = mediaStorage.uploadAvatar(request);
        user.updatedAt = Instant.now();
        users.save(user);
        return userMapper.toProfile(user);
    }

    List<UserProfile> listUsers(String bearerToken) {
        requireAdmin(bearerToken);
        return users.findAll().stream().map(userMapper::toProfile).toList();
    }

    List<ReportTargetUser> reportTargetUsers(String bearerToken) {
        requireCurrentUser(bearerToken);
        return users.findAll().stream()
                .filter(account -> account.active && account.status == UserStatus.ACTIVE)
                .map(account -> new ReportTargetUser(account.id, account.email, account.displayName,
                        account.role.name(), account.studentId, account.avatarUrl))
                .toList();
    }

    @Transactional
    UserProfile updateUserRole(String bearerToken, String userId, UpdateUserRoleRequest request) {
        var admin = requireAdmin(bearerToken);
        rejectSelfMutation(admin, userId, "Admins cannot change their own role.");
        var user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user.role = parseRole(request.role());
        if ((user.role == UserRole.STUDENT || user.role == UserRole.MODERATOR) && !StringUtils.hasText(user.studentId)) {
            user.studentId = generateStudentId();
        }
        user.updatedAt = Instant.now();
        users.save(user);
        return userMapper.toProfile(user);
    }

    @Transactional
    UserProfile updateUserStatus(String bearerToken, String userId, UpdateUserStatusRequest request) {
        var admin = requireAdmin(bearerToken);
        rejectSelfMutation(admin, userId, "Admins cannot change their own status.");
        var user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user.status = parseStatus(request.status());
        user.active = user.status == UserStatus.ACTIVE;
        user.statusReason = request.reason();
        user.updatedAt = Instant.now();
        users.save(user);
        mailService.sendStatusChanged(user.email, user.displayName, user.status, request.reason(),
                admin.email, admin.displayName);
        rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.USER_STATUS_CHANGED,
                new UserStatusChangedEvent(UUID.randomUUID().toString(), Instant.now(), user.id, user.email,
                        user.displayName, user.role.name(), user.studentId, user.status.name(), request.reason()));
        return userMapper.toProfile(user);
    }

    @Transactional
    void deleteBannedUser(String bearerToken, String userId) {
        var admin = requireAdmin(bearerToken);
        rejectSelfMutation(admin, userId, "Admins cannot delete their own account.");
        var user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        if (user.status != UserStatus.BANNED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only banned users can be deleted.");
        }
        users.delete(user);
    }

    AuthResponse toAuthResponse(UserAccount user) {
        return new AuthResponse(jwtTokenService.createAccessToken(user), "Bearer", jwtTokenService.ttlSeconds(),
                userMapper.toProfile(user), null, "Login successful.");
    }

    private UserAccount requireCurrentUser(String bearerToken) {
        var userId = jwtTokenService.readSubject(bearerToken);
        return users.findById(userId)
                .filter(account -> account.active && account.status == UserStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not active."));
    }

    private UserAccount requireAdmin(String bearerToken) {
        var user = requireCurrentUser(bearerToken);
        if (user.role != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role is required.");
        }
        return user;
    }

    private UserRole parseRole(String role) {
        try {
            return UserRole.valueOf(role.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role.");
        }
    }

    private UserStatus parseStatus(String status) {
        try {
            return UserStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status.");
        }
    }

    private void rejectSelfMutation(UserAccount admin, String userId, String message) {
        if (admin.id.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, message);
        }
    }

    private VerificationToken createVerificationToken(UserAccount user) {
        var rawToken = UUID.randomUUID() + "-" + UUID.randomUUID();
        var expiresAt = Instant.now().plus(verificationTokenTtlMinutes, ChronoUnit.MINUTES);
        var token = new EmailVerificationToken();
        token.id = UUID.randomUUID().toString();
        token.userId = user.id;
        token.tokenHash = sha256(rawToken);
        token.expiresAt = expiresAt;
        token.createdAt = Instant.now();
        verificationTokens.save(token);
        return new VerificationToken(rawToken, expiresAt);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeStudentId(String studentId) {
        return StringUtils.hasText(studentId) ? studentId.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String generateStudentId() {
        String studentId;
        do {
            studentId = "SV" + (100000 + Math.abs(UUID.randomUUID().hashCode() % 900000));
        } while (users.existsByStudentIdIgnoreCase(studentId));
        return studentId;
    }

    private String sha256(String rawToken) {
        try {
            var digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not hash reset token.", ex);
        }
    }

    private record VerificationToken(String rawToken, Instant expiresAt) {
    }
}
