package com.ecoquest.identity;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/auth")
class IdentityController {
    private final IdentityService identityService;
    private final IdentityMediaStorage mediaStorage;

    IdentityController(IdentityService identityService, IdentityMediaStorage mediaStorage) {
        this.identityService = identityService;
        this.mediaStorage = mediaStorage;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return identityService.register(request);
    }

    @PostMapping("/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return identityService.login(request);
    }

    @PostMapping("/forgot-password")
    ForgotPasswordResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return identityService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    ResetPasswordResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return identityService.resetPassword(request);
    }

    @PostMapping("/verify-email")
    VerifyEmailResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return identityService.verifyEmail(request);
    }

    @PostMapping("/resend-verification")
    ForgotPasswordResponse resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        return identityService.resendVerification(request);
    }

    @GetMapping("/me")
    UserProfile me(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return identityService.me(authorization);
    }

    @PutMapping("/me/profile")
    UserProfile updateProfile(@RequestHeader(name = "Authorization", required = false) String authorization,
                              @RequestBody UpdateProfileRequest request) {
        return identityService.updateProfile(authorization, request);
    }

    @PostMapping("/me/avatar")
    UserProfile uploadAvatar(@RequestHeader(name = "Authorization", required = false) String authorization,
                             @RequestBody UploadAvatarRequest request) {
        return identityService.uploadAvatar(authorization, request);
    }

    @GetMapping("/media/avatars/{objectKey}")
    ResponseEntity<InputStreamResource> avatar(@PathVariable String objectKey) {
        return mediaStorage.download(objectKey);
    }

    @GetMapping("/users")
    List<UserProfile> users(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return identityService.listUsers(authorization);
    }

    @PutMapping("/users/{id}/role")
    UserProfile updateUserRole(@RequestHeader(name = "Authorization", required = false) String authorization,
                               @PathVariable String id,
                               @Valid @RequestBody UpdateUserRoleRequest request) {
        return identityService.updateUserRole(authorization, id, request);
    }

    @PutMapping("/users/{id}/status")
    UserProfile updateUserStatus(@RequestHeader(name = "Authorization", required = false) String authorization,
                                 @PathVariable String id,
                                 @Valid @RequestBody UpdateUserStatusRequest request) {
        return identityService.updateUserStatus(authorization, id, request);
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteBannedUser(@RequestHeader(name = "Authorization", required = false) String authorization,
                          @PathVariable String id) {
        identityService.deleteBannedUser(authorization, id);
    }
}
