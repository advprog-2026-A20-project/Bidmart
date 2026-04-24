package id.ac.ui.cs.advprog.listingquery;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:listingquerytest;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
@ActiveProfiles("local")
@Transactional
class ListingQueryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        entityManager.createNativeQuery("delete from bid").executeUpdate();
        entityManager.createNativeQuery("delete from auction").executeUpdate();
        entityManager.createNativeQuery("delete from listing").executeUpdate();
        entityManager.createNativeQuery("delete from app_user").executeUpdate();
    }

    @Test
    void healthcheckShouldBeAvailable() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void readEndpointsShouldReturnListingSummariesDetailsAndCategories() throws Exception {
        String sellerId = insertUser("seller@example.com");
        insertUser("buyer@example.com");
        String listingId = insertListing(sellerId);
        String auctionId = insertAuction(listingId);
        insertBid(auctionId);

        mockMvc.perform(get("/api/listings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(listingId))
            .andExpect(jsonPath("$[0].sellerEmail").value("seller@example.com"))
            .andExpect(jsonPath("$[0].auctionId").value(auctionId))
            .andExpect(jsonPath("$[0].totalBids").value(1));

        mockMvc.perform(get("/api/listings/{listingId}", listingId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(listingId))
            .andExpect(jsonPath("$.category").value("ELECTRONICS"))
            .andExpect(jsonPath("$.auctionId").value(auctionId))
            .andExpect(jsonPath("$.hasBids").value(true));

        mockMvc.perform(get("/api/listings/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0]").value("ELECTRONICS"));

        mockMvc.perform(get("/api/listings/categories/tree"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].key").value("ELECTRONICS"))
            .andExpect(jsonPath("$[0].children[0].key").value("ELECTRONICS_PHONE"));
    }

    private String insertUser(String email) {
        String id = UUID.randomUUID().toString();
        entityManager.createNativeQuery("""
            insert into app_user (id, email)
            values (?, ?)
            """)
            .setParameter(1, id)
            .setParameter(2, email)
            .executeUpdate();
        return id;
    }

    private String insertListing(String sellerId) {
        String id = UUID.randomUUID().toString();
        entityManager.createNativeQuery("""
            insert into listing (id, title, description, image_url, price, category, seller_id, status, created_at, updated_at, cancelled_at)
            values (?, 'Gaming Phone', 'Competitive smartphone', 'https://img.example/phone.jpg', 1200.00, 'ELECTRONICS', ?, 'ACTIVE', ?, null, null)
            """)
            .setParameter(1, id)
            .setParameter(2, sellerId)
            .setParameter(3, Instant.now().truncatedTo(ChronoUnit.SECONDS))
            .executeUpdate();
        return id;
    }

    private String insertAuction(String listingId) {
        String id = UUID.randomUUID().toString();
        Instant createdAt = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        entityManager.createNativeQuery("""
            insert into auction (
                id, listing_id, status, starting_price, reserve_price, minimum_bid_increment,
                duration_minutes, created_at, starts_at, ends_at, closed_at
            ) values (?, ?, 'ACTIVE', 1200.00, 1200.00, 10.00, 60, ?, ?, ?, null)
            """)
            .setParameter(1, id)
            .setParameter(2, listingId)
            .setParameter(3, createdAt)
            .setParameter(4, createdAt)
            .setParameter(5, createdAt.plus(2, ChronoUnit.HOURS))
            .executeUpdate();
        return id;
    }

    private void insertBid(String auctionId) {
        entityManager.createNativeQuery("""
            insert into bid (id, auction_id, amount)
            values (?, ?, 1250.00)
            """)
            .setParameter(1, UUID.randomUUID().toString())
            .setParameter(2, auctionId)
            .executeUpdate();
    }
}
