package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.ListingBidValidationResponse;
import id.ac.ui.cs.advprog.backend.dto.ListingCategoryNodeResponse;
import id.ac.ui.cs.advprog.backend.dto.AuctionListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingCreateRequest;
import id.ac.ui.cs.advprog.backend.dto.ListingDetailResponse;
import id.ac.ui.cs.advprog.backend.dto.ListingResponse;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotDto;
import id.ac.ui.cs.advprog.backend.dto.ListingSnapshotStatus;
import id.ac.ui.cs.advprog.backend.dto.ListingUpdateRequest;
import id.ac.ui.cs.advprog.backend.dto.PublicSellerProfileResponse;
import id.ac.ui.cs.advprog.backend.listing.port.ListingAuctionPort;
import id.ac.ui.cs.advprog.backend.listing.port.ListingAuctionSnapshot;
import id.ac.ui.cs.advprog.backend.listing.port.ListingSellerDirectory;
import id.ac.ui.cs.advprog.backend.listing.port.ListingSellerSnapshot;
import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.ListingCategory;
import id.ac.ui.cs.advprog.backend.model.ListingStatus;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ListingService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final ListingAuctionPort listingAuctionPort;
    private final ListingRepository listingRepository;
    private final ListingSellerDirectory sellerDirectory;
    private final Clock clock;

    public ListingService(
        ListingAuctionPort listingAuctionPort,
        ListingRepository listingRepository,
        ListingSellerDirectory sellerDirectory,
        Clock clock
    ) {
        this.listingAuctionPort = listingAuctionPort;
        this.listingRepository = listingRepository;
        this.sellerDirectory = sellerDirectory;
        this.clock = clock;
    }

    @Transactional
    public ListingResponse createListing(ListingCreateRequest request, UUID sellerId) {
        validateCreateRequest(request);
        ListingSellerSnapshot seller = loadAuthorizedSeller(sellerId);
        Listing listing = buildListing(request, seller, Instant.now(clock));
        return toSummaryResponse(listingRepository.save(listing));
    }

    @Transactional(readOnly = true)
    public List<ListingResponse> getAllListings(
        Pageable pageable,
        ListingCategory category,
        String keyword,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Instant endingAfter,
        Instant endingBefore
    ) {
        validatePriceRange(minPrice, maxPrice);

        int requestedPageSize = pageable.isPaged() ? pageable.getPageSize() : DEFAULT_PAGE_SIZE;
        int safePageNumber = pageable.isPaged() ? Math.max(pageable.getPageNumber(), 0) : 0;
        Sort safeSort = pageable.getSort().isSorted()
            ? pageable.getSort()
            : Sort.by(Sort.Direction.DESC, "createdAt");
        Pageable safePageable = PageRequest.of(
            safePageNumber,
            Math.max(1, Math.min(requestedPageSize, MAX_PAGE_SIZE)),
            safeSort
        );

        Specification<Listing> specification = distinctResults()
            .and(hasStatus(ListingStatus.ACTIVE))
            .and(hasCategoryOrDescendant(category))
            .and(matchesKeyword(keyword))
            .and(hasMinPrice(minPrice))
            .and(hasMaxPrice(maxPrice));

        List<Listing> matchingListings = listingRepository.findAll(specification, safeSort);
        List<Listing> filteredListings = matchingListings.stream()
            .filter(listing -> matchesAuctionWindow(listing.getId(), endingAfter, endingBefore))
            .toList();

        int fromIndex = Math.min((int) safePageable.getOffset(), filteredListings.size());
        int toIndex = Math.min(fromIndex + safePageable.getPageSize(), filteredListings.size());
        return filteredListings.subList(fromIndex, toIndex).stream()
            .map(this::toSummaryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public ListingDetailResponse getListingDetail(UUID listingId) {
        Listing listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        if (listing.getStatus() != ListingStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found");
        }
        return toDetailResponse(listing);
    }

    @Transactional
    public ListingDetailResponse updateListing(UUID listingId, ListingUpdateRequest request, UUID sellerId) {
        validateUpdateRequest(request);
        Listing listing = getOwnedEditableListing(listingId, sellerId);
        listing.setDescription(request.description().trim());
        listing.setImageUrl(normalizeImageUrl(request.imageUrl()));
        listing.setCategory(resolveCategory(request.category()));
        listing.setUpdatedAt(Instant.now(clock));
        return toDetailResponse(listingRepository.save(listing));
    }

    @Transactional
    public ListingDetailResponse cancelListing(UUID listingId, UUID sellerId) {
        Listing listing = getOwnedEditableListing(listingId, sellerId);
        Instant now = Instant.now(clock);
        listingAuctionPort.closeLiveAuctionForListing(listingId, now);
        listing.setStatus(ListingStatus.CANCELLED);
        listing.setCancelledAt(now);
        listing.setUpdatedAt(now);
        return toDetailResponse(listingRepository.save(listing));
    }

    @Transactional(readOnly = true)
    public List<ListingCategoryNodeResponse> getCategoryTree() {
        return Arrays.stream(ListingCategory.values())
            .filter(ListingCategory::isRoot)
            .map(this::toCategoryNode)
            .toList();
    }

    @Transactional(readOnly = true)
    public PublicSellerProfileResponse getPublicSellerProfile(UUID userId) {
        ListingSellerSnapshot seller = sellerDirectory.findSeller(userId)
            .filter(ListingSellerSnapshot::canSell)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Seller not found"));

        long activeListingCount = listingRepository.countBySellerIdAndStatus(seller.id(), ListingStatus.ACTIVE);
        long liveAuctionCount = listingAuctionPort.countLiveAuctionsBySellerId(seller.id());
        long completedAuctionCount = listingAuctionPort.countCompletedAuctionsBySellerId(seller.id());

        return new PublicSellerProfileResponse(
            seller.id(),
            seller.email(),
            seller.role(),
            activeListingCount,
            liveAuctionCount,
            completedAuctionCount
        );
    }

    @Transactional(readOnly = true)
    public ListingBidValidationResponse validateListingForBid(UUID listingId) {
        Listing listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        ListingAuctionSnapshot auction = listingAuctionPort.findSnapshotByListingId(listingId).orElse(null);

        boolean active = listing.getStatus() == ListingStatus.ACTIVE;
        if (!active) {
            return new ListingBidValidationResponse(
                listing.getId(),
                false,
                false,
                "Listing is no longer active",
                listing.getStatus(),
                auction == null ? null : auction.status(),
                auction == null ? null : auction.endsAt()
            );
        }

        if (auction == null) {
            return new ListingBidValidationResponse(
                listing.getId(),
                true,
                false,
                "Listing is not attached to an auction",
                listing.getStatus(),
                null,
                null
            );
        }

        boolean biddable = auction.acceptsBids();
        return new ListingBidValidationResponse(
            listing.getId(),
            true,
            biddable,
            biddable ? "Listing is valid for bidding" : "Auction is not accepting bids",
            listing.getStatus(),
            auction.status(),
            auction.endsAt()
        );
    }

    @Transactional
    public ListingSnapshotDto createAuctionListing(AuctionListingCreateRequest request) {
        validateAuctionListingCreateRequest(request);
        ListingSellerSnapshot seller = loadAuthorizedSeller(request.sellerId());
        Listing listing = Listing.builder()
            .title(request.title().trim())
            .description(request.description().trim())
            .price(request.initialPrice())
            .category(ListingCategory.OTHER)
            .sellerId(seller.id())
            .sellerEmail(seller.email())
            .status(ListingStatus.ACTIVE)
            .createdAt(request.createdAt() == null ? Instant.now(clock) : request.createdAt())
            .build();
        return toSnapshot(listingRepository.save(listing));
    }

    @Transactional(readOnly = true)
    public ListingSnapshotDto getListingSnapshot(UUID listingId) {
        Listing listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        return toSnapshot(listing);
    }

    @Transactional
    public void updateAuctionPrice(UUID listingId, BigDecimal currentPrice) {
        validatePositivePrice(currentPrice);
        Listing listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        listing.setPrice(currentPrice);
        listing.setUpdatedAt(Instant.now(clock));
        listingRepository.save(listing);
    }

    @Transactional
    public Listing createAuctionListing(
        String title,
        String description,
        String imageUrl,
        BigDecimal startingPrice,
        ListingCategory category,
        UUID sellerId,
        Instant createdAt
    ) {
        ListingSellerSnapshot seller = loadAuthorizedSeller(sellerId);
        Listing listing = Listing.builder()
            .title(title.trim())
            .description(description.trim())
            .imageUrl(normalizeImageUrl(imageUrl))
            .price(startingPrice)
            .category(resolveCategory(category))
            .sellerId(seller.id())
            .sellerEmail(seller.email())
            .createdAt(createdAt)
            .build();
        return listingRepository.save(listing);
    }

    @Transactional
    public void updateDisplayedPrice(UUID listingId, BigDecimal latestPrice) {
        Listing listing = listingRepository.findById(listingId).orElse(null);
        if (listing == null) {
            return;
        }
        listing.setPrice(latestPrice);
        listing.setUpdatedAt(Instant.now(clock));
        listingRepository.save(listing);
    }

    private Listing getOwnedEditableListing(UUID listingId, UUID sellerId) {
        Listing listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));

        if (!listing.getSellerId().equals(sellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this listing");
        }
        if (listing.getStatus() != ListingStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing is not active");
        }
        if (listingAuctionPort.listingHasBids(listingId)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Listing cannot be modified because it already has bids"
            );
        }

        return listing;
    }

    private ListingResponse toSummaryResponse(Listing listing) {
        ListingAuctionSnapshot auction = listingAuctionPort.findSnapshotByListingId(listing.getId()).orElse(null);
        long totalBids = auction == null ? 0 : auction.totalBids();

        return new ListingResponse(
            listing.getId(),
            listing.getTitle(),
            listing.getDescription(),
            listing.getImageUrl(),
            listing.getPrice(),
            listing.getCategory(),
            listing.getCategory().pathLabel(),
            listing.getSellerId(),
            resolveSellerEmail(listing),
            listing.getStatus(),
            auction == null ? null : auction.id(),
            auction == null ? null : auction.status(),
            auction == null ? null : auction.endsAt(),
            totalBids,
            totalBids > 0,
            listing.getCreatedAt(),
            listing.getUpdatedAt(),
            listing.getCancelledAt()
        );
    }

    private ListingDetailResponse toDetailResponse(Listing listing) {
        ListingAuctionSnapshot auction = listingAuctionPort.findSnapshotByListingId(listing.getId()).orElse(null);
        long totalBids = auction == null ? 0 : auction.totalBids();

        return new ListingDetailResponse(
            listing.getId(),
            listing.getTitle(),
            listing.getDescription(),
            listing.getImageUrl(),
            listing.getPrice(),
            auction == null ? null : auction.startingPrice(),
            auction == null ? null : auction.reservePrice(),
            auction == null ? null : auction.minimumBidIncrement(),
            auction == null ? null : auction.durationMinutes(),
            listing.getCategory(),
            listing.getCategory().pathLabel(),
            listing.getSellerId(),
            resolveSellerEmail(listing),
            listing.getStatus(),
            auction == null ? null : auction.id(),
            auction == null ? null : auction.status(),
            auction == null ? null : auction.startsAt(),
            auction == null ? null : auction.endsAt(),
            auction == null ? null : auction.closedAt(),
            totalBids,
            totalBids > 0,
            listing.getCreatedAt(),
            listing.getUpdatedAt(),
            listing.getCancelledAt()
        );
    }

    private ListingSnapshotDto toSnapshot(Listing listing) {
        return new ListingSnapshotDto(
            listing.getId(),
            listing.getSellerId(),
            resolveSellerEmail(listing),
            listing.getTitle(),
            listing.getDescription(),
            listing.getPrice(),
            ListingSnapshotStatus.valueOf(listing.getStatus().name())
        );
    }

    private ListingCategory resolveCategory(ListingCategory category) {
        return category != null ? category : ListingCategory.OTHER;
    }

    private String resolveSellerEmail(Listing listing) {
        if (listing.getSellerEmail() != null && !listing.getSellerEmail().isBlank()) {
            return listing.getSellerEmail();
        }
        return sellerDirectory.findSeller(listing.getSellerId())
            .map(ListingSellerSnapshot::email)
            .orElse(null);
    }

    private void validateCreateRequest(ListingCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Listing request is required");
        }
        requireNonBlank(request.title(), "Title is required");
        requireNonBlank(request.description(), "Description is required");
        validatePositivePrice(request.price());
    }

    private void validateAuctionListingCreateRequest(AuctionListingCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Auction listing request is required");
        }
        requireNonBlank(request.title(), "Title is required");
        requireNonBlank(request.description(), "Description is required");
        validatePositivePrice(request.initialPrice());
        if (request.sellerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seller id is required");
        }
    }

    private void validateUpdateRequest(ListingUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Listing update request is required");
        }
        requireNonBlank(request.description(), "Description is required");
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

    private ListingSellerSnapshot loadAuthorizedSeller(UUID sellerId) {
        ListingSellerSnapshot seller = sellerDirectory.findSeller(sellerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (!seller.canSell()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only SELLER can create listings");
        }
        return seller;
    }

    private Listing buildListing(ListingCreateRequest request, ListingSellerSnapshot seller, Instant createdAt) {
        return Listing.builder()
            .title(request.title().trim())
            .description(request.description().trim())
            .imageUrl(normalizeImageUrl(request.imageUrl()))
            .price(request.price())
            .category(resolveCategory(request.category()))
            .sellerId(seller.id())
            .sellerEmail(seller.email())
            .createdAt(createdAt)
            .build();
    }

    private String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        return imageUrl.trim();
    }

    private void validatePriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "minPrice cannot be greater than maxPrice"
            );
        }
    }

    private Specification<Listing> distinctResults() {
        return (root, query, criteriaBuilder) -> {
            query.distinct(true);
            return criteriaBuilder.conjunction();
        };
    }

    private Specification<Listing> hasStatus(ListingStatus status) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"), status);
    }

    private Specification<Listing> hasCategoryOrDescendant(ListingCategory category) {
        if (category == null) {
            return null;
        }

        List<ListingCategory> matchingCategories = Arrays.stream(ListingCategory.values())
            .filter(candidate -> candidate.isSameOrDescendantOf(category))
            .toList();

        return (root, query, criteriaBuilder) -> root.get("category").in(matchingCategories);
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

    private boolean matchesAuctionWindow(UUID listingId, Instant endingAfter, Instant endingBefore) {
        if (endingAfter == null && endingBefore == null) {
            return true;
        }

        ListingAuctionSnapshot auction = listingAuctionPort.findSnapshotByListingId(listingId).orElse(null);
        if (auction == null || auction.endsAt() == null) {
            return false;
        }

        boolean matchesAfter = endingAfter == null || !auction.endsAt().isBefore(endingAfter);
        boolean matchesBefore = endingBefore == null || !auction.endsAt().isAfter(endingBefore);
        return matchesAfter && matchesBefore;
    }

    private ListingCategoryNodeResponse toCategoryNode(ListingCategory category) {
        return new ListingCategoryNodeResponse(
            category,
            category.label(),
            category.pathLabel(),
            category.children().stream().map(this::toCategoryNode).toList()
        );
    }
}
