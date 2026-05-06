package id.ac.ui.cs.advprog.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AuctionListingCreateRequest(
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be at most 255 characters")
    String title,
    @NotBlank(message = "Description is required")
    @Size(max = 2000, message = "Description must be at most 2000 characters")
    String description,
    @NotNull(message = "Initial price is required")
    @DecimalMin(value = "0.01", message = "Initial price must be positive")
    BigDecimal initialPrice,
    @NotNull(message = "Seller id is required")
    UUID sellerId,
    Instant createdAt
) {
}
