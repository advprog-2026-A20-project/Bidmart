package id.ac.ui.cs.advprog.backend.listing.port;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ListingAuctionPort {
    Optional<ListingAuctionSnapshot> findSnapshotByListingId(UUID listingId);

    boolean listingHasBids(UUID listingId);

    void closeLiveAuctionForListing(UUID listingId, Instant closedAt);

    long countLiveAuctionsBySellerId(UUID sellerId);

    long countCompletedAuctionsBySellerId(UUID sellerId);
}
