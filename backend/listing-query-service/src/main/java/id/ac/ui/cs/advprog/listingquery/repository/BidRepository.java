package id.ac.ui.cs.advprog.listingquery.repository;

import id.ac.ui.cs.advprog.listingquery.model.Bid;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BidRepository extends JpaRepository<Bid, UUID> {

    @Query("""
        select count(b)
        from Bid b
        where b.auction.id = :auctionId
        """)
    long countByAuctionId(@Param("auctionId") UUID auctionId);
}
