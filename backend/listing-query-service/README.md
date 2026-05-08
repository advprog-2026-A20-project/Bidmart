# Bidmart Listing Query Service

Read-only service untuk listing query di Bidmart.

## Responsibilities

- Read listing catalog
- Read listing detail
- Read listing categories
- Expose health check

## Endpoints

```txt
GET /api/listings
GET /api/listings/{listingId}
GET /api/listings/categories
GET /api/listings/categories/tree
GET /actuator/health
```

## Local development

Run test:

```bash
./gradlew test
```

Build jar:

```bash
./gradlew bootJar
```

Build Docker image:

```bash
docker build -t bidmart-listing-query-service .
```

Run Docker container:

```bash
docker run --env-file .env -p 8082:8082 bidmart-listing-query-service
```

## Environment variables

```txt
PORT
SPRING_PROFILES_ACTIVE
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
```

## Migration status

This service is extracted from the legacy Bidmart gateway/monolith as the second read-side microservice candidate.

Current phase:

```txt
gateway + auction-query-service + listing-query-service
```

Not included yet:

```txt
listing-command-service
auction-command-service
wallet-service
auth-service
bid-service
notification-service
```
