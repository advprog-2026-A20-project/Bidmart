package id.ac.ui.cs.advprog.backend.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record WalletHoldRequest(
    UUID userId,
    UUID auctionId,
    BigDecimal amount
) {
}
