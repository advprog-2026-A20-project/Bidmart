package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.ListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingResponse;
import id.ac.ui.cs.advprog.backend.dto.ListingUpdateRequest;
import id.ac.ui.cs.advprog.backend.model.ListingCategory;
import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.ListingStatus;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.BidRepository;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ListingService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final BidRepository bidRepository;
    private final ListingRepository listingRepository;
    private final UserRepository userRepository;

    public ListingService(
        BidRepository bidRepository,
        ListingRepository listingRepository,
        UserRepository userRepository
    ) {
        this.bidRepository = bidRepository;
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
    }

    public ListingResponse createListing(ListingCreateRequest request, UUID sellerId) {
        User seller = userRepository.findById(sellerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (seller.getRole() != Role.SELLER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only SELLER can create listings");
        }

        Listing listing = Listing.builder()
            .title(request.title())
            .description(request.description())
            .price(request.price())
            .category(resolveCategory(request.category()))
            .seller(seller)
            .build();

        Listing saved = listingRepository.save(listing);
        return toResponse(saved);
    }

    public List<ListingResponse> getAllListings(
        Pageable pageable,
        ListingCategory category,
        String keyword,
        BigDecimal minPrice,
        BigDecimal maxPrice
    ) {
        validatePriceRange(minPrice, maxPrice);
        int requestedPageSize = pageable.isPaged() ? pageable.getPageSize() : DEFAULT_PAGE_SIZE;
        Pageable safePageable = PageRequest.of(
            Math.max(pageable.getPageNumber(), 0),
            Math.max(1, Math.min(requestedPageSize, MAX_PAGE_SIZE))
        );
        Specification<Listing> specification = hasStatus(ListingStatus.ACTIVE)
            .and(hasCategory(category))
            .and(matchesKeyword(keyword))
            .and(hasMinPrice(minPrice))
            .and(hasMaxPrice(maxPrice));

        return listingRepository.findAll(specification, safePageable).stream()
            .map(this::toResponse)
            .toList();
    }

    public ListingResponse getListingById(UUID listingId) {
        return listingRepository.findByIdAndStatus(listingId, ListingStatus.ACTIVE)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
    }

    public ListingResponse updateListing(UUID listingId, ListingUpdateRequest request, UUID sellerId) {
        Listing listing = getOwnedEditableListing(listingId, sellerId);
        listing.setTitle(request.title());
        listing.setDescription(request.description());
        listing.setPrice(request.price());
        listing.setCategory(request.category() != null ? request.category() : listing.getCategory());
        listing.setUpdatedAt(Instant.now());
        return toResponse(listingRepository.save(listing));
    }

    public ListingResponse cancelListing(UUID listingId, UUID sellerId) {
        Listing listing = getOwnedEditableListing(listingId, sellerId);
        listing.setStatus(ListingStatus.CANCELLED);
        listing.setCancelledAt(Instant.now());
        listing.setUpdatedAt(Instant.now());
        return toResponse(listingRepository.save(listing));
    }

    private Listing getOwnedEditableListing(UUID listingId, UUID sellerId) {
        Listing listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));

        if (!listing.getSeller().getId().equals(sellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this listing");
        }
        if (listing.getStatus() != ListingStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing is not active");
        }
        if (bidRepository.existsByListingId(listingId)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Listing cannot be modified because it already has bids"
            );
        }

        return listing;
    }

    private ListingResponse toResponse(Listing listing) {
        return new ListingResponse(
            listing.getId(),
            listing.getTitle(),
            listing.getDescription(),
            listing.getPrice(),
            listing.getCategory(),
            listing.getSeller().getId(),
            listing.getStatus(),
            listing.getCreatedAt(),
            listing.getUpdatedAt(),
            listing.getCancelledAt()
        );
    }

    private ListingCategory resolveCategory(ListingCategory category) {
        return category != null ? category : ListingCategory.OTHER;
    }

    private void validatePriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "minPrice cannot be greater than maxPrice"
            );
        }
    }

    private Specification<Listing> hasStatus(ListingStatus status) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), status);
    }

    private Specification<Listing> hasCategory(ListingCategory category) {
        if (category == null) {
            return null;
        }
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("category"), category);
    }

    private Specification<Listing> matchesKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String normalizedKeyword = "%" + keyword.trim().toLowerCase() + "%";
        return (root, query, criteriaBuilder) -> criteriaBuilder.or(
            criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), normalizedKeyword),
            criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), normalizedKeyword)
        );
    }

    private Specification<Listing> hasMinPrice(BigDecimal minPrice) {
        if (minPrice == null) {
            return null;
        }
        return (root, query, criteriaBuilder) ->
            criteriaBuilder.greaterThanOrEqualTo(root.get("price"), minPrice);
    }

    private Specification<Listing> hasMaxPrice(BigDecimal maxPrice) {
        if (maxPrice == null) {
            return null;
        }
        return (root, query, criteriaBuilder) ->
            criteriaBuilder.lessThanOrEqualTo(root.get("price"), maxPrice);
    }
}
