# API Contract - bidmart-auth-service

## Public Endpoints

### `POST /auth/register`
Registrasi user baru (BUYER/SELLER).

### `POST /auth/login`
Login dengan email + password, menghasilkan access token.

### `POST /auth/refresh` (TODO)
Refresh access token memakai refresh token/session.

### `POST /auth/logout` (TODO)
Logout dan revoke token/session.

### `GET /users/{userId}/profile` (TODO)
Ambil profil user berdasarkan userId.

## Internal Endpoints

### `POST /internal/auth/validate-token` (TODO)
Validasi token untuk service-to-service call.

### `GET /internal/users/{userId}/permissions` (TODO)
Ambil daftar permission efektif user.
