package id.ac.ui.cs.advprog.backend.dto;

import id.ac.ui.cs.advprog.backend.model.Role;
import java.util.UUID;

public record UserProfileDto(
    UUID id,
    String email,
    Role role,
    boolean active
) {
}
