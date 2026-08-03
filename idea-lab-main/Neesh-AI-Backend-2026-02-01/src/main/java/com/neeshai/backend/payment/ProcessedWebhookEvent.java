package com.neeshai.backend.payment;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processed_webhook_events", uniqueConstraints = {
    @UniqueConstraint(name = "uk_processed_webhook_event_id", columnNames = {"event_id"})
})
public class ProcessedWebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id", nullable = false, unique = true)
    private String eventId;

    @Column(name = "order_id")
    private String orderId;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    public ProcessedWebhookEvent() {}

    public ProcessedWebhookEvent(String eventId, String orderId, Instant processedAt) {
        this.eventId = eventId;
        this.orderId = orderId;
        this.processedAt = processedAt;
    }

    public UUID getId() { return id; }
    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
}
