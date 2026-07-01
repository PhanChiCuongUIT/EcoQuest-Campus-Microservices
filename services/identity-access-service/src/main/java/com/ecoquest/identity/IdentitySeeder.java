package com.ecoquest.identity;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
class IdentitySeeder implements CommandLineRunner {
    private static final String DEMO_PASSWORD = "EcoQuest@123";

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;

    IdentitySeeder(UserAccountRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seed("student@ecoquest.local", "EcoQuest Student", UserRole.STUDENT, "SV001");
        seed("student2@ecoquest.local", "Nguyen Minh Anh", UserRole.STUDENT, "SV002");
        seed("student3@ecoquest.local", "Tran Bao Chau", UserRole.STUDENT, "SV003");
        seed("student4@ecoquest.local", "Le Quang Huy", UserRole.STUDENT, "SV004");
        seed("student5@ecoquest.local", "Pham Gia Han", UserRole.STUDENT, "SV005");
        seed("student6@ecoquest.local", "Do Nhat Linh", UserRole.STUDENT, "SV006");
        seed("student7@ecoquest.local", "Hoang Nam Phuong", UserRole.STUDENT, "SV007");
        seed("student8@ecoquest.local", "Vu Thanh Dat", UserRole.STUDENT, "SV008");
        seed("student9@ecoquest.local", "Bui Khanh Linh", UserRole.STUDENT, "SV009");
        seed("student10@ecoquest.local", "Dang Minh Khoi", UserRole.STUDENT, "SV010");
        seed("moderator@ecoquest.local", "EcoQuest Moderator", UserRole.MODERATOR, "SVMOD001");
        seed("admin@ecoquest.local", "EcoQuest Admin", UserRole.ADMIN, null);
    }

    private void seed(String email, String displayName, UserRole role, String studentId) {
        if (users.existsByEmailIgnoreCase(email)) {
            users.findByEmailIgnoreCase(email).ifPresent(existing -> {
                existing.role = role;
                if (studentId != null && (existing.studentId == null || existing.studentId.isBlank())) {
                    existing.studentId = studentId;
                }
                if (existing.status == null) {
                    existing.status = UserStatus.ACTIVE;
                }
                existing.active = existing.status == UserStatus.ACTIVE;
                existing.emailVerified = true;
                existing.updatedAt = Instant.now();
                users.save(existing);
            });
            return;
        }
        var now = Instant.now();
        var user = new UserAccount();
        user.id = UUID.randomUUID().toString();
        user.email = email;
        user.passwordHash = passwordEncoder.encode(DEMO_PASSWORD);
        user.displayName = displayName;
        user.role = role;
        user.status = UserStatus.ACTIVE;
        user.studentId = studentId;
        user.active = true;
        user.emailVerified = true;
        user.createdAt = now;
        user.updatedAt = now;
        users.save(user);
    }
}
