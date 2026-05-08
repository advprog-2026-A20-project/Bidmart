package id.ac.ui.cs.advprog.authservice.dto;

import id.ac.ui.cs.advprog.authservice.model.Role;

public record AuthResponse(
    String token,
    String email,
    Role role
) {
}
