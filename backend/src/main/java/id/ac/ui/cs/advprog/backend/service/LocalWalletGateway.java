package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LocalWalletGateway implements WalletGateway {

    private final UserRepository userRepository;

    public LocalWalletGateway(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void holdFunds(UUID userId, UUID auctionId, BigDecimal amount) {
        BigDecimal sanitizedAmount = sanitizeAmount(amount);
        if (sanitizedAmount.signum() == 0) {
            return;
        }

        User user = loadUser(userId);
        BigDecimal availableBalance = defaultAmount(user.getAvailableBalance());
        if (availableBalance.compareTo(sanitizedAmount) < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient balance for this bid");
        }

        user.setAvailableBalance(availableBalance.subtract(sanitizedAmount));
        user.setHeldBalance(defaultAmount(user.getHeldBalance()).add(sanitizedAmount));
        userRepository.save(user);
    }

    @Override
    public void releaseFunds(UUID userId, UUID auctionId, BigDecimal amount) {
        BigDecimal sanitizedAmount = sanitizeAmount(amount);
        if (sanitizedAmount.signum() == 0) {
            return;
        }

        User user = loadUser(userId);
        BigDecimal heldBalance = defaultAmount(user.getHeldBalance());
        if (heldBalance.compareTo(sanitizedAmount) < 0) {
            throw new IllegalStateException("Held balance is smaller than the released amount");
        }

        user.setHeldBalance(heldBalance.subtract(sanitizedAmount));
        user.setAvailableBalance(defaultAmount(user.getAvailableBalance()).add(sanitizedAmount));
        userRepository.save(user);
    }

    @Override
    public void captureFunds(UUID userId, UUID auctionId, BigDecimal amount) {
        BigDecimal sanitizedAmount = sanitizeAmount(amount);
        if (sanitizedAmount.signum() == 0) {
            return;
        }

        User user = loadUser(userId);
        BigDecimal heldBalance = defaultAmount(user.getHeldBalance());
        if (heldBalance.compareTo(sanitizedAmount) < 0) {
            throw new IllegalStateException("Held balance is smaller than the captured amount");
        }

        user.setHeldBalance(heldBalance.subtract(sanitizedAmount));
        userRepository.save(user);
    }

    private User loadUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private BigDecimal sanitizeAmount(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return amount;
    }
}

