package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.User;
import java.math.BigDecimal;
import java.time.Instant;

public interface ListingGateway {

    Listing createAuctionListing(
        String title,
        String description,
        BigDecimal initialPrice,
        User seller,
        Instant createdAt
    );

    void updateCurrentPrice(Listing listing, BigDecimal updatedPrice);
}
