package id.ac.ui.cs.advprog.backend.repository;

import id.ac.ui.cs.advprog.backend.model.Auction;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuctionRepository extends JpaRepository<Auction, UUID> {

    boolean existsByListingId(UUID listingId);

    @Query("""
        select a
        from Auction a
        order by a.createdAt desc
        """)
    List<Auction> findAllOrderByCreatedAtDesc();

    @Query("""
        select a
        from Auction a
        where a.id = :auctionId
        """)
    Optional<Auction> findSnapshotById(@Param("auctionId") UUID auctionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select a
        from Auction a
        where a.id = :auctionId
        """)
    Optional<Auction> findSnapshotByIdForUpdate(@Param("auctionId") UUID auctionId);
}
