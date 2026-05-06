package id.ac.ui.cs.advprog.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AuctionListingCreateRequest(
    String title,
    String description,
    BigDecimal initialPrice,
    UUID sellerId,
    Instant createdAt
) {
}
