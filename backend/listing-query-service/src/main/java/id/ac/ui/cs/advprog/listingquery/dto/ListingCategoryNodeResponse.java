package id.ac.ui.cs.advprog.listingquery.dto;

import id.ac.ui.cs.advprog.listingquery.model.ListingCategory;
import java.util.List;

public record ListingCategoryNodeResponse(
    ListingCategory key,
    String label,
    String path,
    List<ListingCategoryNodeResponse> children
) {
}
