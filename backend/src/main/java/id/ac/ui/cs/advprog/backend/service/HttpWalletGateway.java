package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.WalletCaptureRequest;
import id.ac.ui.cs.advprog.backend.dto.WalletHoldRequest;
import id.ac.ui.cs.advprog.backend.dto.WalletHoldResponse;
import id.ac.ui.cs.advprog.backend.dto.WalletReleaseRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@ConditionalOnProperty(name = "bidmart.services.mode", havingValue = "remote")
public class HttpWalletGateway implements WalletGateway {

    private final RestClient restClient;

    public HttpWalletGateway(@Value("${bidmart.services.wallet.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    @Override
    public WalletHoldResponse holdFunds(WalletHoldRequest request) {
        return restClient.post()
            .uri("/api/internal/wallet/holds")
            .body(request)
            .retrieve()
            .body(WalletHoldResponse.class);
    }

    @Override
    public void releaseFunds(WalletReleaseRequest request) {
        restClient.post()
            .uri("/api/internal/wallet/releases")
            .body(request)
            .retrieve()
            .toBodilessEntity();
    }

    @Override
    public void captureFunds(WalletCaptureRequest request) {
        restClient.post()
            .uri("/api/internal/wallet/captures")
            .body(request)
            .retrieve()
            .toBodilessEntity();
    }
}
