package id.ac.ui.cs.advprog.listingquery.service;

import id.ac.ui.cs.advprog.listingquery.dto.ListingCategoryNodeResponse;
import id.ac.ui.cs.advprog.listingquery.dto.ListingDetailResponse;
import id.ac.ui.cs.advprog.listingquery.dto.ListingResponse;
import id.ac.ui.cs.advprog.listingquery.model.Auction;
import id.ac.ui.cs.advprog.listingquery.model.Listing;
import id.ac.ui.cs.advprog.listingquery.model.ListingCategory;
import id.ac.ui.cs.advprog.listingquery.model.ListingStatus;
import id.ac.ui.cs.advprog.listingquery.repository.AuctionRepository;
import id.ac.ui.cs.advprog.listingquery.repository.BidRepository;
import id.ac.ui.cs.advprog.listingquery.repository.ListingRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
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
public class ListingQueryService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final ListingRepository listingRepository;
    private final AuctionRepository auctionRepository;
    private final BidRepository bidRepository;

    public ListingQueryService(
        ListingRepository listingRepository,
        AuctionRepository auctionRepository,
        BidRepository bidRepository
    ) {
        this.listingRepository = listingRepository;
        this.auctionRepository = auctionRepository;
        this.bidRepository = bidRepository;
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

    @Transactional(readOnly = true)
    public List<ListingCategory> getCategories() {
        return Arrays.stream(ListingCategory.values()).toList();
    }

    @Transactional(readOnly = true)
    public List<ListingCategoryNodeResponse> getCategoryTree() {
        return Arrays.stream(ListingCategory.values())
            .filter(ListingCategory::isRoot)
            .map(this::toCategoryNode)
            .toList();
    }

    private ListingResponse toSummaryResponse(Listing listing) {
        Auction auction = findAuctionByListingId(listing.getId()).orElse(null);
        long totalBids = auction == null ? 0 : bidRepository.countByAuctionId(auction.getId());

        return new ListingResponse(
            listing.getId(),
            listing.getTitle(),
            listing.getDescription(),
            listing.getImageUrl(),
            listing.getPrice(),
            listing.getCategory(),
            listing.getCategory().pathLabel(),
            listing.getSeller().getId(),
            listing.getSeller().getEmail(),
            listing.getStatus(),
            auction == null ? null : auction.getId(),
            auction == null ? null : auction.getStatus(),
            auction == null ? null : auction.getEndsAt(),
            totalBids,
            totalBids > 0,
            listing.getCreatedAt(),
            listing.getUpdatedAt(),
            listing.getCancelledAt()
        );
    }

    private ListingDetailResponse toDetailResponse(Listing listing) {
        Auction auction = findAuctionByListingId(listing.getId()).orElse(null);
        long totalBids = auction == null ? 0 : bidRepository.countByAuctionId(auction.getId());

        return new ListingDetailResponse(
            listing.getId(),
            listing.getTitle(),
            listing.getDescription(),
            listing.getImageUrl(),
            listing.getPrice(),
            auction == null ? null : auction.getStartingPrice(),
            auction == null ? null : auction.getReservePrice(),
            auction == null ? null : auction.getMinimumBidIncrement(),
            auction == null ? null : auction.getDurationMinutes(),
            listing.getCategory(),
            listing.getCategory().pathLabel(),
            listing.getSeller().getId(),
            listing.getSeller().getEmail(),
            listing.getStatus(),
            auction == null ? null : auction.getId(),
            auction == null ? null : auction.getStatus(),
            auction == null ? null : auction.getStartsAt(),
            auction == null ? null : auction.getEndsAt(),
            auction == null ? null : auction.getClosedAt(),
            totalBids,
            totalBids > 0,
            listing.getCreatedAt(),
            listing.getUpdatedAt(),
            listing.getCancelledAt()
        );
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

        Auction auction = findAuctionByListingId(listingId).orElse(null);
        if (auction == null || auction.getEndsAt() == null) {
            return false;
        }

        boolean matchesAfter = endingAfter == null || !auction.getEndsAt().isBefore(endingAfter);
        boolean matchesBefore = endingBefore == null || !auction.getEndsAt().isAfter(endingBefore);
        return matchesAfter && matchesBefore;
    }

    private Optional<Auction> findAuctionByListingId(UUID listingId) {
        return auctionRepository.findByListingId(listingId);
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
