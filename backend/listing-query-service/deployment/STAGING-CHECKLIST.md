# Listing Query Service Staging Checklist

## 1. Preconditions

- Staging frontend tetap rewrite `/api/*` ke monolith staging
- Monolith staging dan `listing-query-service` staging bisa mengakses DB staging yang sama atau DB clone yang berisi data uji
- `listing-query-service` healthcheck tersedia di `/actuator/health`
- Monolith staging masih bisa melayani `/api/listings*` secara local bila proxy dimatikan

## 2. Build commands

Monolith:

```bash
./gradlew test
```

Listing query service:

```bash
./gradlew :listing-query-service:test :listing-query-service:bootJar
```

Frontend build:

```bash
cd ../frontend
./node_modules/.bin/vite build --configLoader runner --outDir /tmp/bidmart-frontend-dist --emptyOutDir
```

## 3. Deploy listing-query-service staging

1. Build artifact:
   - `./gradlew :listing-query-service:bootJar`
2. Deploy `listing-query-service` sebagai service terpisah
3. Gunakan profile `staging`
4. Set healthcheck ke `/actuator/health`
5. Set env:
   - `PORT=8082`
   - `SPRING_PROFILES_ACTIVE=staging`
   - `LISTING_QUERY_DB_URL`
   - `LISTING_QUERY_DB_USERNAME`
   - `LISTING_QUERY_DB_PASSWORD`
6. Verifikasi:
   - `GET <listing-query-staging-url>/actuator/health` harus `UP`
   - `GET <listing-query-staging-url>/api/listings/categories` harus `200`
   - `GET <listing-query-staging-url>/api/listings` harus `200`

## 4. DB connectivity check

- Verifikasi service boot normal tanpa error datasource
- Verifikasi log startup tidak menunjukkan auth/query/DDL failure
- Verifikasi endpoint `GET /api/listings/categories` berhasil, karena endpoint ini read sederhana dan cepat untuk health smoke
- Verifikasi `GET /api/listings` bisa membaca data sample staging

## 5. Deploy monolith staging for shadow validation

Start dengan mode `SHADOW`, bukan `PERCENT` atau `FULL`.

Env monolith staging:

- `LISTING_QUERY_SERVICE_ENABLED=false`
- `LISTING_QUERY_SERVICE_BASE_URL=<listing-query-staging-url>`
- `LISTING_QUERY_SERVICE_FAIL_OPEN=true`
- `LISTING_QUERY_SERVICE_ROLLOUT_MODE=SHADOW`
- `LISTING_QUERY_SERVICE_ROLLOUT_PERCENT=0`
- `LISTING_QUERY_SERVICE_CONNECT_TIMEOUT_MS=500`
- `LISTING_QUERY_SERVICE_READ_TIMEOUT_MS=1500`

Catatan:

- `LISTING_QUERY_SERVICE_ENABLED` hanya legacy alias
- `LISTING_QUERY_SERVICE_ROLLOUT_MODE` adalah sumber kontrol utama
- `DISABLED` berarti local only
- `SHADOW` berarti response tetap local, remote hanya dibandingkan/logged

## 6. Manual smoke test

### Listing read path

- `GET /api/listings`
  - expected: `200`
  - response shape sama seperti existing frontend
- `GET /api/listings/{validId}`
  - expected: `200`
  - cek `id`, `sellerId`, `sellerEmail`, `auctionId`, `auctionStatus`, `totalBids`
- `GET /api/listings/categories`
  - expected: `200`
  - cek enum category tidak kosong
- `GET /api/listings/categories/tree`
  - expected: `200`
  - cek root `ELECTRONICS` dan child `ELECTRONICS_PHONE`

### Edge cases

- `GET /api/listings/{nonExistingId}`
  - expected: `404`
  - tidak boleh menjadi `502/503`
- `GET /api/listings` saat data staging kosong
  - expected: `200` dengan array kosong
- `GET /api/listings?category=ELECTRONICS&keyword=phone`
  - expected: `200`
  - bandingkan parity hasil dengan monolith
- `GET /api/listings?sort=createdAt,desc&size=1`
  - expected: `200`
  - bandingkan parity urutan dan jumlah hasil dengan monolith

### Existing unrelated flows

- `POST /api/auth/login`
  - expected: `200`
- `GET /api/auth/me`
  - expected: `200`
- `GET /api/wallet/balance`
  - expected: `200`
- `GET /api/wallet/transactions`
  - expected: `200`

## 7. Shadow mode validation

Cari log monolith berikut:

- `listing-query.proxy event=shadow-hit`
- `listing-query.proxy event=shadow-compare`
- `listing-query.proxy event=status-mismatch`
- `listing-query.proxy event=payload-mismatch`
- `listing-query.proxy event=fallback`
- `listing-query.proxy event=remote-success`

Cari log service baru berikut:

- `listing-query.service event=request-complete`

Cara compare response dengan monolith:

- Jalankan sample request pada monolith dengan `LISTING_QUERY_SERVICE_ROLLOUT_MODE=DISABLED`
- Simpan response baseline untuk:
  - `/api/listings`
  - `/api/listings/{id}`
  - `/api/listings/categories`
  - `/api/listings/categories/tree`
- Aktifkan `SHADOW`
- Jalankan request yang sama
- Pastikan tidak ada `status-mismatch`
- Investigasi semua `payload-mismatch` sebelum lanjut ke `PERCENT`

Indikator aman lanjut ke `PERCENT`:

- healthcheck service stabil `UP`
- tidak ada `status-mismatch` untuk traffic staging normal
- tidak ada `payload-mismatch` pada sample request yang diverifikasi
- tidak ada lonjakan timeout/fallback
- auth dan wallet flow staging tetap normal

## 8. Failure drill

### Simulate service down

- Stop `listing-query-service` staging atau ganti base URL ke host mati
- Expected:
  - `SHADOW`: response user tetap normal
  - `PERCENT/FULL` + `FAIL_OPEN=true`: response user tetap normal dari fallback monolith
  - log monolith mencatat `event=fallback`

### Simulate timeout

- Tambah delay upstream atau set timeout sangat kecil untuk uji singkat
- Expected:
  - fallback aktif
  - frontend tidak menerima `5xx`
  - log monolith mencatat `event=fallback`

### Simulate service error

- Buat service baru mengembalikan `500` sementara, atau route ke instance yang error
- Expected:
  - fallback aktif bila `FAIL_OPEN=true`
  - frontend tetap menerima response local dari monolith

## 9. Rollback

1. Set `LISTING_QUERY_SERVICE_ROLLOUT_MODE=DISABLED`
2. Restart monolith
3. Verifikasi `/api/listings*` kembali dilayani local monolith
4. Biarkan `listing-query-service` tetap running atau stop terpisah sesuai kebutuhan
