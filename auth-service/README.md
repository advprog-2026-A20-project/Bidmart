# bidmart-auth-service

## Fungsi Service
`bidmart-auth-service` adalah service khusus **authentication, authorization, user, role, permission, token, dan session policy** pada arsitektur microservice BidMart.

## Data Ownership
Service ini memiliki ownership untuk:
- Data user (akun, email, password hash, role)
- Data autentikasi (JWT policy, refresh/logout session policy)
- Data authorization (role/permission mapping)

Service lain **tidak boleh** mengakses tabel user/auth langsung.

## API Contract (Minimum)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh` *(TODO implementasi refresh token store/rotation)*
- `POST /auth/logout` *(TODO implementasi token revocation/session invalidation)*
- `GET /users/{userId}/profile` *(TODO endpoint profile dedicated di service ini)*
- `POST /internal/auth/validate-token` *(TODO untuk kebutuhan service-to-service auth)*
- `GET /internal/users/{userId}/permissions` *(TODO permission endpoint internal)*

Lihat detail kontrak di `docs/api-contract.md`.

## Dependency ke Database
- PostgreSQL (atau DB relasional lain) untuk user/auth data.
- Pada fase awal, entity/repository masih baseline hasil ekstraksi dari monolith.

## Service yang Bergantung pada Auth Service
- `bidmart-gateway` (auth proxy / token forwarding)
- `bidmart-bidding-command-service` (validasi token, role BUYER/SELLER)
- `bidmart-listing-query-service` (profil seller/public data via API)
- `bidmart-wallet-service` (validasi identity dan permission)

## Cara Run Lokal
1. Siapkan JDK 21+ dan Gradle.
2. Salin konfigurasi contoh:
   - gunakan `application-example.yml` sebagai basis `application.yml`.
3. Jalankan service (setelah bootstrap app class ditambahkan):
   - `./gradlew bootRun`

## Cara Test
- Unit test:
  - `./gradlew test`
- Contract/API check (manual):
  - `POST /auth/register`
  - `POST /auth/login`

## Coupling yang Masih Harus Diputus (TODO)
- Security config masih memuat aturan endpoint domain lain dari monolith.
- JWT flow baru access token; refresh/logout belum final.
- Permission model internal belum dipisah penuh dari role enum sederhana.
- Profile endpoint user masih tersebar dan perlu dikonsolidasi di auth service.
