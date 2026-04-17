package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.AuctionCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.AuctionDetailResponse;
import id.ac.ui.cs.advprog.backend.dto.BidPlaceRequest;
import id.ac.ui.cs.advprog.backend.model.Auction;
import id.ac.ui.cs.advprog.backend.model.AuctionStatus;
import id.ac.ui.cs.advprog.backend.model.Bid;
import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.ListingCategory;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.AuctionEventRepository;
import id.ac.ui.cs.advprog.backend.repository.AuctionRepository;
import id.ac.ui.cs.advprog.backend.repository.BidRepository;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "security.jwt.secret=test-secret-please-change-32-chars",
    "security.jwt.expiration-seconds=3600"
})
@ActiveProfiles("test")
@Import(AuctionServiceTest.ClockTestConfiguration.class)
class AuctionServiceTest {

    private static final Instant BASE_TIME = Instant.parse("2026-04-14T05:00:00Z");

    @Autowired
    private AuctionService auctionService;

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private BidRepository bidRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ListingRepository listingRepository;

    @Autowired
    private AuctionEventRepository auctionEventRepository;

    @Autowired
    private InMemoryListingPriceUpdateQueue listingPriceUpdateQueue;

    @Autowired
    private MutableClock mutableClock;

    private User seller;
    private User buyer;
    private User competingBuyer;

    @BeforeEach
    void setUp() {
        listingPriceUpdateQueue.flushPendingUpdates();
        bidRepository.deleteAll();
        auctionRepository.deleteAll();
        auctionEventRepository.deleteAll();
        listingRepository.deleteAll();
        userRepository.deleteAll();

        mutableClock.setInstant(BASE_TIME);

        seller = saveUser(Role.SELLER, money("0.00"));
        buyer = saveUser(Role.BUYER, money("1000.00"));
        competingBuyer = saveUser(Role.BUYER, money("1000.00"));
    }

    @Test
    void placeBidAcceptsValidBidAndUpdatesBalances() {
        AuctionDetailResponse createdAuction = auctionService.createAuction(
            auctionRequest(true, 30L, "100.00", "150.00", "10.00"),
            seller.getId()
        );

        AuctionDetailResponse updatedAuction = auctionService.placeBid(
            createdAuction.id(),
            new BidPlaceRequest(money("120.00")),
            buyer.getId()
        );

        User reloadedBuyer = userRepository.findById(buyer.getId()).orElseThrow();
        assertEquals(AuctionStatus.ACTIVE, updatedAuction.status());
        assertEquals(money("120.00"), updatedAuction.leadingBid().amount());
        assertEquals(money("130.00"), updatedAuction.nextMinimumBid());
        assertEquals(money("880.00"), reloadedBuyer.getAvailableBalance());
        assertEquals(money("120.00"), reloadedBuyer.getHeldBalance());
        assertEquals(2, auctionEventRepository.findAll().size());
    }

    @Test
    void placeBidUpdatesListingDisplayPriceAfterQueueIsConsumed() {
        AuctionDetailResponse createdAuction = auctionService.createAuction(
            auctionRequest(true, 30L, "100.00", "150.00", "10.00"),
            seller.getId()
        );

        auctionService.placeBid(createdAuction.id(), new BidPlaceRequest(money("120.00")), buyer.getId());
        listingPriceUpdateQueue.flushPendingUpdates();

        Auction auction = auctionRepository.findById(createdAuction.id()).orElseThrow();
        Listing listing = listingRepository.findById(auction.getListing().getId()).orElseThrow();
        assertEquals(money("120.00"), listing.getPrice());
    }

    @Test
    void placeBidRejectsAuctionInDraftState() {
        AuctionDetailResponse createdAuction = auctionService.createAuction(
            auctionRequest(false, 30L, "100.00", "150.00", "10.00"),
            seller.getId()
        );

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
            auctionService.placeBid(createdAuction.id(), new BidPlaceRequest(money("120.00")), buyer.getId())
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void placeBidExtendsAuctionWhenBidArrivesNearDeadline() {
        AuctionDetailResponse createdAuction = auctionService.createAuction(
            auctionRequest(true, 10L, "100.00", "150.00", "10.00"),
            seller.getId()
        );

        mutableClock.advance(Duration.ofMinutes(9).plusSeconds(30));

        AuctionDetailResponse updatedAuction = auctionService.placeBid(
            createdAuction.id(),
            new BidPlaceRequest(money("120.00")),
            buyer.getId()
        );

        assertEquals(AuctionStatus.EXTENDED, updatedAuction.status());
        assertEquals(BASE_TIME.plus(Duration.ofMinutes(11).plusSeconds(30)), updatedAuction.endsAt());
        assertEquals(1, updatedAuction.extensionCount());
    }

    @Test
    void closingAuctionMarksWinnerWhenReservePriceIsMet() {
        AuctionDetailResponse createdAuction = auctionService.createAuction(
            auctionRequest(true, 5L, "100.00", "150.00", "10.00"),
            seller.getId()
        );

        auctionService.placeBid(createdAuction.id(), new BidPlaceRequest(money("160.00")), buyer.getId());
        mutableClock.advance(Duration.ofMinutes(6));

        AuctionDetailResponse resolvedAuction = auctionService.getAuctionDetail(createdAuction.id());
        User reloadedBuyer = userRepository.findById(buyer.getId()).orElseThrow();

        assertEquals(AuctionStatus.WON, resolvedAuction.status());
        assertNotNull(resolvedAuction.winningBid());
        assertEquals(money("160.00"), resolvedAuction.winningBid().amount());
        assertEquals(money("840.00"), reloadedBuyer.getAvailableBalance());
        assertEquals(money("0.00"), reloadedBuyer.getHeldBalance());
    }

    @Test
    void closingAuctionMarksUnsoldAndReleasesHeldFundsWhenReservePriceIsMissed() {
        AuctionDetailResponse createdAuction = auctionService.createAuction(
            auctionRequest(true, 5L, "100.00", "200.00", "10.00"),
            seller.getId()
        );

        auctionService.placeBid(createdAuction.id(), new BidPlaceRequest(money("150.00")), buyer.getId());
        mutableClock.advance(Duration.ofMinutes(6));

        AuctionDetailResponse resolvedAuction = auctionService.getAuctionDetail(createdAuction.id());
        User reloadedBuyer = userRepository.findById(buyer.getId()).orElseThrow();

        assertEquals(AuctionStatus.UNSOLD, resolvedAuction.status());
        assertNull(resolvedAuction.winningBid());
        assertEquals(money("1000.00"), reloadedBuyer.getAvailableBalance());
        assertEquals(money("0.00"), reloadedBuyer.getHeldBalance());
    }

    @Test
    void placingHigherBidReleasesPreviousLeaderFunds() {
        AuctionDetailResponse createdAuction = auctionService.createAuction(
            auctionRequest(true, 30L, "100.00", "150.00", "10.00"),
            seller.getId()
        );

        auctionService.placeBid(createdAuction.id(), new BidPlaceRequest(money("120.00")), buyer.getId());
        AuctionDetailResponse updatedAuction = auctionService.placeBid(
            createdAuction.id(),
            new BidPlaceRequest(money("130.00")),
            competingBuyer.getId()
        );

        User reloadedBuyer = userRepository.findById(buyer.getId()).orElseThrow();
        User reloadedCompetingBuyer = userRepository.findById(competingBuyer.getId()).orElseThrow();

        assertEquals(money("130.00"), updatedAuction.leadingBid().amount());
        assertEquals(money("1000.00"), reloadedBuyer.getAvailableBalance());
        assertEquals(money("0.00"), reloadedBuyer.getHeldBalance());
        assertEquals(money("870.00"), reloadedCompetingBuyer.getAvailableBalance());
        assertEquals(money("130.00"), reloadedCompetingBuyer.getHeldBalance());
    }

    @Test
    void detailUsesSequenceNumberAsDeterministicTieBreakerWhenAmountsMatch() {
        AuctionDetailResponse createdAuction = auctionService.createAuction(
            auctionRequest(true, 30L, "100.00", "150.00", "10.00"),
            seller.getId()
        );

        Auction auction = auctionRepository.findById(createdAuction.id()).orElseThrow();
        Listing listing = auction.getListing();
        listing.setPrice(money("150.00"));
        auction.setNextBidSequence(3L);
        auctionRepository.save(auction);

        bidRepository.save(Bid.builder()
            .auction(auction)
            .bidder(buyer)
            .amount(money("150.00"))
            .sequenceNumber(1L)
            .submittedAt(BASE_TIME.plusSeconds(10))
            .build());
        bidRepository.save(Bid.builder()
            .auction(auction)
            .bidder(competingBuyer)
            .amount(money("150.00"))
            .sequenceNumber(2L)
            .submittedAt(BASE_TIME.plusSeconds(11))
            .build());

        AuctionDetailResponse detail = auctionService.getAuctionDetail(createdAuction.id());

        assertNotNull(detail.leadingBid());
        assertEquals(buyer.getId(), detail.leadingBid().bidderId());
        assertEquals(1L, detail.leadingBid().sequenceNumber());
    }

    private AuctionCreateRequest auctionRequest(
        boolean activateNow,
        long durationMinutes,
        String startingPrice,
        String reservePrice,
        String minimumBidIncrement
    ) {
        return new AuctionCreateRequest(
            "Mechanical Keyboard",
            "Hot-swappable keyboard with custom switches",
            "https://img.example/keyboard.jpg",
            ListingCategory.ELECTRONICS,
            money(startingPrice),
            money(reservePrice),
            money(minimumBidIncrement),
            durationMinutes,
            activateNow
        );
    }

    private User saveUser(Role role, BigDecimal availableBalance) {
        return userRepository.save(User.builder()
            .email(role.name().toLowerCase() + "-" + java.util.UUID.randomUUID() + "@bidmart.test")
            .passwordHash("hash")
            .role(role)
            .availableBalance(availableBalance)
            .heldBalance(money("0.00"))
            .createdAt(BASE_TIME)
            .build());
    }

    private static BigDecimal money(String amount) {
        return new BigDecimal(amount).setScale(2, RoundingMode.HALF_UP);
    }

    @TestConfiguration
    static class ClockTestConfiguration {

        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(BASE_TIME, ZoneOffset.UTC);
        }
    }

    static class MutableClock extends Clock {

        private Instant instant;
        private final ZoneId zoneId;

        MutableClock(Instant instant, ZoneId zoneId) {
            this.instant = instant;
            this.zoneId = zoneId;
        }

        void setInstant(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return zoneId;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return new MutableClock(instant, zone);
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
