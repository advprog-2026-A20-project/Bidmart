package id.ac.ui.cs.advprog.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class InternalServiceGuard {

    public static final String INTERNAL_SERVICE_TOKEN_HEADER = "X-Internal-Service-Token";

    private final String expectedToken;

    public InternalServiceGuard(@Value("${bidmart.internal-api.token:}") String expectedToken) {
        this.expectedToken = normalize(expectedToken);
    }

    public void verify(String providedToken) {
        if (expectedToken == null) {
            return;
        }
        if (!expectedToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid internal service token");
        }
    }

    private String normalize(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return token.trim();
    }
}
