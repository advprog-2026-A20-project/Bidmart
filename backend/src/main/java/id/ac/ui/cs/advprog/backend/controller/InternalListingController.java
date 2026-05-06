package id.ac.ui.cs.advprog.backend.controller;

import id.ac.ui.cs.advprog.backend.dto.AuctionListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingAuctionPriceUpdateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotDto;
import id.ac.ui.cs.advprog.backend.security.InternalServiceGuard;
import id.ac.ui.cs.advprog.backend.service.ListingService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/listings")
public class InternalListingController {

    private final ListingService listingService;
    private final InternalServiceGuard internalServiceGuard;

    public InternalListingController(
        ListingService listingService,
        InternalServiceGuard internalServiceGuard
    ) {
        this.listingService = listingService;
        this.internalServiceGuard = internalServiceGuard;
    }

    @PostMapping("/auction")
    @ResponseStatus(HttpStatus.CREATED)
    public ListingSnapshotDto createAuctionListing(
        @RequestHeader(value = InternalServiceGuard.INTERNAL_SERVICE_TOKEN_HEADER, required = false)
        String internalServiceToken,
        @Valid @RequestBody AuctionListingCreateRequest request
    ) {
        internalServiceGuard.verify(internalServiceToken);
        return listingService.createAuctionListing(request);
    }

    @GetMapping("/{listingId}/snapshot")
    public ListingSnapshotDto getListingSnapshot(
        @RequestHeader(value = InternalServiceGuard.INTERNAL_SERVICE_TOKEN_HEADER, required = false)
        String internalServiceToken,
        @PathVariable UUID listingId
    ) {
        internalServiceGuard.verify(internalServiceToken);
        return listingService.getListingSnapshot(listingId);
    }

    @PatchMapping("/{listingId}/auction-price")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateAuctionPrice(
        @RequestHeader(value = InternalServiceGuard.INTERNAL_SERVICE_TOKEN_HEADER, required = false)
        String internalServiceToken,
        @PathVariable UUID listingId,
        @Valid @RequestBody ListingAuctionPriceUpdateRequest request
    ) {
        internalServiceGuard.verify(internalServiceToken);
        listingService.updateAuctionPrice(listingId, request.currentPrice());
    }
}
