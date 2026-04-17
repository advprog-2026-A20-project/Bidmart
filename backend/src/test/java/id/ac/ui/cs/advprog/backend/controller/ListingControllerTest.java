package id.ac.ui.cs.advprog.backend.controller;

import id.ac.ui.cs.advprog.backend.model.ListingCategory;
import id.ac.ui.cs.advprog.backend.service.ListingService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ListingControllerTest {

    @Test
    void categoriesShouldReturnAllAvailableListingCategories() {
        ListingController controller = new ListingController(Mockito.mock(ListingService.class));

        List<ListingCategory> categories = controller.categories();

        assertEquals(List.of(ListingCategory.values()), categories);
    }
}
