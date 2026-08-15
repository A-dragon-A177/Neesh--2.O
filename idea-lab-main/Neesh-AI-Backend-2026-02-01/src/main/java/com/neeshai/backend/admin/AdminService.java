package com.neeshai.backend.admin;

import com.neeshai.backend.project.ProjectRepository;
import com.neeshai.backend.promotion.PromotionService;
import com.neeshai.backend.user.User;
import com.neeshai.backend.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // Token expiry: 1 hour
    private static final long TOKEN_TTL_MS = 3_600_000L;
    // Brute-force protection: max 5 failed attempts, lockout for 15 minutes
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MS = 900_000L;

    @Value("${admin.master.username:Admin@neeshi.ai}")
    private String masterAdminUsername;

    @Value("${admin.master.password}")
    private String masterAdminPassword;

    // Hashed master password (computed at init)
    private String masterAdminPasswordHash;

    private final AdminRoleRepository adminRoleRepository;
    private final CouponCodeRepository couponCodeRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PromotionService promotionService;

    // Token store with expiry timestamps
    private final ConcurrentHashMap<String, TokenEntry> activeTokens = new ConcurrentHashMap<>();
    // Failed login attempt tracking
    private final ConcurrentHashMap<String, FailedLoginTracker> failedAttempts = new ConcurrentHashMap<>();

    private record TokenEntry(String username, long expiresAt) {
        boolean isExpired() { return System.currentTimeMillis() > expiresAt; }
    }

    private static class FailedLoginTracker {
        int attempts = 0;
        long lockedUntil = 0;
    }

    public AdminService(AdminRoleRepository adminRoleRepository,
                        CouponCodeRepository couponCodeRepository,
                        UserRepository userRepository,
                        ProjectRepository projectRepository,
                        PromotionService promotionService) {
        this.adminRoleRepository = adminRoleRepository;
        this.couponCodeRepository = couponCodeRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.promotionService = promotionService;
    }

    @PostConstruct
    public void initMasterAdmin() {
        // Hash the master admin password at startup so we never compare plaintext
        this.masterAdminPasswordHash = passwordEncoder.encode(masterAdminPassword);

        // Ensure master admin exists in DB
        if (!adminRoleRepository.existsByUsername(masterAdminUsername)) {
            AdminRole master = new AdminRole(
                    masterAdminUsername,
                    passwordEncoder.encode(masterAdminPassword),
                    "Super Admin"
            );
            adminRoleRepository.save(master);
            log.info("Master admin role created: {}", masterAdminUsername);
        }
    }

    // --- Authentication ---

    public Optional<AdminDTOs.AdminLoginResponse> authenticate(String username, String password) {
        String normalizedUsername = username.toLowerCase();

        // Check brute-force lockout
        FailedLoginTracker tracker = failedAttempts.get(normalizedUsername);
        if (tracker != null && tracker.lockedUntil > System.currentTimeMillis()) {
            long remainingSecs = (tracker.lockedUntil - System.currentTimeMillis()) / 1000;
            log.warn("Admin login blocked for {} - account locked for {} more seconds", username, remainingSecs);
            return Optional.empty();
        }

        // Check master admin (using BCrypt, not plaintext comparison)
        boolean isMasterAuth = masterAdminUsername.equalsIgnoreCase(username)
                && passwordEncoder.matches(password, masterAdminPasswordHash);

        if (isMasterAuth) {
            clearFailedAttempts(normalizedUsername);
            String token = generateToken(username);
            return Optional.of(new AdminDTOs.AdminLoginResponse(token, "Super Admin"));
        }

        // Check DB roles
        Optional<AdminDTOs.AdminLoginResponse> dbAuth = adminRoleRepository.findByUsername(username)
                .filter(role -> passwordEncoder.matches(password, role.getPasswordHash()))
                .map(role -> {
                    clearFailedAttempts(normalizedUsername);
                    String token = generateToken(username);
                    return new AdminDTOs.AdminLoginResponse(token, role.getDisplayName());
                });

        if (dbAuth.isEmpty()) {
            recordFailedAttempt(normalizedUsername);
        }

        return dbAuth;
    }

    public boolean validateToken(String token) {
        if (token == null) return false;
        TokenEntry entry = activeTokens.get(token);
        if (entry == null) return false;
        if (entry.isExpired()) {
            activeTokens.remove(token);
            return false;
        }
        return true;
    }

    private String generateToken(String username) {
        String token = UUID.randomUUID().toString();
        activeTokens.put(token, new TokenEntry(username, System.currentTimeMillis() + TOKEN_TTL_MS));
        return token;
    }

    private void recordFailedAttempt(String username) {
        FailedLoginTracker tracker = failedAttempts.computeIfAbsent(username, k -> new FailedLoginTracker());
        tracker.attempts++;
        if (tracker.attempts >= MAX_FAILED_ATTEMPTS) {
            tracker.lockedUntil = System.currentTimeMillis() + LOCKOUT_DURATION_MS;
            log.warn("Admin account {} locked after {} failed attempts", username, tracker.attempts);
        }
    }

    private void clearFailedAttempts(String username) {
        failedAttempts.remove(username);
    }

    /** Cleanup expired tokens and stale lockout entries every 10 minutes */
    @Scheduled(fixedRate = 600_000)
    public void cleanupExpiredTokensAndLockouts() {
        long now = System.currentTimeMillis();
        activeTokens.entrySet().removeIf(e -> e.getValue().isExpired());
        failedAttempts.entrySet().removeIf(e -> e.getValue().lockedUntil > 0 && e.getValue().lockedUntil < now);
    }

    // --- Admin Roles ---

    @Transactional
    public AdminDTOs.AdminRoleDTO createAdminRole(AdminDTOs.CreateRoleRequest request) {
        if (adminRoleRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already exists: " + request.username());
        }
        AdminRole role = new AdminRole(
                request.username(),
                passwordEncoder.encode(request.password()),
                request.displayName()
        );
        AdminRole saved = adminRoleRepository.save(role);
        log.info("Admin role created: {}", request.username());
        return AdminDTOs.AdminRoleDTO.fromEntity(saved);
    }

    public List<AdminDTOs.AdminRoleDTO> getAllAdminRoles() {
        return adminRoleRepository.findAll().stream()
                .map(AdminDTOs.AdminRoleDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteAdminRole(UUID id) {
        adminRoleRepository.findById(id).ifPresent(role -> {
            if (masterAdminUsername.equalsIgnoreCase(role.getUsername())) {
                throw new IllegalArgumentException("Cannot delete the master admin role");
            }
            adminRoleRepository.deleteById(id);
            log.info("Admin role deleted: {}", role.getUsername());
        });
    }

    // --- Users ---

    public List<AdminDTOs.AdminUserDTO> getAllUsersWithStats() {
        List<User> users = userRepository.findAll();
        return users.stream().map(this::mapToAdminUserDTO).collect(Collectors.toList());
    }

    public com.neeshai.backend.util.PageResponse<AdminDTOs.AdminUserDTO> getAllUsersWithStats(org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<User> usersPage = userRepository.findAll(pageable);
        return com.neeshai.backend.util.PageResponse.from(usersPage.map(this::mapToAdminUserDTO));
    }

    private AdminDTOs.AdminUserDTO mapToAdminUserDTO(User user) {
        long projectCount = projectRepository.findByOwnerId(user.getId()).size();
        String plan = user.getSubscriptionPlan() != null ? user.getSubscriptionPlan() : "FREE";
        String displayPlan = plan.substring(0, 1).toUpperCase() + plan.substring(1).toLowerCase();
        long promotedBlogCount = promotionService.getPromotionCountForUser(user.getId());
        List<String> promotionTags = promotionService.getTagsForUser(user.getId());
        return new AdminDTOs.AdminUserDTO(
                user.getId(), user.getEmail(), user.getName(), user.getStatus(),
                user.getOccupation(), user.getPhone(), user.getLocation(), user.getProfileImageUrl(),
                user.getCreatedAt(), user.getUpdatedAt(), projectCount, displayPlan,
                promotedBlogCount, promotionTags, user.getSubscriptionExpiresAt()
        );
    }

    // --- Coupons ---

    @Transactional
    public AdminDTOs.CouponDTO createCoupon(AdminDTOs.CreateCouponRequest request) {
        String code = request.code() != null ? request.code().trim().toUpperCase() : "";
        if (code.isEmpty()) {
            throw new IllegalArgumentException("Coupon code cannot be empty.");
        }
        if (couponCodeRepository.existsByCode(code)) {
            throw new IllegalArgumentException("Coupon code already exists: " + code);
        }
        CouponCode coupon = new CouponCode(
                code,
                request.name(),
                request.discountPercentage(),
                request.expiryDate(),
                request.maxUses()
        );
        CouponCode saved = couponCodeRepository.save(coupon);
        log.info("Coupon created: {} ({}% off)", request.code(), request.discountPercentage());
        return AdminDTOs.CouponDTO.fromEntity(saved);
    }

    public List<AdminDTOs.CouponDTO> getAllCoupons() {
        return couponCodeRepository.findAll().stream()
                .map(AdminDTOs.CouponDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public com.neeshai.backend.util.PageResponse<AdminDTOs.CouponDTO> getAllCoupons(org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<CouponCode> couponPage = couponCodeRepository.findAll(pageable);
        return com.neeshai.backend.util.PageResponse.from(couponPage.map(AdminDTOs.CouponDTO::fromEntity));
    }

    @Transactional
    public void deleteCoupon(UUID id) {
        couponCodeRepository.deleteById(id);
        log.info("Coupon deleted: {}", id);
    }

    public AdminDTOs.ValidateCouponResponse validateCoupon(String code) {
        if (code == null || code.trim().isEmpty()) {
            return new AdminDTOs.ValidateCouponResponse(false, 0, "Invalid coupon code.");
        }
        String cleanCode = code.trim().toUpperCase();
        return couponCodeRepository.findByCodeIgnoreCase(cleanCode)
                .map(coupon -> {
                    if (!coupon.isActive()) {
                        return new AdminDTOs.ValidateCouponResponse(false, 0, "This coupon has been deactivated.");
                    }
                    if (coupon.getExpiryDate() != null && coupon.getExpiryDate().isBefore(java.time.ZonedDateTime.now())) {
                        return new AdminDTOs.ValidateCouponResponse(false, 0, "This coupon has expired.");
                    }
                    if (coupon.getUsedCount() >= coupon.getMaxUses()) {
                        return new AdminDTOs.ValidateCouponResponse(false, 0, "This coupon has reached its maximum usage limit.");
                    }
                    return new AdminDTOs.ValidateCouponResponse(true, coupon.getDiscountPercentage(),
                            "Coupon valid! " + coupon.getDiscountPercentage() + "% discount applied.");
                })
                .orElse(new AdminDTOs.ValidateCouponResponse(false, 0, "Invalid coupon code."));
    }

    @Transactional
    public boolean applyCoupon(String code) {
        if (code == null) return false;
        return couponCodeRepository.findByCodeIgnoreCase(code.trim().toUpperCase())
                .filter(CouponCode::isValid)
                .map(coupon -> {
                    coupon.setUsedCount(coupon.getUsedCount() + 1);
                    couponCodeRepository.save(coupon);
                    return true;
                })
                .orElse(false);
    }
}
