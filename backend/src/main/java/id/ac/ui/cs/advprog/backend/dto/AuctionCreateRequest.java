package id.ac.ui.cs.advprog.backend.dto;

import java.math.BigDecimal;

public record AuctionCreateRequest(
    String title,
    String description,
    BigDecimal startingPrice,
    BigDecimal reservePrice,
    BigDecimal minimumBidIncrement,
    Long durationMinutes,
    Boolean activateNow
) {
}

