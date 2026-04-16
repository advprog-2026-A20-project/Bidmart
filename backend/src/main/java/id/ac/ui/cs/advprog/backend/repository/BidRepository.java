package id.ac.ui.cs.advprog.backend.repository;

import id.ac.ui.cs.advprog.backend.model.Bid;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BidRepository extends JpaRepository<Bid, UUID> {
    boolean existsByListingId(UUID listingId);
}
