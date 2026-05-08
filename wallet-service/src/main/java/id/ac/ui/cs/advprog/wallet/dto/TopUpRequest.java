package id.ac.ui.cs.advprog.wallet.dto;

import java.math.BigDecimal;

public record TopUpRequest(
    BigDecimal amount
) {}
