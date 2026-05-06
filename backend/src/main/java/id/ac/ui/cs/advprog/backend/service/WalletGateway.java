package id.ac.ui.cs.advprog.backend.service;

import id.ac.ui.cs.advprog.backend.dto.WalletCaptureRequest;
import id.ac.ui.cs.advprog.backend.dto.WalletHoldRequest;
import id.ac.ui.cs.advprog.backend.dto.WalletHoldResponse;
import id.ac.ui.cs.advprog.backend.dto.WalletReleaseRequest;

public interface WalletGateway {

    WalletHoldResponse holdFunds(WalletHoldRequest request);

    void releaseFunds(WalletReleaseRequest request);

    void captureFunds(WalletCaptureRequest request);
}
