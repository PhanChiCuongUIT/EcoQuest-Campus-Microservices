package com.ecoquest.identity;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
class IdentityMailService {
    private final ObjectProvider<JavaMailSender> mailSender;
    private final boolean enabled;
    private final String from;
    private final String frontendBaseUrl;

    IdentityMailService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${identity.mail.enabled:false}") boolean enabled,
            @Value("${identity.mail.from:no-reply@ecoquest.local}") String from,
            @Value("${identity.frontend-base-url:http://localhost:3000}") String frontendBaseUrl
    ) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/$", "");
    }

    void sendVerification(String email, String displayName, String token) {
        send(email, "Verify your EcoQuest account",
                "Hi %s,\n\nVerify your EcoQuest account by opening this link:\n%s/verify-email?token=%s\n\nIf you did not register, ignore this email."
                        .formatted(displayName, frontendBaseUrl, token));
    }

    void sendPasswordReset(String email, String displayName, String token) {
        send(email, "Reset your EcoQuest password",
                "Hi %s,\n\nReset your EcoQuest password by opening this link:\n%s/reset-password?token=%s\n\nIf you did not request this, ignore this email."
                        .formatted(displayName, frontendBaseUrl, token));
    }

    void sendStatusChanged(String email, String displayName, UserStatus status, String reason) {
        send(email, "Your EcoQuest account status changed",
                "Hi %s,\n\nYour EcoQuest account status is now %s.%s"
                        .formatted(displayName, status.name(),
                                StringUtils.hasText(reason) ? "\nReason: " + reason : ""));
    }

    private void send(String to, String subject, String body) {
        if (!enabled) {
            return;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            return;
        }
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        sender.send(message);
    }
}
