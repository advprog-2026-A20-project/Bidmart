package id.ac.ui.cs.advprog.authservice.security;

import id.ac.ui.cs.advprog.authservice.model.Role;
import java.util.UUID;

public record AuthenticatedUser(
    UUID id,
    String email,
    Role role
) {
}
