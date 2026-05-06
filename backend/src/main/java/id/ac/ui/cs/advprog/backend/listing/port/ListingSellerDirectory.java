package id.ac.ui.cs.advprog.backend.listing.port;

import java.util.Optional;
import java.util.UUID;

public interface ListingSellerDirectory {
    Optional<ListingSellerSnapshot> findSeller(UUID sellerId);
}
