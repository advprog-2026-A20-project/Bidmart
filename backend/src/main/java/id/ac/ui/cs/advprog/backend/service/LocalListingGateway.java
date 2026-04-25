package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class LocalListingGateway implements ListingGateway {

    private final ListingRepository listingRepository;

    public LocalListingGateway(ListingRepository listingRepository) {
        this.listingRepository = listingRepository;
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
}
