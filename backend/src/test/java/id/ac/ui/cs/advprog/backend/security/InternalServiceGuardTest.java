package id.ac.ui.cs.advprog.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class InternalServiceGuardTest {

    @Test
    void verifyShouldAllowRequestsWhenTokenIsNotConfigured() {
        InternalServiceGuard guard = new InternalServiceGuard(" ");

        assertDoesNotThrow(() -> guard.verify(null));
    }

    @Test
    void verifyShouldRequireMatchingTokenWhenConfigured() {
        InternalServiceGuard guard = new InternalServiceGuard(" internal-secret ");

        assertDoesNotThrow(() -> guard.verify("internal-secret"));
        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> guard.verify("wrong-secret")
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Invalid internal service token", exception.getReason());
    }
}
