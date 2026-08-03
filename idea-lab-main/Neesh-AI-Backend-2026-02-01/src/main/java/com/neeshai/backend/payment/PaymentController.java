package com.neeshai.backend.payment;

import com.neeshai.backend.admin.CouponCode;
import com.neeshai.backend.admin.CouponCodeRepository;
import com.neeshai.backend.user.UserService;
import com.neeshai.backend.user.UserDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);
    private static final double PRO_PLAN_PRICE = 9.99; // USD

    private final CashfreeService cashfreeService;
    private final UserService userService;
    private final CouponCodeRepository couponCodeRepository;
    private final ProcessedWebhookEventRepository processedWebhookEventRepository;

    public PaymentController(CashfreeService cashfreeService, UserService userService,
                             CouponCodeRepository couponCodeRepository,
                             ProcessedWebhookEventRepository processedWebhookEventRepository) {
        this.cashfreeService = cashfreeService;
        this.userService = userService;
        this.couponCodeRepository = couponCodeRepository;
        this.processedWebhookEventRepository = processedWebhookEventRepository;
    }

    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        try {
            UUID userId = UUID.fromString(jwt.getSubject());
            String email = jwt.getClaimAsString("email");
            String name = jwt.getClaimAsString("name");

            double baseAmount = PRO_PLAN_PRICE;
            double finalAmount = baseAmount;
            String couponCode = null;
            int discountPercentage = 0;

            // ── Coupon validation (server-side) ──
            if (request.containsKey("couponCode") && request.get("couponCode") != null) {
                couponCode = request.get("couponCode").toString().trim().toUpperCase();
                if (!couponCode.isEmpty()) {
                    Optional<CouponCode> couponOpt = couponCodeRepository.findByCodeIgnoreCase(couponCode);
                    if (couponOpt.isEmpty()) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Invalid coupon code"));
                    }
                    CouponCode coupon = couponOpt.get();
                    if (!coupon.isValid()) {
                        String reason = !coupon.isActive() ? "Coupon is no longer active"
                                : coupon.getUsedCount() >= coupon.getMaxUses() ? "Coupon usage limit reached"
                                : "Coupon has expired";
                        return ResponseEntity.badRequest().body(Map.of("error", reason));
                    }

                    discountPercentage = coupon.getDiscountPercentage();

                    // Calculate discounted amount carefully
                    BigDecimal base = BigDecimal.valueOf(baseAmount);
                    BigDecimal discount = base.multiply(BigDecimal.valueOf(discountPercentage))
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    finalAmount = base.subtract(discount).setScale(2, RoundingMode.HALF_UP).doubleValue();

                    // Ensure minimum $0.01 (Cashfree won't accept $0)
                    if (finalAmount < 0.01) finalAmount = 0.01;

                    // Increment used count
                    coupon.setUsedCount(coupon.getUsedCount() + 1);
                    couponCodeRepository.save(coupon);

                    log.info("Coupon {} applied for user {}. Discount: {}%, Final: ${}", couponCode, userId, discountPercentage, finalAmount);
                }
            }

            CashfreeOrderResponse response = cashfreeService.createOrder(userId, email, name, finalAmount);

            // Return enriched response with price details
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("payment_session_id", response.getPayment_session_id());
            result.put("order_id", response.getOrder_id());
            result.put("order_status", response.getOrder_status());
            result.put("originalAmount", baseAmount);
            result.put("finalAmount", finalAmount);
            result.put("discountPercentage", discountPercentage);
            result.put("couponApplied", couponCode);
            result.put("currency", "USD");

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error creating payment order: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-status")
    public ResponseEntity<?> verifyPayment(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, String> request) {
        try {
            String orderId = request.get("order_id");
            if (orderId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "order_id is required"));
            }

            boolean isPaid = cashfreeService.verifyPayment(orderId);
            if (isPaid) {
                UUID userId = UUID.fromString(jwt.getSubject());
                String email = jwt.getClaimAsString("email");
                String name = jwt.getClaimAsString("name");
                UserDTO updatedUser = userService.upgradeToPro(userId, email, name);
                log.info("User {} successfully upgraded to PRO after payment verify", userId);
                return ResponseEntity.ok(Map.of("status", "SUCCESS", "user", updatedUser));
            } else {
                return ResponseEntity.ok(Map.of("status", "PENDING_OR_FAILED"));
            }
        } catch (Exception e) {
            log.error("Error verifying payment: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cashfree Webhook Handler (Asynchronous payment callback from Cashfree).
     * Enforces HMAC-SHA256 signature verification at entry before any data mutation.
     * Parses payment status and upgrades user subscription to PRO upon successful payment.
     */
    @PostMapping("/public/webhook")
    public ResponseEntity<?> handleCashfreeWebhook(
            @RequestHeader(value = "x-webhook-signature", required = false) String signature,
            @RequestHeader(value = "x-webhook-timestamp", required = false) String timestamp,
            @RequestBody String rawPayload) {

        log.info("[Cashfree Webhook] Received notification");

        // 1. Mandatory signature verification BEFORE touching any state
        if (signature == null || timestamp == null || !cashfreeService.verifyWebhookSignature(rawPayload, timestamp, signature)) {
            log.warn("[Cashfree Webhook] Signature verification failed. Rejecting request.");
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or missing webhook signature"));
        }

        // 2. Process payload ONLY after signature verification passes
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(rawPayload);

            String status = null;
            String customerIdStr = null;
            String email = null;
            String name = null;
            String orderId = null;
            String eventId = null;

            // Handle standard Cashfree PG v3 webhook format
            if (root.has("data")) {
                com.fasterxml.jackson.databind.JsonNode data = root.get("data");
                if (data.has("order") && data.get("order").has("order_id")) {
                    orderId = data.get("order").get("order_id").asText();
                }
                if (data.has("payment") && data.get("payment").has("payment_status")) {
                    status = data.get("payment").get("payment_status").asText();
                    if (data.get("payment").has("cf_payment_id")) {
                        eventId = "cf_pay_" + data.get("payment").get("cf_payment_id").asText();
                    }
                }
                if (data.has("customer_details")) {
                    com.fasterxml.jackson.databind.JsonNode cust = data.get("customer_details");
                    if (cust.has("customer_id")) customerIdStr = cust.get("customer_id").asText();
                    if (cust.has("customer_email")) email = cust.get("customer_email").asText();
                    if (cust.has("customer_name")) name = cust.get("customer_name").asText();
                }
            } else {
                // Fallback for legacy format
                if (root.has("orderId")) orderId = root.get("orderId").asText();
                if (root.has("txStatus")) status = root.get("txStatus").asText();
                if (root.has("orderStatus")) status = root.get("orderStatus").asText();
                if (root.has("customerId")) customerIdStr = root.get("customerId").asText();
                if (root.has("referenceId")) eventId = "ref_" + root.get("referenceId").asText();
            }

            // Format state-aware unique event identifier for Cashfree webhook notifications
            if (root.has("data") && root.get("data").has("payment") && root.get("data").get("payment").has("cf_payment_id")) {
                eventId = "cf_pay_" + root.get("data").get("payment").get("cf_payment_id").asText() + "_" + (status != null ? status.toUpperCase() : "UNKNOWN");
            } else if (root.has("event_time") && orderId != null) {
                eventId = "evt_" + root.get("event_time").asText() + "_" + orderId + "_" + (status != null ? status.toUpperCase() : "UNKNOWN");
            } else {
                eventId = (orderId != null ? "order_" + orderId : "raw_hash_" + Integer.toHexString(rawPayload.hashCode())) + "_" + (status != null ? status.toUpperCase() : "UNKNOWN");
            }

            boolean isSuccess = "SUCCESS".equalsIgnoreCase(status) || "PAID".equalsIgnoreCase(status)
                    || (root.has("type") && "PAYMENT_SUCCESS_WEBHOOK".equalsIgnoreCase(root.get("type").asText()));

            if (isSuccess && customerIdStr != null) {
                // ATOMIC INSERT-FIRST: Attempt DB save FIRST to enforce uniqueness via DB constraint
                try {
                    processedWebhookEventRepository.saveAndFlush(new ProcessedWebhookEvent(eventId, orderId, java.time.Instant.now()));
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    log.warn("[Cashfree Webhook] Concurrent or duplicate event detected via DB constraint: eventId={}", eventId);
                    return ResponseEntity.ok(Map.of("status", "ALREADY_PROCESSED", "eventId", eventId));
                }

                UUID userId = UUID.fromString(customerIdStr);
                UserDTO updatedUser = userService.upgradeToPro(userId, email, name);
                log.info("[Cashfree Webhook] Verified payment success. Recorded event {} and upgraded user {} to PRO", eventId, userId);
                return ResponseEntity.ok(Map.of("status", "SUCCESS", "userId", userId, "plan", updatedUser.subscriptionPlan()));
            }

            log.info("[Cashfree Webhook] Webhook received but non-success status: {}", status);
            return ResponseEntity.ok(Map.of("status", "IGNORED", "reason", "Non-success status: " + status));

        } catch (Exception e) {
            log.error("[Cashfree Webhook] Error processing payload: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to process webhook payload"));
        }
    }
}
