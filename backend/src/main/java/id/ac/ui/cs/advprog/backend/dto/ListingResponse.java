package id.ac.ui.cs.advprog.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ListingResponse(
    UUID id,
    String title,
    String description,
    BigDecimal price,
    UUID sellerId,
    Instant createdAt
) {
}
