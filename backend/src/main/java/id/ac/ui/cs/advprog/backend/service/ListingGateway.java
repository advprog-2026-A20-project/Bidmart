package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.ListingBidValidationResponse;
import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.User;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface ListingGateway {

    Listing createAuctionListing(
        String title,
        String description,
        BigDecimal initialPrice,
        User seller,
        Instant createdAt
    );

    void updateCurrentPrice(Listing listing, BigDecimal updatedPrice);

    ListingBidValidationResponse validateListingForBid(UUID listingId);

    void publishCurrentPriceUpdate(UUID listingId, UUID auctionId, BigDecimal latestPrice, Instant updatedAt);
}
