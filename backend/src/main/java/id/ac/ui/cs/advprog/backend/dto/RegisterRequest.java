package id.ac.ui.cs.advprog.backend.dto;

import id.ac.ui.cs.advprog.backend.model.Role;

public record RegisterRequest(
    String email,
    String password,
    Role role
) {
}
