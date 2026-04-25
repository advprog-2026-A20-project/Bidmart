package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LocalUserGateway implements UserGateway {

    private final UserRepository userRepository;

    public LocalUserGateway(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public User requireSeller(UUID sellerId) {
        return loadUserByRole(sellerId, Role.SELLER, "Only SELLER can manage auctions");
    }

    @Override
    public User requireBuyer(UUID buyerId) {
        return loadUserByRole(buyerId, Role.BUYER, "Only BUYER can place bids");
    }

    private User loadUserByRole(UUID userId, Role expectedRole, String roleErrorMessage) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (user.getRole() != expectedRole) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, roleErrorMessage);
        }
        return user;
    }
}
