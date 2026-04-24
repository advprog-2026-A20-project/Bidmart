package id.ac.ui.cs.advprog.listingquery.repository;

import id.ac.ui.cs.advprog.listingquery.model.Auction;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuctionRepository extends JpaRepository<Auction, UUID> {
    Optional<Auction> findByListingId(UUID listingId);
}
