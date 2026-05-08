package id.ac.ui.cs.advprog.authservice.dto;

import id.ac.ui.cs.advprog.authservice.model.Role;
import java.util.UUID;

public record RegisterResponse(
    UUID id,
    String email,
    Role role
) {
}
