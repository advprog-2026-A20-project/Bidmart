package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.UserProfileDto;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@ConditionalOnProperty(name = "bidmart.services.mode", havingValue = "local", matchIfMissing = true)
public class LocalUserGateway implements UserGateway {

    private final UserRepository userRepository;

    public LocalUserGateway(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserProfileDto getUserProfile(UUID userId) {
        return toProfile(loadUser(userId));
    }

    @Override
    public UserProfileDto requireSeller(UUID sellerId) {
        return loadUserByRole(sellerId, Role.SELLER, "Only SELLER can manage auctions");
    }

    @Override
    public UserProfileDto requireBuyer(UUID buyerId) {
        return loadUserByRole(buyerId, Role.BUYER, "Only BUYER can place bids");
    }

    private UserProfileDto loadUserByRole(UUID userId, Role expectedRole, String roleErrorMessage) {
        User user = loadUser(userId);
        if (user.getRole() != expectedRole) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, roleErrorMessage);
        }
        return toProfile(user);
    }

    private User loadUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private UserProfileDto toProfile(User user) {
        return new UserProfileDto(user.getId(), user.getEmail(), user.getRole(), true);
    }
}
