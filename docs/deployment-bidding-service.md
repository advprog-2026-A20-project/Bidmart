# Deployment Notes for Future Bidding Service

The current branch does not deploy multiple services. It keeps the monolith runnable and prepares the bidding code for later extraction.

## Current Monolith Deployment

Use local gateway mode:

```bash
BIDMART_SERVICES_MODE=local
```

The backend runs the auction domain, user/auth behavior, listing behavior, and wallet balance behavior in one Spring Boot application.

## Future Bidding Service Deployment

After extraction, deploy the bidding service with:

```bash
BIDMART_SERVICES_MODE=remote
BIDMART_USER_SERVICE_BASE_URL=https://user-service.example.internal
BIDMART_LISTING_SERVICE_BASE_URL=https://listing-service.example.internal
BIDMART_WALLET_SERVICE_BASE_URL=https://wallet-service.example.internal
```

The extracted bidding service should own only the auction, bid, and auction-event database tables. User, listing, and wallet data must be accessed through the configured gateway contracts.

## Compose File

`docker-compose.microservice-ready.yml` runs the current backend and Postgres. It contains documented placeholders for future user, listing, and wallet services, but those services are not defined until real deployable applications exist.
