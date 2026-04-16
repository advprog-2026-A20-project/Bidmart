package id.ac.ui.cs.advprog.backend.dto;

import id.ac.ui.cs.advprog.backend.model.ListingCategory;
import id.ac.ui.cs.advprog.backend.model.ListingStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ListingResponse(
    UUID id,
    String title,
    String description,
    BigDecimal price,
    ListingCategory category,
    UUID sellerId,
    ListingStatus status,
    Instant createdAt,
    Instant updatedAt,
    Instant cancelledAt
) {
}
