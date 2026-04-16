package id.ac.ui.cs.advprog.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import id.ac.ui.cs.advprog.backend.model.Auction;
import id.ac.ui.cs.advprog.backend.model.AuctionStatus;
import id.ac.ui.cs.advprog.backend.model.ListingCategory;
import id.ac.ui.cs.advprog.backend.model.Listing;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.AuctionRepository;
import id.ac.ui.cs.advprog.backend.repository.BidRepository;
import id.ac.ui.cs.advprog.backend.repository.ListingRepository;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import id.ac.ui.cs.advprog.backend.security.JwtService;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "security.jwt.secret=test-secret-please-change-32-chars",
    "security.jwt.expiration-seconds=3600"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MarketplaceFoundationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ListingRepository listingRepository;

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private BidRepository bidRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        bidRepository.deleteAll();
        auctionRepository.deleteAll();
        listingRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void registerShouldCreateUser() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "seller@example.com",
                      "password": "password123",
                      "role": "SELLER"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("seller@example.com"))
            .andExpect(jsonPath("$.role").value("SELLER"));
    }

    @Test
    void registerShouldRejectInvalidPayload() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "",
                      "password": "short"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Request validation failed"))
            .andExpect(jsonPath("$.fieldErrors.email").value("Email is required"))
            .andExpect(jsonPath("$.fieldErrors.password").value("Password must be at least 8 characters"))
            .andExpect(jsonPath("$.fieldErrors.role").value("Role is required"));
    }

    @Test
    void loginShouldRejectInvalidCredentials() throws Exception {
        User buyer = createUser("buyer@example.com", "password123", Role.BUYER);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new LoginPayload(buyer.getEmail(), "wrong-password")
                )))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    @Test
    void loginShouldAcceptEmailWithDifferentCase() throws Exception {
        createUser("buyer@example.com", "password123", Role.BUYER);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "BUYER@EXAMPLE.COM",
                      "password": "password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.email").value("buyer@example.com"))
            .andExpect(jsonPath("$.accessToken").isString());
    }

    @Test
    void registerShouldRejectDuplicateEmailIgnoringCase() throws Exception {
        createUser("seller@example.com", "password123", Role.SELLER);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "SELLER@example.com",
                      "password": "password123",
                      "role": "SELLER"
                    }
                    """))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value("Email already registered"));
    }

    @Test
    void meShouldReturnAuthenticatedUser() throws Exception {
        User buyer = createUser("buyer@example.com", "password123", Role.BUYER);

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", bearerToken(buyer)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(buyer.getId().toString()))
            .andExpect(jsonPath("$.email").value("buyer@example.com"))
            .andExpect(jsonPath("$.role").value("BUYER"));
    }

    @Test
    void meShouldRejectUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Authentication is required"));
    }

    @Test
    void meShouldRejectInvalidToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer invalid-token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Authentication is required"));
    }

    @Test
    void createListingShouldRejectUnauthenticatedRequest() throws Exception {
        mockMvc.perform(post("/api/listings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Mechanical Keyboard",
                      "description": "Hot-swappable keyboard",
                      "price": 1500000,
                      "category": "ELECTRONICS"
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Authentication is required"));
    }

    @Test
    void createListingShouldAllowSeller() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);

        mockMvc.perform(post("/api/listings")
                .header("Authorization", bearerToken(seller))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Mechanical Keyboard",
                      "description": "Hot-swappable keyboard",
                      "price": 1500000,
                      "category": "ELECTRONICS"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Mechanical Keyboard"))
            .andExpect(jsonPath("$.category").value("ELECTRONICS"))
            .andExpect(jsonPath("$.sellerId").value(seller.getId().toString()));
    }

    @Test
    void getListingByIdShouldReturnActiveListing() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);
        Listing listing = listingRepository.save(Listing.builder()
            .title("Camera")
            .description("Mirrorless camera")
            .price(new BigDecimal("2500000.00"))
            .category(ListingCategory.ELECTRONICS)
            .seller(seller)
            .build());

        mockMvc.perform(get("/api/listings/{listingId}", listing.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(listing.getId().toString()))
            .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void updateListingShouldAllowOwnerBeforeBid() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);
        Listing listing = listingRepository.save(Listing.builder()
            .title("Old title")
            .description("Old description")
            .price(new BigDecimal("100.00"))
            .category(ListingCategory.BOOKS)
            .seller(seller)
            .build());

        mockMvc.perform(put("/api/listings/{listingId}", listing.getId())
                .header("Authorization", bearerToken(seller))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "New title",
                      "description": "New description",
                      "price": 150.00,
                      "category": "ELECTRONICS"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("New title"))
            .andExpect(jsonPath("$.category").value("ELECTRONICS"))
            .andExpect(jsonPath("$.status").value("ACTIVE"))
            .andExpect(jsonPath("$.updatedAt").isNotEmpty());
    }

    @Test
    void updateListingShouldRejectNonOwnerSeller() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);
        User otherSeller = createUser("other@example.com", "password123", Role.SELLER);
        Listing listing = listingRepository.save(Listing.builder()
            .title("Old title")
            .description("Old description")
            .price(new BigDecimal("100.00"))
            .category(ListingCategory.BOOKS)
            .seller(seller)
            .build());

        mockMvc.perform(put("/api/listings/{listingId}", listing.getId())
                .header("Authorization", bearerToken(otherSeller))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "New title",
                      "description": "New description",
                      "price": 150.00,
                      "category": "ELECTRONICS"
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("You do not own this listing"));
    }

    @Test
    void updateListingShouldRejectWhenListingAlreadyBelongsToAuction() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);
        Listing listing = listingRepository.save(Listing.builder()
            .title("Old title")
            .description("Old description")
            .price(new BigDecimal("100.00"))
            .category(ListingCategory.BOOKS)
            .seller(seller)
            .build());
        createAuctionFor(listing);

        mockMvc.perform(put("/api/listings/{listingId}", listing.getId())
                .header("Authorization", bearerToken(seller))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "New title",
                      "description": "New description",
                      "price": 150.00,
                      "category": "ELECTRONICS"
                    }
                    """))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value("Listing cannot be modified because it already belongs to an auction"));
    }

    @Test
    void cancelListingShouldMarkListingAsCancelled() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);
        Listing listing = listingRepository.save(Listing.builder()
            .title("Camera")
            .description("Mirrorless camera")
            .price(new BigDecimal("2500000.00"))
            .category(ListingCategory.ELECTRONICS)
            .seller(seller)
            .build());

        mockMvc.perform(delete("/api/listings/{listingId}", listing.getId())
                .header("Authorization", bearerToken(seller)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CANCELLED"))
            .andExpect(jsonPath("$.cancelledAt").isNotEmpty());

        mockMvc.perform(get("/api/listings"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void cancelListingShouldRejectWhenListingAlreadyBelongsToAuction() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);
        Listing listing = listingRepository.save(Listing.builder()
            .title("Camera")
            .description("Mirrorless camera")
            .price(new BigDecimal("2500000.00"))
            .category(ListingCategory.ELECTRONICS)
            .seller(seller)
            .build());
        createAuctionFor(listing);

        mockMvc.perform(delete("/api/listings/{listingId}", listing.getId())
                .header("Authorization", bearerToken(seller)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value("Listing cannot be modified because it already belongs to an auction"));
    }

    @Test
    void createListingShouldRejectBuyer() throws Exception {
        User buyer = createUser("buyer@example.com", "password123", Role.BUYER);

        mockMvc.perform(post("/api/listings")
                .header("Authorization", bearerToken(buyer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Mechanical Keyboard",
                      "description": "Hot-swappable keyboard",
                      "price": 1500000,
                      "category": "ELECTRONICS"
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void createListingShouldRejectInvalidPayload() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);

        mockMvc.perform(post("/api/listings")
                .header("Authorization", bearerToken(seller))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "",
                      "description": "",
                      "price": 0,
                      "category": "OTHER"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Request validation failed"))
            .andExpect(jsonPath("$.fieldErrors.title").value("Title is required"))
            .andExpect(jsonPath("$.fieldErrors.description").value("Description is required"))
            .andExpect(jsonPath("$.fieldErrors.price").value("Price must be positive"));
    }

    @Test
    void listListingsShouldHandleZeroPageSizeSafely() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);
        listingRepository.save(Listing.builder()
            .title("Camera")
            .description("Mirrorless camera")
            .price(new BigDecimal("2500000.00"))
            .category(ListingCategory.ELECTRONICS)
            .seller(seller)
            .build());

        mockMvc.perform(get("/api/listings").param("size", "0"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].title").value("Camera"));
    }

    @Test
    void listListingsShouldBePublic() throws Exception {
        mockMvc.perform(get("/api/listings"))
            .andExpect(status().isOk());
    }

    @Test
    void listListingsShouldFilterByCategoryKeywordAndPriceRange() throws Exception {
        User seller = createUser("seller@example.com", "password123", Role.SELLER);
        listingRepository.save(Listing.builder()
            .title("Gaming Laptop")
            .description("High performance electronics")
            .price(new BigDecimal("1200.00"))
            .category(ListingCategory.ELECTRONICS)
            .seller(seller)
            .build());
        listingRepository.save(Listing.builder()
            .title("Novel Book")
            .description("Fiction book")
            .price(new BigDecimal("25.00"))
            .category(ListingCategory.BOOKS)
            .seller(seller)
            .build());

        mockMvc.perform(get("/api/listings")
                .param("category", "ELECTRONICS")
                .param("keyword", "laptop")
                .param("minPrice", "1000")
                .param("maxPrice", "1500"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].title").value("Gaming Laptop"))
            .andExpect(jsonPath("$[0].category").value("ELECTRONICS"));
    }

    @Test
    void listListingsShouldRejectInvalidPriceRange() throws Exception {
        mockMvc.perform(get("/api/listings")
                .param("minPrice", "200")
                .param("maxPrice", "100"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("minPrice cannot be greater than maxPrice"));
    }

    @Test
    void listCategoriesShouldReturnAvailableCategoryOptions() throws Exception {
        mockMvc.perform(get("/api/listings/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0]").value("ELECTRONICS"));
    }

    private User createUser(String email, String rawPassword, Role role) {
        return userRepository.save(User.builder()
            .email(email)
            .passwordHash(passwordEncoder.encode(rawPassword))
            .role(role)
            .build());
    }

    private Auction createAuctionFor(Listing listing) {
        Listing managedListing = listingRepository.findById(listing.getId()).orElseThrow();
        return auctionRepository.save(Auction.builder()
            .listing(managedListing)
            .status(AuctionStatus.DRAFT)
            .startingPrice(managedListing.getPrice())
            .reservePrice(managedListing.getPrice())
            .minimumBidIncrement(new BigDecimal("10.00"))
            .durationMinutes(60L)
            .createdAt(Instant.now())
            .build());
    }

    private String bearerToken(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private record LoginPayload(String email, String password) {
    }
}
