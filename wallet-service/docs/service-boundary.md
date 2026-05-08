# Service Boundary - bidmart-wallet-service

## In-scope
- Wallet balance (available/held)
- Top up & withdraw
- Hold/release/capture fund
- Wallet transaction history
- Audit trail wallet mutation

## Out-of-scope
- Bidding rule engine
- Auction lifecycle
- Listing/catalog
- AuthN/AuthZ core
- Notification delivery

## Upstream/Downstream
- Upstream caller utama: `bidmart-bidding-command-service`
- Downstream opsional: payment gateway (top-up/withdraw settlement), notification service (event)

## Anti-corruption rule
Bidding command service hanya boleh menggunakan API contract wallet service. Tidak boleh query/update tabel wallet langsung.
