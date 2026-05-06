package id.ac.ui.cs.advprog.backend.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ListingSnapshotDto(
    UUID id,
    UUID sellerId,
    String sellerEmail,
    String title,
    String description,
    BigDecimal currentPrice,
    ListingSnapshotStatus status
) {
}
