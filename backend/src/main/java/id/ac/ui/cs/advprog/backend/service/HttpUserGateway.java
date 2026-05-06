package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.UserProfileDto;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@ConditionalOnProperty(name = "bidmart.services.mode", havingValue = "remote")
public class HttpUserGateway implements UserGateway {

    private final RestClient restClient;

    public HttpUserGateway(@Value("${bidmart.services.user.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    @Override
    public UserProfileDto getUserProfile(UUID userId) {
        return restClient.get()
            .uri("/api/internal/users/{userId}", userId)
            .retrieve()
            .body(UserProfileDto.class);
    }

    @Override
    public UserProfileDto requireSeller(UUID sellerId) {
        return restClient.get()
            .uri("/api/internal/users/{userId}/seller", sellerId)
            .retrieve()
            .body(UserProfileDto.class);
    }

    @Override
    public UserProfileDto requireBuyer(UUID buyerId) {
        return restClient.get()
            .uri("/api/internal/users/{userId}/buyer", buyerId)
            .retrieve()
            .body(UserProfileDto.class);
    }
}
