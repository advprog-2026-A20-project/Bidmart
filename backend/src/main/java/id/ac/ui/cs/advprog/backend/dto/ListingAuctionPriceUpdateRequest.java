package id.ac.ui.cs.advprog.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ListingAuctionPriceUpdateRequest(
    @NotNull(message = "Current price is required")
    @DecimalMin(value = "0.01", message = "Current price must be positive")
    BigDecimal currentPrice
) {
}
