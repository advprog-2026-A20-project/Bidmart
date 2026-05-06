package id.ac.ui.cs.advprog.backend.listing.port;

import id.ac.ui.cs.advprog.backend.model.Role;
import java.util.UUID;

public record ListingSellerSnapshot(
    UUID id,
    String email,
    Role role
) {
    public boolean canSell() {
        return role == Role.SELLER;
    }
}
