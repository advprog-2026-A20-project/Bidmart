package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocalUserGatewayTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LocalUserGateway localUserGateway;

    @Test
    void requireSellerReturnsSellerWhenRoleMatches() {
        UUID sellerId = UUID.randomUUID();
        User seller = User.builder().id(sellerId).role(Role.SELLER).build();
        when(userRepository.findById(sellerId)).thenReturn(Optional.of(seller));

        User result = localUserGateway.requireSeller(sellerId);

        assertSame(seller, result);
    }

    @Test
    void requireSellerRejectsNonSellerRole() {
        UUID buyerId = UUID.randomUUID();
        User buyer = User.builder().id(buyerId).role(Role.BUYER).build();
        when(userRepository.findById(buyerId)).thenReturn(Optional.of(buyer));

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> localUserGateway.requireSeller(buyerId)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Only SELLER can manage auctions", exception.getReason());
    }

    @Test
    void requireBuyerRejectsMissingUser() {
        UUID buyerId = UUID.randomUUID();
        when(userRepository.findById(buyerId)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> localUserGateway.requireBuyer(buyerId)
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        assertEquals("User not found", exception.getReason());
    }
}
