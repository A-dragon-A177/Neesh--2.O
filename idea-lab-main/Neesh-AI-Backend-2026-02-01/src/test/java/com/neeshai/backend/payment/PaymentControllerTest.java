package com.neeshai.backend.payment;

import com.neeshai.backend.user.User;
import com.neeshai.backend.user.UserDTO;
import com.neeshai.backend.user.UserService;
import com.neeshai.backend.admin.CouponCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentControllerTest {

    private CashfreeService cashfreeService;
    private UserService userService;
    private CouponCodeRepository couponCodeRepository;
    private ProcessedWebhookEventRepository processedWebhookEventRepository;
    private PaymentController paymentController;

    @BeforeEach
    void setUp() {
        cashfreeService = mock(CashfreeService.class);
        userService = mock(UserService.class);
        couponCodeRepository = mock(CouponCodeRepository.class);
        processedWebhookEventRepository = mock(ProcessedWebhookEventRepository.class);

        paymentController = new PaymentController(
                cashfreeService, userService, couponCodeRepository, processedWebhookEventRepository
        );

        when(cashfreeService.verifyWebhookSignature(anyString(), anyString(), anyString())).thenReturn(true);
    }

    @Test
    void handleCashfreeWebhook_AtomicInsertFirst_FirstCallSucceeds_DuplicateReturnsAlreadyProcessed() {
        String rawPayload = """
                {
                  "data": {
                    "order": { "order_id": "order_test_99" },
                    "payment": { "cf_payment_id": "1423412", "payment_status": "SUCCESS" },
                    "customer_details": { "customer_id": "d564fa72-c288-466d-88f2-2bbdf19a6b18" }
                  }
                }
                """;

        UUID userId = UUID.fromString("d564fa72-c288-466d-88f2-2bbdf19a6b18");
        User user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setName("Test User");
        user.setSubscriptionPlan("PRO");
        UserDTO userDTO = UserDTO.fromEntity(user);

        // First call: saveAndFlush succeeds
        when(processedWebhookEventRepository.saveAndFlush(any(ProcessedWebhookEvent.class)))
                .thenReturn(new ProcessedWebhookEvent("cf_pay_1423412_SUCCESS", "order_test_99", Instant.now()));
        when(userService.upgradeToPro(eq(userId), any(), any())).thenReturn(userDTO);

        ResponseEntity<?> response1 = paymentController.handleCashfreeWebhook("sig", "1700000000", rawPayload);
        assertEquals(HttpStatus.OK, response1.getStatusCode());
        assertTrue(response1.getBody().toString().contains("SUCCESS"));

        // Verify upgradeToPro called ONCE
        verify(userService, times(1)).upgradeToPro(eq(userId), any(), any());

        // Second call: duplicate throws DataIntegrityViolationException (DB unique constraint violation)
        when(processedWebhookEventRepository.saveAndFlush(any(ProcessedWebhookEvent.class)))
                .thenThrow(new DataIntegrityViolationException("Unique constraint violation: uk_processed_webhook_event_id"));

        ResponseEntity<?> response2 = paymentController.handleCashfreeWebhook("sig", "1700000000", rawPayload);
        assertEquals(HttpStatus.OK, response2.getStatusCode());
        assertTrue(response2.getBody().toString().contains("ALREADY_PROCESSED"));

        // Verify upgradeToPro was NOT called a second time
        verify(userService, times(1)).upgradeToPro(eq(userId), any(), any());
    }
}
