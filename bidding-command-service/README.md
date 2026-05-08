# bidmart-bidding-command-service

## Fungsi Service
Service command/write-side untuk bidding dan auction lifecycle: place bid, validasi bid, anti-sniping extension, close/cancel auction, winner determination, dan publish event domain.

## Batasan vs auction-query-service
- **Di sini (command):** mutasi state auction & bid.
- **Di auction-query-service:** endpoint read-heavy (history, summary, listing agregasi, dsb).

## Data Ownership
- `auction`
- `bid`
- `auction_event` (outbox/event log)

## Endpoint Command (minimum)
- `POST /bids`
- `POST /auctions/{auctionId}/bids`
- `POST /auctions/{auctionId}/close`
- `POST /auctions/{auctionId}/cancel` (opsional, sesuai rule bisnis)

## Event Contract (minimum)
- `BidPlaced`
- `AuctionExtended`
- `AuctionClosed`
- `WinnerDetermined`
- `AuctionUnsold`

## Dependency Contract
- **Auth/User service:** validasi token, profil user, permission.
- **Listing service:** validasi snapshot listing/status sebelum menerima bid.
- **Wallet service:** hold fund, release hold, capture hold.
- **Auction query service:** tidak wajib untuk command path.

## Risiko Teknis
- concurrent bid race condition
- double hold di wallet jika idempotency belum ketat
- stale read model antara command vs query
- coupling legacy ke model/repository service lain masih ada (lihat `docs/service-boundary.md`)

## Cara Run Lokal
1. Siapkan Java 21 + Gradle.
2. Integrasikan class hasil ekstraksi ini ke bootstrap Spring Boot service baru.
3. Siapkan DB schema auction/bid/event.
4. Konfigurasi endpoint auth/listing/wallet.

## Cara Test
- Unit test: validasi bidding rules, anti-sniping, winner determination.
- Integration test: transaksi `POST /auctions/{id}/bids` + wallet hold/release/capture.
- Contract test: payload event (`BidPlaced`, `AuctionClosed`, dll) & dependency API.

## Coupling yang masih harus diputus
- Akses langsung entity `User`/`Listing` legacy pada flow bid.
- Implementasi gateway ke service eksternal masih memakai service in-process dari monolith.
- Endpoint read di controller monolith masih bercampur dengan command endpoint.
