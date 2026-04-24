package id.ac.ui.cs.advprog.listingquery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;

@Getter
@Entity
@Table(name = "auction")
public class Auction {

    @Id
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "listing_id", nullable = false, unique = true)
    private Listing listing;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuctionStatus status;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal startingPrice;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal reservePrice;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal minimumBidIncrement;

    @Column(nullable = false)
    private Long durationMinutes;

    @Column(nullable = false)
    private Instant createdAt;

    @Column
    private Instant startsAt;

    @Column
    private Instant endsAt;

    @Column
    private Instant closedAt;
}
