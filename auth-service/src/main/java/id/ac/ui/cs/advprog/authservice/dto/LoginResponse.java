package id.ac.ui.cs.advprog.authservice.dto;

public record LoginResponse(
    String accessToken,
    UserSummary user
) {
}
