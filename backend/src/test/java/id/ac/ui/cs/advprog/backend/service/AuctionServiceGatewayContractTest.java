package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.AuctionCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.AuctionDetailResponse;
import id.ac.ui.cs.advprog.backend.dto.AuctionListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.BidPlaceRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotDto;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotStatus;
import id.ac.ui.cs.advprog.backend.dto.UserProfileDto;
import id.ac.ui.cs.advprog.backend.dto.WalletCaptureRequest;
import id.ac.ui.cs.advprog.backend.dto.WalletHoldRequest;
import id.ac.ui.cs.advprog.backend.dto.WalletHoldResponse;
import id.ac.ui.cs.advprog.backend.dto.WalletReleaseRequest;
import id.ac.ui.cs.advprog.backend.model.Auction;
import id.ac.ui.cs.advprog.backend.model.AuctionStatus;
import id.ac.ui.cs.advprog.backend.model.Bid;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.repository.AuctionRepository;
import id.ac.ui.cs.advprog.backend.repository.BidRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuctionServiceGatewayContractTest {

    private static final Instant NOW = Instant.parse("2026-04-30T10:00:00Z");

    @Mock
    private AuctionRepository auctionRepository;

    @Mock
    private BidRepository bidRepository;

    @Mock
    private ListingGateway listingGateway;

    @Mock
    private UserGateway userGateway;

    @Mock
    private WalletGateway walletGateway;

    @Mock
    private AuctionEventPublisher auctionEventPublisher;

    private AuctionService auctionService;

    @BeforeEach
    void setUp() {
        auctionService = new AuctionService(
            auctionRepository,
            bidRepository,
            listingGateway,
            userGateway,
            walletGateway,
            auctionEventPublisher,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void createAuctionUsesDtoGatewaysAndStoresListingSnapshot() {
        UUID sellerId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        when(userGateway.requireSeller(sellerId)).thenReturn(
            new UserProfileDto(sellerId, "seller@bidmart.test", Role.SELLER, true)
        );
        when(listingGateway.createAuctionListing(any(AuctionListingCreateRequest.class))).thenReturn(
            new ListingSnapshotDto(
                listingId,
                sellerId,
                "seller@bidmart.test",
                "Mechanical Keyboard",
                "Hot-swappable keyboard",
                money("100.00"),
                ListingSnapshotStatus.ACTIVE
            )
        );
        when(auctionRepository.save(any(Auction.class))).thenAnswer(invocation -> {
            Auction auction = invocation.getArgument(0);
            auction.setId(UUID.randomUUID());
            return auction;
        });
        when(bidRepository.findByAuctionIdOrderBySequenceNumberAsc(any())).thenReturn(List.of());

        AuctionDetailResponse response = auctionService.createAuction(
            new AuctionCreateRequest(
                "Mechanical Keyboard",
                "Hot-swappable keyboard",
                money("100.00"),
                money("150.00"),
                money("10.00"),
                30L,
                false
            ),
            sellerId
        );

        ArgumentCaptor<AuctionListingCreateRequest> listingRequestCaptor =
            ArgumentCaptor.forClass(AuctionListingCreateRequest.class);
        ArgumentCaptor<Auction> auctionCaptor = ArgumentCaptor.forClass(Auction.class);
        verify(listingGateway).createAuctionListing(listingRequestCaptor.capture());
        verify(auctionRepository).save(auctionCaptor.capture());

        assertEquals(sellerId, listingRequestCaptor.getValue().sellerId());
        assertEquals(listingId, auctionCaptor.getValue().getListingId());
        assertEquals(sellerId, auctionCaptor.getValue().getSellerId());
        assertEquals("seller@bidmart.test", auctionCaptor.getValue().getSellerEmail());
        assertEquals(money("100.00"), auctionCaptor.getValue().getCurrentPrice());
        assertEquals(listingId, response.listingId());
        assertEquals(sellerId, response.sellerId());
    }

    @Test
    void placeBidUsesGatewayContractsForBuyerWalletAndListingPrice() {
        UUID auctionId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        UUID sellerId = UUID.randomUUID();
        UUID buyerId = UUID.randomUUID();
        Auction auction = activeAuction(auctionId, listingId, sellerId);
        when(userGateway.requireBuyer(buyerId)).thenReturn(
            new UserProfileDto(buyerId, "buyer@bidmart.test", Role.BUYER, true)
        );
        when(auctionRepository.findSnapshotByIdForUpdate(auctionId)).thenReturn(Optional.of(auction));
        when(bidRepository.findTopByAuctionIdOrderByAmountDescSequenceNumberAsc(auctionId)).thenReturn(Optional.empty());
        when(walletGateway.holdFunds(any(WalletHoldRequest.class))).thenReturn(
            new WalletHoldResponse("reservation-1", buyerId, auctionId, money("120.00"), "HELD")
        );
        when(bidRepository.save(any(Bid.class))).thenAnswer(invocation -> {
            Bid bid = invocation.getArgument(0);
            bid.setId(UUID.randomUUID());
            return bid;
        });
        when(auctionRepository.save(any(Auction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bidRepository.findByAuctionIdOrderBySequenceNumberAsc(auctionId)).thenReturn(List.of());

        auctionService.placeBid(auctionId, new BidPlaceRequest(money("120.00")), buyerId);

        ArgumentCaptor<WalletHoldRequest> holdCaptor = ArgumentCaptor.forClass(WalletHoldRequest.class);
        ArgumentCaptor<Bid> bidCaptor = ArgumentCaptor.forClass(Bid.class);
        verify(walletGateway).holdFunds(holdCaptor.capture());
        verify(bidRepository).save(bidCaptor.capture());
        verify(listingGateway).updateAuctionPrice(listingId, money("120.00"));

        assertEquals(buyerId, holdCaptor.getValue().userId());
        assertEquals(auctionId, holdCaptor.getValue().auctionId());
        assertEquals(money("120.00"), holdCaptor.getValue().amount());
        assertEquals(buyerId, bidCaptor.getValue().getBidderId());
        assertEquals("buyer@bidmart.test", bidCaptor.getValue().getBidderEmail());
    }

    @Test
    void sellerCannotBidOnOwnAuctionBeforeWalletIsTouched() {
        UUID auctionId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        UUID sellerId = UUID.randomUUID();
        Auction auction = activeAuction(auctionId, listingId, sellerId);
        when(userGateway.requireBuyer(sellerId)).thenReturn(
            new UserProfileDto(sellerId, "seller@bidmart.test", Role.BUYER, true)
        );
        when(auctionRepository.findSnapshotByIdForUpdate(auctionId)).thenReturn(Optional.of(auction));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
            auctionService.placeBid(auctionId, new BidPlaceRequest(money("120.00")), sellerId)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verify(walletGateway, never()).holdFunds(any());
        verify(listingGateway, never()).updateAuctionPrice(any(), any());
    }

    @Test
    void bidBelowRequiredMinimumDoesNotHoldFundsOrPersistBid() {
        UUID auctionId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        UUID sellerId = UUID.randomUUID();
        UUID buyerId = UUID.randomUUID();
        UUID currentLeaderId = UUID.randomUUID();
        Auction auction = activeAuction(auctionId, listingId, sellerId);
        Bid leadingBid = bid(auction, currentLeaderId, "leader@bidmart.test", "120.00", 1L);
        when(userGateway.requireBuyer(buyerId)).thenReturn(
            new UserProfileDto(buyerId, "buyer@bidmart.test", Role.BUYER, true)
        );
        when(auctionRepository.findSnapshotByIdForUpdate(auctionId)).thenReturn(Optional.of(auction));
        when(bidRepository.findTopByAuctionIdOrderByAmountDescSequenceNumberAsc(auctionId))
            .thenReturn(Optional.of(leadingBid));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
            auctionService.placeBid(auctionId, new BidPlaceRequest(money("125.00")), buyerId)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(walletGateway, never()).holdFunds(any());
        verify(bidRepository, never()).save(any());
        verify(listingGateway, never()).updateAuctionPrice(any(), any());
    }

    @Test
    void failedWalletHoldPreventsBidPersistenceAndListingUpdate() {
        UUID auctionId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        UUID sellerId = UUID.randomUUID();
        UUID buyerId = UUID.randomUUID();
        Auction auction = activeAuction(auctionId, listingId, sellerId);
        when(userGateway.requireBuyer(buyerId)).thenReturn(
            new UserProfileDto(buyerId, "buyer@bidmart.test", Role.BUYER, true)
        );
        when(auctionRepository.findSnapshotByIdForUpdate(auctionId)).thenReturn(Optional.of(auction));
        when(bidRepository.findTopByAuctionIdOrderByAmountDescSequenceNumberAsc(auctionId)).thenReturn(Optional.empty());
        when(walletGateway.holdFunds(any(WalletHoldRequest.class)))
            .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient balance for this bid"));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
            auctionService.placeBid(auctionId, new BidPlaceRequest(money("120.00")), buyerId)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(bidRepository, never()).save(any());
        verify(listingGateway, never()).updateAuctionPrice(any(), any());
        verify(auctionEventPublisher, never()).publishBidPlaced(any(), any(), any());
    }

    @Test
    void outbidReleasesPreviousLeaderFunds() {
        UUID auctionId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        UUID sellerId = UUID.randomUUID();
        UUID previousLeaderId = UUID.randomUUID();
        UUID buyerId = UUID.randomUUID();
        Auction auction = activeAuction(auctionId, listingId, sellerId);
        Bid previousLeader = bid(auction, previousLeaderId, "previous@bidmart.test", "120.00", 1L);
        when(userGateway.requireBuyer(buyerId)).thenReturn(
            new UserProfileDto(buyerId, "buyer@bidmart.test", Role.BUYER, true)
        );
        when(auctionRepository.findSnapshotByIdForUpdate(auctionId)).thenReturn(Optional.of(auction));
        when(bidRepository.findTopByAuctionIdOrderByAmountDescSequenceNumberAsc(auctionId))
            .thenReturn(Optional.of(previousLeader));
        when(walletGateway.holdFunds(any(WalletHoldRequest.class))).thenReturn(
            new WalletHoldResponse("reservation-2", buyerId, auctionId, money("140.00"), "HELD")
        );
        when(bidRepository.save(any(Bid.class))).thenAnswer(invocation -> {
            Bid bid = invocation.getArgument(0);
            bid.setId(UUID.randomUUID());
            return bid;
        });
        when(auctionRepository.save(any(Auction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bidRepository.findByAuctionIdOrderBySequenceNumberAsc(auctionId)).thenReturn(List.of(previousLeader));

        auctionService.placeBid(auctionId, new BidPlaceRequest(money("140.00")), buyerId);

        ArgumentCaptor<WalletReleaseRequest> releaseCaptor = ArgumentCaptor.forClass(WalletReleaseRequest.class);
        verify(walletGateway).releaseFunds(releaseCaptor.capture());
        assertEquals(previousLeaderId, releaseCaptor.getValue().userId());
        assertEquals(auctionId, releaseCaptor.getValue().auctionId());
        assertEquals(money("120.00"), releaseCaptor.getValue().amount());
    }

    @Test
    void closeAuctionCapturesWinnerFundsWhenReserveIsMet() {
        UUID auctionId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        UUID sellerId = UUID.randomUUID();
        UUID winnerId = UUID.randomUUID();
        Auction auction = activeAuction(auctionId, listingId, sellerId);
        auction.setEndsAt(NOW.minus(Duration.ofMinutes(1)));
        Bid winningBid = bid(auction, winnerId, "winner@bidmart.test", "160.00", 1L);
        when(userGateway.requireSeller(sellerId)).thenReturn(
            new UserProfileDto(sellerId, "seller@bidmart.test", Role.SELLER, true)
        );
        when(auctionRepository.findSnapshotByIdForUpdate(auctionId)).thenReturn(Optional.of(auction));
        when(bidRepository.findTopByAuctionIdOrderByAmountDescSequenceNumberAsc(auctionId))
            .thenReturn(Optional.of(winningBid));
        when(auctionRepository.save(any(Auction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bidRepository.findByAuctionIdOrderBySequenceNumberAsc(auctionId)).thenReturn(List.of(winningBid));

        AuctionDetailResponse response = auctionService.closeAuction(auctionId, sellerId);

        ArgumentCaptor<WalletCaptureRequest> captureCaptor = ArgumentCaptor.forClass(WalletCaptureRequest.class);
        verify(walletGateway).captureFunds(captureCaptor.capture());
        verify(auctionRepository).save(auction);
        verify(auctionEventPublisher).publishAuctionResolved(auction, winningBid, true);
        assertEquals(winnerId, captureCaptor.getValue().userId());
        assertEquals(auctionId, captureCaptor.getValue().auctionId());
        assertEquals(money("160.00"), captureCaptor.getValue().amount());
        assertEquals(AuctionStatus.WON, response.status());
        assertNotNull(response.winningBid());
    }

    @Test
    void invalidSellerResponseFailsBeforeListingOrAuctionPersistence() {
        UUID sellerId = UUID.randomUUID();
        when(userGateway.requireSeller(sellerId))
            .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Only SELLER can manage auctions"));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
            auctionService.createAuction(
                new AuctionCreateRequest(
                    "Mechanical Keyboard",
                    "Hot-swappable keyboard",
                    money("100.00"),
                    money("150.00"),
                    money("10.00"),
                    30L,
                    false
                ),
                sellerId
            )
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verify(listingGateway, never()).createAuctionListing(any());
        verify(auctionRepository, never()).save(any());
    }

    private Auction activeAuction(UUID auctionId, UUID listingId, UUID sellerId) {
        return Auction.builder()
            .id(auctionId)
            .listingId(listingId)
            .sellerId(sellerId)
            .sellerEmail("seller@bidmart.test")
            .title("Mechanical Keyboard")
            .description("Hot-swappable keyboard")
            .currentPrice(money("100.00"))
            .status(AuctionStatus.ACTIVE)
            .startingPrice(money("100.00"))
            .reservePrice(money("150.00"))
            .minimumBidIncrement(money("10.00"))
            .durationMinutes(30L)
            .nextBidSequence(1L)
            .extensionCount(0)
            .createdAt(NOW)
            .startsAt(NOW)
            .endsAt(NOW.plus(Duration.ofMinutes(30)))
            .build();
    }

    private Bid bid(Auction auction, UUID bidderId, String bidderEmail, String amount, long sequenceNumber) {
        return Bid.builder()
            .id(UUID.randomUUID())
            .auction(auction)
            .bidderId(bidderId)
            .bidderEmail(bidderEmail)
            .amount(money(amount))
            .sequenceNumber(sequenceNumber)
            .submittedAt(NOW.plusSeconds(sequenceNumber))
            .build();
    }

    private static BigDecimal money(String amount) {
        return new BigDecimal(amount).setScale(2, RoundingMode.HALF_UP);
    }
}
