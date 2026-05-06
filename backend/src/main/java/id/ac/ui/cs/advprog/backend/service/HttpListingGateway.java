package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.AuctionListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotDto;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@ConditionalOnProperty(name = "bidmart.services.mode", havingValue = "remote")
public class HttpListingGateway implements ListingGateway {

    private final RestClient restClient;

    public HttpListingGateway(@Value("${bidmart.services.listing.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    @Override
    public ListingSnapshotDto createAuctionListing(AuctionListingCreateRequest request) {
        return restClient.post()
            .uri("/api/internal/listings/auction")
            .body(request)
            .retrieve()
            .body(ListingSnapshotDto.class);
    }

    @Override
    public ListingSnapshotDto getListingSnapshot(UUID listingId) {
        return restClient.get()
            .uri("/api/internal/listings/{listingId}/snapshot", listingId)
            .retrieve()
            .body(ListingSnapshotDto.class);
    }

    @Override
    public void updateAuctionPrice(UUID listingId, BigDecimal updatedPrice) {
        restClient.patch()
            .uri("/api/internal/listings/{listingId}/auction-price", listingId)
            .body(Map.of("currentPrice", updatedPrice))
            .retrieve()
            .toBodilessEntity();
    }
}
