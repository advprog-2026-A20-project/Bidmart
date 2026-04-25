package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.model.User;
import java.util.UUID;

public interface UserGateway {

    User requireSeller(UUID sellerId);

    User requireBuyer(UUID buyerId);
}
