package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.UserProfileDto;
import java.util.UUID;

public interface UserGateway {

    UserProfileDto getUserProfile(UUID userId);

    UserProfileDto requireSeller(UUID sellerId);

    UserProfileDto requireBuyer(UUID buyerId);
}
