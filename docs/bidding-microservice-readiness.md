# Bidding Microservice Readiness

## Current Status

This branch keeps BidMart running as a Spring Boot monolith, but the bidding and auction domain is prepared as an extractable bounded context. The auction business logic no longer calls user, listing, or wallet repositories directly and no longer receives `User` or `Listing` JPA entities through gateway interfaces.

Actual service extraction is intentionally deferred. A future bidding service should be able to move the auction, bid, auction-event, controller, DTO, repository, and service code with minimal business-logic changes.

## What Has Been Decoupled

- `AuctionService` depends on `UserGateway`, `ListingGateway`, and `WalletGateway` contracts.
- Gateway interfaces exchange DTO records instead of JPA entities.
- `Auction` stores listing and seller snapshots needed by the bidding API: listing ID, seller ID, seller email, title, description, and current price.
- `Bid` stores bidder ID and bidder email instead of a `User` entity reference.
- Local gateway adapters keep the current repository-backed monolith behavior.
- Remote gateway adapters are enabled only when `bidmart.services.mode=remote`.

## Bidding-Owned Data

The bidding bounded context owns:

- `Auction`
- `Bid`
- `AuctionEvent`
- auction lifecycle rules
- bid validation rules
- bid sequencing
- reserve-price resolution
- auction extension behavior
- auction response DTOs and controller API

## External Dependencies

The bidding context depends on external contexts through contracts:

- User context: validate buyer/seller role and read a minimal user profile.
- Listing context: create the listing used by a new auction and update its auction price.
- Wallet context: hold, release, and capture bidder funds.

## Gateway Contracts

`UserGateway`:

- `getUserProfile(UUID userId)`
- `requireSeller(UUID sellerId)`
- `requireBuyer(UUID buyerId)`

`ListingGateway`:

- `createAuctionListing(AuctionListingCreateRequest request)`
- `getListingSnapshot(UUID listingId)`
- `updateAuctionPrice(UUID listingId, BigDecimal updatedPrice)`

`WalletGateway`:

- `holdFunds(WalletHoldRequest request)`
- `releaseFunds(WalletReleaseRequest request)`
- `captureFunds(WalletCaptureRequest request)`

## Local Mode

Local mode is the default:

```properties
bidmart.services.mode=local
```

In local mode, the monolith uses:

- `LocalUserGateway`
- `LocalListingGateway`
- `LocalWalletGateway`

These adapters may use repositories because they are infrastructure adapters. `AuctionService` itself must remain repository-free for user, listing, and wallet data.

## Remote Mode

Remote mode is enabled with:

```properties
bidmart.services.mode=remote
bidmart.services.user.base-url=http://localhost:8081
bidmart.services.listing.base-url=http://localhost:8082
bidmart.services.wallet.base-url=http://localhost:8083
```

In remote mode, Spring wires:

- `HttpUserGateway`
- `HttpListingGateway`
- `HttpWalletGateway`

The remote URLs are configurable and are not hardcoded in business logic.

## Config Properties

- `BIDMART_SERVICES_MODE`: `local` or `remote`; defaults to `local`.
- `BIDMART_USER_SERVICE_BASE_URL`: base URL for the future user service.
- `BIDMART_LISTING_SERVICE_BASE_URL`: base URL for the future listing service.
- `BIDMART_WALLET_SERVICE_BASE_URL`: base URL for the future wallet service.

## Future Extraction Steps

1. Create a new Spring Boot bidding service.
2. Move auction-owned code: auction controller, auction service, auction DTOs, auction/bid/event models, and auction repositories.
3. Keep the gateway interfaces and use the HTTP gateway implementations.
4. Give the bidding service its own database schema for `auction`, `bid`, and `auction_event`.
5. Replace local gateway adapters with HTTP clients or event-driven clients in the extracted service.
6. Define the internal APIs for user, listing, and wallet services to match the DTO contracts.
7. Add idempotency and retry handling around wallet hold/release/capture calls before production traffic.
8. Add an outbox relay if auction events need guaranteed delivery to other services.

## Deployment Checklist

- Keep `BIDMART_SERVICES_MODE=local` for the current monolith deployment.
- Use `docker-compose.microservice-ready.yml` only as a monolith deployment baseline with future-service placeholders.
- For extracted bidding deployment, set `BIDMART_SERVICES_MODE=remote`.
- Configure user, listing, and wallet base URLs per environment.
- Provision a bidding-owned database.
- Add health checks for remote dependencies.
- Add contract tests between bidding and user/listing/wallet services.
