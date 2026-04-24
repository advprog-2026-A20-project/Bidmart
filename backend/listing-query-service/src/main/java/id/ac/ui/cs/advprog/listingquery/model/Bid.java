package id.ac.ui.cs.advprog.listingquery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;

@Getter
@Entity
@Table(name = "bid")
public class Bid {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "auction_id", nullable = false)
    private Auction auction;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;
}
