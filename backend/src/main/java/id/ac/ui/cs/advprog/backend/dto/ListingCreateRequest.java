package id.ac.ui.cs.advprog.backend.dto;

import java.math.BigDecimal;

public record ListingCreateRequest(
    String title,
    String description,
    BigDecimal price
) {
}
