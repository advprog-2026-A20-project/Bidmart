package id.ac.ui.cs.advprog.listingquery.controller;

import id.ac.ui.cs.advprog.listingquery.dto.ListingCategoryNodeResponse;
import id.ac.ui.cs.advprog.listingquery.dto.ListingDetailResponse;
import id.ac.ui.cs.advprog.listingquery.dto.ListingResponse;
import id.ac.ui.cs.advprog.listingquery.model.ListingCategory;
import id.ac.ui.cs.advprog.listingquery.service.ListingQueryService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/listings")
public class ListingQueryController {

    private final ListingQueryService listingQueryService;

    public ListingQueryController(ListingQueryService listingQueryService) {
        this.listingQueryService = listingQueryService;
    }

    @GetMapping
    public List<ListingResponse> list(
        Pageable pageable,
        @RequestParam(required = false) ListingCategory category,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) BigDecimal minPrice,
        @RequestParam(required = false) BigDecimal maxPrice,
        @RequestParam(required = false) Instant endingAfter,
        @RequestParam(required = false) Instant endingBefore
    ) {
        return listingQueryService.getAllListings(
            pageable,
            category,
            keyword,
            minPrice,
            maxPrice,
            endingAfter,
            endingBefore
        );
    }

    @GetMapping("/{listingId}")
    public ListingDetailResponse getById(@PathVariable UUID listingId) {
        return listingQueryService.getListingDetail(listingId);
    }

    @GetMapping("/categories")
    public List<ListingCategory> categories() {
        return listingQueryService.getCategories();
    }

    @GetMapping("/categories/tree")
    public List<ListingCategoryNodeResponse> categoryTree() {
        return listingQueryService.getCategoryTree();
    }
}
