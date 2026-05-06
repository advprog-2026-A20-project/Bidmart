package id.ac.ui.cs.advprog.backend.controller;

import id.ac.ui.cs.advprog.backend.dto.AuctionListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingAuctionPriceUpdateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotDto;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotStatus;
import id.ac.ui.cs.advprog.backend.security.InternalServiceGuard;
import id.ac.ui.cs.advprog.backend.service.ListingService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InternalListingControllerTest {

    private final ListingService listingService = Mockito.mock(ListingService.class);
    private final InternalServiceGuard internalServiceGuard = Mockito.mock(InternalServiceGuard.class);
    private final InternalListingController controller = new InternalListingController(
        listingService,
        internalServiceGuard
    );

    @Test
    void createAuctionListingShouldVerifyTokenAndDelegateToService() {
        UUID sellerId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        AuctionListingCreateRequest request = new AuctionListingCreateRequest(
            "Camera",
            "Mirrorless body",
            new BigDecimal("500.00"),
            sellerId,
            Instant.parse("2026-04-23T10:15:30Z")
        );
        ListingSnapshotDto response = new ListingSnapshotDto(
            listingId,
            sellerId,
            "seller@bidmart.test",
            "Camera",
            "Mirrorless body",
            new BigDecimal("500.00"),
            ListingSnapshotStatus.ACTIVE
        );
        when(listingService.createAuctionListing(request)).thenReturn(response);

        ListingSnapshotDto actual = controller.createAuctionListing("internal-token", request);

        assertEquals(response, actual);
        verify(internalServiceGuard).verify("internal-token");
        verify(listingService).createAuctionListing(request);
    }

    @Test
    void getListingSnapshotShouldVerifyTokenAndDelegateToService() {
        UUID listingId = UUID.randomUUID();
        ListingSnapshotDto response = new ListingSnapshotDto(
            listingId,
            UUID.randomUUID(),
            "seller@bidmart.test",
            "Camera",
            "Mirrorless body",
            new BigDecimal("500.00"),
            ListingSnapshotStatus.ACTIVE
        );
        when(listingService.getListingSnapshot(listingId)).thenReturn(response);

        ListingSnapshotDto actual = controller.getListingSnapshot("internal-token", listingId);

        assertEquals(response, actual);
        verify(internalServiceGuard).verify("internal-token");
        verify(listingService).getListingSnapshot(listingId);
    }

    @Test
    void updateAuctionPriceShouldVerifyTokenAndDelegateToService() {
        UUID listingId = UUID.randomUUID();
        ListingAuctionPriceUpdateRequest request = new ListingAuctionPriceUpdateRequest(new BigDecimal("650.00"));

        controller.updateAuctionPrice("internal-token", listingId, request);

        verify(internalServiceGuard).verify("internal-token");
        verify(listingService).updateAuctionPrice(listingId, request.currentPrice());
    }
}
