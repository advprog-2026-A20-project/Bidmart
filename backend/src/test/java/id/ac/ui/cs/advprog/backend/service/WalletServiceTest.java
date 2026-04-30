package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.TopUpRequest;
import id.ac.ui.cs.advprog.backend.dto.WalletResponse;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.model.Wallet;
import id.ac.ui.cs.advprog.backend.model.WalletTransaction;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import id.ac.ui.cs.advprog.backend.repository.WalletRepository;
import id.ac.ui.cs.advprog.backend.repository.WalletTransactionRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private WalletTransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WalletService walletService;

    @Test
    void topUpShouldIncreaseUserAvailableBalanceAndSyncWalletBalance() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
            .id(userId)
            .email("buyer@example.com")
            .passwordHash("hash")
            .role(Role.BUYER)
            .availableBalance(new BigDecimal("0.00"))
            .build();
        Wallet wallet = Wallet.builder()
            .id(UUID.randomUUID())
            .user(user)
            .balance(new BigDecimal("0.00"))
            .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(walletRepository.findByUserId(userId)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.save(any(WalletTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WalletResponse response = walletService.topUp(userId, new TopUpRequest(new BigDecimal("100000")));

        assertThat(user.getAvailableBalance()).isEqualByComparingTo("100000");
        assertThat(wallet.getBalance()).isEqualByComparingTo("100000");
        assertThat(response.balance()).isEqualByComparingTo(user.getAvailableBalance());

        ArgumentCaptor<WalletTransaction> transactionCaptor = ArgumentCaptor.forClass(WalletTransaction.class);
        verify(transactionRepository).save(transactionCaptor.capture());
        assertThat(transactionCaptor.getValue().getBalanceAfter()).isEqualByComparingTo("100000");
    }

    @Test
    void getWalletShouldReturnUserAvailableBalanceAndSyncStaleWalletBalance() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
            .id(userId)
            .email("buyer@example.com")
            .passwordHash("hash")
            .role(Role.BUYER)
            .availableBalance(new BigDecimal("100000.00"))
            .build();
        Wallet wallet = Wallet.builder()
            .id(UUID.randomUUID())
            .user(user)
            .balance(BigDecimal.ZERO)
            .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(walletRepository.findByUserId(userId)).thenReturn(Optional.of(wallet));
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WalletResponse response = walletService.getWallet(userId);

        assertThat(response.balance()).isEqualByComparingTo(user.getAvailableBalance());
        assertThat(wallet.getBalance()).isEqualByComparingTo(user.getAvailableBalance());
    }

    @Test
    void createWalletForUserShouldInitializeBalanceFromUserAvailableBalance() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
            .id(userId)
            .email("buyer@example.com")
            .passwordHash("hash")
            .role(Role.BUYER)
            .availableBalance(new BigDecimal("1000000.00"))
            .build();

        when(walletRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(walletRepository.save(any(Wallet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        walletService.createWalletForUser(user);

        ArgumentCaptor<Wallet> walletCaptor = ArgumentCaptor.forClass(Wallet.class);
        verify(walletRepository).save(walletCaptor.capture());
        assertThat(walletCaptor.getValue().getBalance()).isEqualByComparingTo(user.getAvailableBalance());
    }
}
