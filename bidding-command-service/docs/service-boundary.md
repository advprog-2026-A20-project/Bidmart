# Service Boundary - Bidding Command Service

## In Scope
- Place bid command
- Validasi bid (minimum increment, status auction, ownership)
- Auction lifecycle write-side (activate, extend, close, cancel)
- Winner determination
- Publish domain event command-side

## Out of Scope
- Auction query/read-heavy endpoint
- Listing query endpoint
- Wallet ledger detail implementation
- Auth UI/session frontend

## Coupling yang Ditemukan (TODO Strangler)
1. Validasi listing masih memanggil service internal monolith.
2. Hold/release/capture wallet perlu dipindahkan full ke API wallet service (tanpa DB sharing).
3. Profil user/bidder masih mengandalkan entity user legacy.
