package id.ac.ui.cs.advprog.authservice.dto;

import id.ac.ui.cs.advprog.authservice.model.Role;
import java.math.BigDecimal;
import java.util.UUID;

public record UserSummary(
    UUID id,
    String email,
    Role role,
    BigDecimal availableBalance,
    BigDecimal heldBalance
) {
}
