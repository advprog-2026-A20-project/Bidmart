package id.ac.ui.cs.advprog.listingquery.repository;

import id.ac.ui.cs.advprog.listingquery.model.Listing;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ListingRepository extends JpaRepository<Listing, UUID>, JpaSpecificationExecutor<Listing> {
}
