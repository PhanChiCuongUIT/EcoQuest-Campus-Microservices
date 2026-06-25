package com.ecoquest.identity;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;

@Service
class IdentityMailService {
    private static final String LOGO_CID = "ecoquestLogo";
    private static final ClassPathResource EMAIL_LOGO = new ClassPathResource("email/ecoquest-logo.png");

    private final ObjectProvider<JavaMailSender> mailSender;
    private final boolean enabled;
    private final String from;
    private final String frontendBaseUrl;
    private final String supportEmail;

    IdentityMailService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${identity.mail.enabled:false}") boolean enabled,
            @Value("${identity.mail.from:no-reply@ecoquest.local}") String from,
            @Value("${identity.frontend-base-url:http://localhost:3000}") String frontendBaseUrl,
            @Value("${identity.support-email:cuong26.16.8@gmail.com}") String supportEmail
    ) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.from = from;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/$", "");
        this.supportEmail = supportEmail;
    }

    void sendVerification(String email, String displayName, String token) {
        var link = "%s/verify-email?token=%s".formatted(frontendBaseUrl, token);
        send(email, "Verify your EcoQuest account",
                "Confirm your EcoQuest Campus account",
                "Verify your email",
                "Hi %s, welcome to EcoQuest Campus. Confirm your email before signing in so your student account can start submitting sustainability missions."
                        .formatted(escape(displayName)),
                link,
                "If you did not register for EcoQuest Campus, you can safely ignore this email.");
    }

    void sendPasswordReset(String email, String displayName, String token) {
        var link = "%s/reset-password?token=%s".formatted(frontendBaseUrl, token);
        send(email, "Reset your EcoQuest password",
                "Reset your EcoQuest password",
                "Reset password",
                "Hi %s, we received a request to reset your EcoQuest Campus password. Open the secure link below and choose a new password."
                        .formatted(escape(displayName)),
                link,
                "If you did not request this reset, ignore this email and your password will remain unchanged.");
    }

    void sendStatusChanged(String email, String displayName, UserStatus status, String reason,
                           String adminEmail, String adminDisplayName) {
        var reasonText = StringUtils.hasText(reason) ? reason.trim() : "No reason was provided by the administrator.";
        var adminName = StringUtils.hasText(adminDisplayName) ? adminDisplayName.trim() : "campus administrator";
        var adminContact = StringUtils.hasText(adminEmail) ? adminEmail.trim() : supportEmail;
        var supportText = status == UserStatus.ACTIVE
                ? "Your account is active. You can sign in and continue using EcoQuest Campus."
                : "If you think this change is incorrect, contact %s at %s or email %s for support."
                        .formatted(escape(adminName), escape(adminContact), escape(supportEmail));
        send(email, "Your EcoQuest account status changed",
                "Account status changed to " + status.name(),
                "Open EcoQuest",
                "Hi %s, your EcoQuest Campus account status is now <strong>%s</strong>.<br><br><strong>Reason:</strong> %s<br><br>%s"
                        .formatted(escape(displayName), status.name(), escape(reasonText), escape(supportText)),
                frontendBaseUrl,
                "This message was sent because an administrator changed your account status.");
    }

    private void send(String to, String subject, String headline, String actionLabel,
                      String bodyHtml, String actionUrl, String footerNote) {
        if (!enabled) {
            return;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            return;
        }
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(toPlainText(headline, bodyHtml, actionUrl, footerNote),
                    htmlTemplate(headline, actionLabel, bodyHtml, actionUrl, footerNote));
            if (EMAIL_LOGO.exists()) {
                helper.addInline(LOGO_CID, EMAIL_LOGO, "image/png");
            }
            sender.send(message);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not send EcoQuest email.", ex);
        }
    }

    private String htmlTemplate(String headline, String actionLabel, String bodyHtml, String actionUrl, String footerNote) {
        return """
                <!doctype html>
                <html>
                <body style="margin:0;background:#f3f7f1;font-family:Arial,Helvetica,sans-serif;color:#143326;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f3f7f1;padding:28px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce8df;border-radius:18px;overflow:hidden;box-shadow:0 14px 35px rgba(13,71,54,0.12);">
                          <tr>
                            <td style="background:#0d4736;padding:26px 28px;text-align:center;">
                              <img src="cid:%s" width="92" height="92" alt="EcoQuest Campus logo" style="display:block;width:92px;height:92px;object-fit:contain;margin:0 auto 12px;border-radius:20px;background:#ffffff;padding:8px;">
                              <div style="font-size:12px;color:#d8f3e2;margin:0 0 6px;">EcoQuest Campus</div>
                              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.3px;">EcoQuest Campus</div>
                              <div style="font-size:13px;color:#bde8cf;margin-top:4px;">Sustainability mission platform</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:30px 32px;">
                              <h1 style="font-size:22px;line-height:1.25;margin:0 0 16px;color:#123828;">%s</h1>
                              <p style="font-size:15px;line-height:1.65;margin:0 0 24px;color:#38594a;">%s</p>
                              <p style="text-align:center;margin:30px 0;">
                                <a href="%s" style="display:inline-block;background:#1c7c54;color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:13px 22px;">%s</a>
                              </p>
                              <p style="font-size:12px;line-height:1.6;color:#6b8074;margin:0;">If the button does not work, copy this link:<br><a href="%s" style="color:#1c7c54;word-break:break-all;">%s</a></p>
                            </td>
                          </tr>
                          <tr>
                            <td style="background:#f8fbf7;border-top:1px solid #e6eee8;padding:18px 32px;font-size:12px;line-height:1.6;color:#6b8074;">
                              %s<br>
                              Support: <a href="mailto:%s" style="color:#1c7c54;">%s</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(LOGO_CID, escape(headline), bodyHtml, escapeAttribute(actionUrl),
                escape(actionLabel), escapeAttribute(actionUrl), escape(actionUrl), escape(footerNote),
                escapeAttribute(supportEmail), escape(supportEmail));
    }

    private String toPlainText(String headline, String bodyHtml, String actionUrl, String footerNote) {
        return "%s%n%n%s%n%n%s%n%n%s%nSupport: %s".formatted(
                headline,
                bodyHtml.replaceAll("<[^>]*>", "").replace("&nbsp;", " "),
                actionUrl,
                footerNote,
                supportEmail);
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String escapeAttribute(String value) {
        return escape(value).replace("`", "&#96;");
    }
}
