package id.ac.ui.cs.advprog.backend.listing.infrastructure;

import id.ac.ui.cs.advprog.backend.listing.port.ListingAuctionPort;
import id.ac.ui.cs.advprog.backend.listing.port.ListingAuctionSnapshot;
import id.ac.ui.cs.advprog.backend.model.Auction;
import id.ac.ui.cs.advprog.backend.model.AuctionStatus;
import id.ac.ui.cs.advprog.backend.repository.AuctionRepository;
import id.ac.ui.cs.advprog.backend.repository.BidRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class LocalListingAuctionAdapter implements ListingAuctionPort {

    private static final List<AuctionStatus> LIVE_AUCTION_STATUSES = List.of(
        AuctionStatus.DRAFT,
        AuctionStatus.ACTIVE,
        AuctionStatus.EXTENDED
    );
    private static final List<AuctionStatus> COMPLETED_AUCTION_STATUSES = List.of(
        AuctionStatus.CLOSED,
        AuctionStatus.WON,
        AuctionStatus.UNSOLD
    );

    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;

    public LocalListingAuctionAdapter(AuctionRepository auctionRepository, BidRepository bidRepository) {
        this.auctionRepository = auctionRepository;
        this.bidRepository = bidRepository;
    }

    @Override
    public Optional<ListingAuctionSnapshot> findSnapshotByListingId(UUID listingId) {
        return auctionRepository.findByListingId(listingId).map(this::toSnapshot);
    }

    @Override
    public boolean listingHasBids(UUID listingId) {
        return bidRepository.existsByListingId(listingId);
    }

    @Override
    public void closeLiveAuctionForListing(UUID listingId, Instant closedAt) {
        auctionRepository.findByListingId(listingId).ifPresent(auction -> {
            if (LIVE_AUCTION_STATUSES.contains(auction.getStatus())) {
                auction.setStatus(AuctionStatus.CLOSED);
                auction.setClosedAt(closedAt);
                auctionRepository.save(auction);
            }
        });
    }

    @Override
    public long countLiveAuctionsBySellerId(UUID sellerId) {
        return auctionRepository.countByListingSellerIdAndStatusIn(sellerId, LIVE_AUCTION_STATUSES);
    }

    @Override
    public long countCompletedAuctionsBySellerId(UUID sellerId) {
        return auctionRepository.countByListingSellerIdAndStatusIn(sellerId, COMPLETED_AUCTION_STATUSES);
    }

    private ListingAuctionSnapshot toSnapshot(Auction auction) {
        return new ListingAuctionSnapshot(
            auction.getId(),
            auction.getStatus(),
            auction.getStartsAt(),
            auction.getEndsAt(),
            auction.getClosedAt(),
            auction.getStartingPrice(),
            auction.getReservePrice(),
            auction.getMinimumBidIncrement(),
            auction.getDurationMinutes(),
            bidRepository.countByAuctionId(auction.getId())
        );
    }
}
