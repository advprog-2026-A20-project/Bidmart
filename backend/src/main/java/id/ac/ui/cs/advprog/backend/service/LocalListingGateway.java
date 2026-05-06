package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.AuctionListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotDto;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotStatus;
import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.ListingStatus;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@ConditionalOnProperty(name = "bidmart.services.mode", havingValue = "local", matchIfMissing = true)
public class LocalListingGateway implements ListingGateway {

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;

    public LocalListingGateway(ListingRepository listingRepository, UserRepository userRepository) {
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
    }

    @Override
    public ListingSnapshotDto createAuctionListing(AuctionListingCreateRequest request) {
        User seller = userRepository.findById(request.sellerId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        Listing listing = Listing.builder()
            .title(request.title())
            .description(request.description())
            .price(request.initialPrice())
            .seller(seller)
            .status(ListingStatus.ACTIVE)
            .createdAt(request.createdAt())
            .build();
        return toSnapshot(listingRepository.save(listing));
    }

    @Override
    public ListingSnapshotDto getListingSnapshot(UUID listingId) {
        return listingRepository.findById(listingId)
            .map(this::toSnapshot)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
    }

    @Override
    public void updateAuctionPrice(UUID listingId, BigDecimal updatedPrice) {
        Listing listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        listing.setPrice(updatedPrice);
        listingRepository.save(listing);
    }

    private ListingSnapshotDto toSnapshot(Listing listing) {
        return new ListingSnapshotDto(
            listing.getId(),
            listing.getSeller().getId(),
            listing.getSeller().getEmail(),
            listing.getTitle(),
            listing.getDescription(),
            listing.getPrice(),
            ListingSnapshotStatus.valueOf(listing.getStatus().name())
        );
    }
}
