package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.ListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingResponse;
import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ListingService {

    private static final int MAX_PAGE_SIZE = 50;

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public ListingService(ListingRepository listingRepository, UserRepository userRepository, Clock clock) {
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    public ListingResponse createListing(ListingCreateRequest request, UUID sellerId) {
        validateCreateRequest(request);
        User seller = loadAuthorizedSeller(sellerId);
        Listing listing = buildListing(request, seller);
        return toResponse(listingRepository.save(listing));
    }

    public List<ListingResponse> getAllListings(Pageable pageable) {
        Pageable safePageable = PageRequest.of(
            Math.max(pageable.getPageNumber(), 0),
            Math.min(pageable.getPageSize(), MAX_PAGE_SIZE)
        );
        return listingRepository.findAll(safePageable).stream()
            .map(this::toResponse)
            .toList();
    }

    private ListingResponse toResponse(Listing listing) {
        return new ListingResponse(
            listing.getId(),
            listing.getTitle(),
            listing.getDescription(),
            listing.getPrice(),
            listing.getSeller().getId(),
            listing.getCreatedAt()
        );
    }

    private void validateCreateRequest(ListingCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Listing request is required");
        }
        requireNonBlank(request.title(), "Title is required");
        requireNonBlank(request.description(), "Description is required");
        validatePositivePrice(request.price());
    }

    private void requireNonBlank(String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
    }

    private void validatePositivePrice(BigDecimal price) {
        if (price == null || price.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be positive");
        }
    }

    private User loadAuthorizedSeller(UUID sellerId) {
        User seller = userRepository.findById(sellerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (seller.getRole() != Role.SELLER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only SELLER can create listings");
        }
        return seller;
    }

    private Listing buildListing(ListingCreateRequest request, User seller) {
        return Listing.builder()
            .title(request.title().trim())
            .description(request.description().trim())
            .price(request.price())
            .seller(seller)
            .createdAt(Instant.now(clock))
            .build();
    }
}
