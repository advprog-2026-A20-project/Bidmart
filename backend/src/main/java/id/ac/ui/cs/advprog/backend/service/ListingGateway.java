package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.AuctionListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotDto;
import java.math.BigDecimal;
import java.util.UUID;

public interface ListingGateway {

    ListingSnapshotDto createAuctionListing(AuctionListingCreateRequest request);

    ListingSnapshotDto getListingSnapshot(UUID listingId);

    void updateAuctionPrice(UUID listingId, BigDecimal updatedPrice);
}
