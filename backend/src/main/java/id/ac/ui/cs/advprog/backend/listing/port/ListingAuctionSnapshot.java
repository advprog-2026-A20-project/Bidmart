package id.ac.ui.cs.advprog.backend.listing.port;

import id.ac.ui.cs.advprog.backend.model.AuctionStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ListingAuctionSnapshot(
    UUID id,
    AuctionStatus status,
    Instant startsAt,
    Instant endsAt,
    Instant closedAt,
    BigDecimal startingPrice,
    BigDecimal reservePrice,
    BigDecimal minimumBidIncrement,
    Long durationMinutes,
    long totalBids
) {
    public boolean acceptsBids() {
        return status == AuctionStatus.ACTIVE || status == AuctionStatus.EXTENDED;
    }
}
