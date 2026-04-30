package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.ListingBidValidationResponse;
import id.ac.ui.cs.advprog.backend.model.Auction;
import id.ac.ui.cs.advprog.backend.model.AuctionStatus;
import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.ListingStatus;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.AuctionRepository;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LocalListingGateway implements ListingGateway {

    private final ListingRepository listingRepository;
    private final AuctionRepository auctionRepository;
    private final InMemoryListingPriceUpdateQueue listingPriceUpdateQueue;

    public LocalListingGateway(
        ListingRepository listingRepository,
        AuctionRepository auctionRepository,
        InMemoryListingPriceUpdateQueue listingPriceUpdateQueue
    ) {
        this.listingRepository = listingRepository;
        this.auctionRepository = auctionRepository;
        this.listingPriceUpdateQueue = listingPriceUpdateQueue;
    }

    @Override
    public Listing createAuctionListing(
        String title,
        String description,
        BigDecimal initialPrice,
        User seller,
        Instant createdAt
    ) {
        Listing listing = Listing.builder()
            .title(title)
            .description(description)
            .price(initialPrice)
            .seller(seller)
            .createdAt(createdAt)
            .build();
        return listingRepository.save(listing);
    }

    @Override
    public void updateCurrentPrice(Listing listing, BigDecimal updatedPrice) {
        listing.setPrice(updatedPrice);
    }

    @Override
    public ListingBidValidationResponse validateListingForBid(UUID listingId) {
        Listing listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        Auction auction = auctionRepository.findByListingId(listingId).orElse(null);

        boolean active = listing.getStatus() == ListingStatus.ACTIVE;
        if (!active) {
            return new ListingBidValidationResponse(
                listing.getId(),
                false,
                false,
                "Listing is no longer active",
                listing.getStatus(),
                auction == null ? null : auction.getStatus(),
                auction == null ? null : auction.getEndsAt()
            );
        }

        if (auction == null) {
            return new ListingBidValidationResponse(
                listing.getId(),
                true,
                false,
                "Listing is not attached to an auction",
                listing.getStatus(),
                null,
                null
            );
        }

        boolean biddable = auction.getStatus() == AuctionStatus.ACTIVE || auction.getStatus() == AuctionStatus.EXTENDED;
        return new ListingBidValidationResponse(
            listing.getId(),
            true,
            biddable,
            biddable ? "Listing is valid for bidding" : "Auction is not accepting bids",
            listing.getStatus(),
            auction.getStatus(),
            auction.getEndsAt()
        );
    }

    @Override
    public void publishCurrentPriceUpdate(UUID listingId, UUID auctionId, BigDecimal latestPrice, Instant updatedAt) {
        listingPriceUpdateQueue.publish(new ListingPriceUpdateMessage(listingId, auctionId, latestPrice, updatedAt));
    }
}
