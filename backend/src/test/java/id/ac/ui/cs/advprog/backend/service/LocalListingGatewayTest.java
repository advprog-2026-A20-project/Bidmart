package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocalListingGatewayTest {

    @Mock
    private ListingRepository listingRepository;

    @Captor
    private ArgumentCaptor<Listing> listingCaptor;

    @InjectMocks
    private LocalListingGateway localListingGateway;

    @Test
    void createAuctionListingBuildsAndPersistsListing() {
        User seller = User.builder()
            .id(UUID.randomUUID())
            .role(Role.SELLER)
            .email("seller@bidmart.test")
            .build();
        Instant createdAt = Instant.parse("2026-04-25T00:00:00Z");
        when(listingRepository.save(any(Listing.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Listing savedListing = localListingGateway.createAuctionListing(
            "Mechanical Keyboard",
            "Hot-swappable keyboard",
            new BigDecimal("100.00"),
            seller,
            createdAt
        );

        verify(listingRepository).save(listingCaptor.capture());
        Listing persistedListing = listingCaptor.getValue();
        assertEquals("Mechanical Keyboard", persistedListing.getTitle());
        assertEquals("Hot-swappable keyboard", persistedListing.getDescription());
        assertEquals(new BigDecimal("100.00"), persistedListing.getPrice());
        assertSame(seller, persistedListing.getSeller());
        assertEquals(createdAt, persistedListing.getCreatedAt());
        assertSame(persistedListing, savedListing);
    }

    @Test
    void updateCurrentPriceMutatesListingPrice() {
        Listing listing = Listing.builder()
            .price(new BigDecimal("100.00"))
            .build();

        localListingGateway.updateCurrentPrice(listing, new BigDecimal("125.00"));

        assertEquals(new BigDecimal("125.00"), listing.getPrice());
    }
}
