# Listing Query Service

Read-only microservice untuk public listing/catalog endpoints.

## Local run

```bash
./gradlew :listing-query-service:bootRunLocal
```

## Endpoints

- `GET /api/listings`
- `GET /api/listings/{listingId}`
- `GET /api/listings/categories`
- `GET /api/listings/categories/tree`
- `GET /actuator/health`
