package id.ac.ui.cs.advprog.backend.controller;

import id.ac.ui.cs.advprog.backend.dto.AuctionCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.AuctionDetailResponse;
import id.ac.ui.cs.advprog.backend.dto.AuctionSummaryResponse;
import id.ac.ui.cs.advprog.backend.dto.BidPlaceRequest;
import id.ac.ui.cs.advprog.backend.dto.BidResponse;
import id.ac.ui.cs.advprog.backend.service.AuctionService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auctions")
public class AuctionController {

    private final AuctionService auctionService;

    public AuctionController(AuctionService auctionService) {
        this.auctionService = auctionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AuctionDetailResponse createAuction(
        @RequestBody AuctionCreateRequest request,
        Authentication authentication
    ) {
        UUID sellerId = UUID.fromString(authentication.getName());
        return auctionService.createAuction(request, sellerId);
    }

    @GetMapping
    public List<AuctionSummaryResponse> listAuctions() {
        return auctionService.listAuctions();
    }

    @GetMapping("/{auctionId}")
    public AuctionDetailResponse getAuctionDetail(@PathVariable UUID auctionId) {
        return auctionService.getAuctionDetail(auctionId);
    }

    @GetMapping("/{auctionId}/bids")
    public List<BidResponse> getBidHistory(@PathVariable UUID auctionId) {
        return auctionService.getBidHistory(auctionId);
    }

    @PostMapping("/{auctionId}/activate")
    public AuctionDetailResponse activateAuction(
        @PathVariable UUID auctionId,
        Authentication authentication
    ) {
        UUID sellerId = UUID.fromString(authentication.getName());
        return auctionService.activateAuction(auctionId, sellerId);
    }

    @PostMapping("/{auctionId}/bids")
    @ResponseStatus(HttpStatus.CREATED)
    public AuctionDetailResponse placeBid(
        @PathVariable UUID auctionId,
        @RequestBody BidPlaceRequest request,
        Authentication authentication
    ) {
        UUID bidderId = UUID.fromString(authentication.getName());
        return auctionService.placeBid(auctionId, request, bidderId);
    }

    @PostMapping("/{auctionId}/close")
    public AuctionDetailResponse closeAuction(
        @PathVariable UUID auctionId,
        Authentication authentication
    ) {
        UUID sellerId = UUID.fromString(authentication.getName());
        return auctionService.closeAuction(auctionId, sellerId);
    }
}

