# Auction Query Service

Read-only microservice untuk endpoint auction query:

- `GET /api/auctions`
- `GET /api/auctions/{id}`
- `GET /api/auctions/{id}/bids`
- `GET /actuator/health`

## Local run

Dari root backend:

```bash
./gradlew :auction-query-service:bootRunLocal
```

Atau profile production-like:

```bash
./gradlew :auction-query-service:bootRun --args='--spring.profiles.active=staging'
```

## Required env

- `PORT` default `8081`
- `AUCTION_QUERY_DB_URL`
- `AUCTION_QUERY_DB_USERNAME`
- `AUCTION_QUERY_DB_PASSWORD`

## Build jar

```bash
./gradlew :auction-query-service:bootJar
```
