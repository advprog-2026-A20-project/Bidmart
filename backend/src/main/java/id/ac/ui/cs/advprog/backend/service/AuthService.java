package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.LoginRequest;
import id.ac.ui.cs.advprog.backend.dto.LoginResponse;
import id.ac.ui.cs.advprog.backend.dto.RegisterRequest;
import id.ac.ui.cs.advprog.backend.dto.RegisterResponse;
import id.ac.ui.cs.advprog.backend.dto.UserSummary;
import id.ac.ui.cs.advprog.backend.model.Role;
import id.ac.ui.cs.advprog.backend.model.User;
import id.ac.ui.cs.advprog.backend.repository.UserRepository;
import id.ac.ui.cs.advprog.backend.security.JwtService;
import java.time.Instant;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public RegisterResponse register(RegisterRequest request) {
        if (request.email() == null || request.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (!EMAIL_PATTERN.matcher(request.email()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email format is invalid");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }
        if (request.password().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        if (request.role() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be BUYER or SELLER");
        }
        Role role = request.role();
        if (role != Role.BUYER && role != Role.SELLER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be BUYER or SELLER");
        }

        User user = User.builder()
            .email(request.email())
            .passwordHash(passwordEncoder.encode(request.password()))
            .role(role)
            .createdAt(Instant.now())
            .build();

        User saved = userRepository.save(user);
        return new RegisterResponse(saved.getId(), saved.getEmail(), saved.getRole());
    }

    public LoginResponse login(LoginRequest request) {
        if (request.email() == null || request.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateToken(user);
        UserSummary summary = new UserSummary(user.getId(), user.getEmail(), user.getRole());
        return new LoginResponse(token, summary);
    }
}
