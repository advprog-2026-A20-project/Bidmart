package id.ac.ui.cs.advprog.backend.listing.infrastructure;

import id.ac.ui.cs.advprog.backend.listing.port.ListingSellerDirectory;
import id.ac.ui.cs.advprog.backend.listing.port.ListingSellerSnapshot;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class LocalListingSellerDirectory implements ListingSellerDirectory {

    private final UserRepository userRepository;

    public LocalListingSellerDirectory(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Optional<ListingSellerSnapshot> findSeller(UUID sellerId) {
        return userRepository.findById(sellerId)
            .map(user -> new ListingSellerSnapshot(user.getId(), user.getEmail(), user.getRole()));
    }
}
