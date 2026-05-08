# bidmart-wallet-service

Service wallet khusus untuk domain saldo pengguna BidMart (strangler extraction dari monolith).

## Fungsi utama
- Kelola saldo user (`available_balance`, `held_balance`).
- Operasi hold fund saat bidding.
- Release hold jika kalah / batal.
- Capture hold saat pembayaran final.
- Histori transaksi wallet + audit trail dasar.

## Data ownership
Service ini **memiliki** data:
- `wallet`
- `wallet_transaction`
- `wallet_hold` (TODO: tabel baru untuk hold lifecycle)
- `wallet_idempotency_key` (TODO: tabel baru)

Bidding command service **dilarang** update saldo langsung ke database, wajib lewat API wallet-service.

## API Contract (minimum)
- `GET /wallets/{userId}/balance`
- `POST /wallets/{userId}/top-up`
- `POST /wallets/{userId}/withdraw` (TODO implementasi)
- `POST /wallets/{userId}/holds`
- `POST /wallets/{userId}/holds/{holdId}/release`
- `POST /wallets/{userId}/holds/{holdId}/capture`
- `GET /wallets/{userId}/transactions`

Contoh payload ada di `docs/api-contract.md`.

## Rencana idempotency
Semua endpoint mutasi hold/release/capture wajib menerima header `Idempotency-Key`.

Strategi:
1. Simpan `(idempotency_key, user_id, endpoint, request_hash, response_snapshot, status)`.
2. Request ulang dengan key + hash sama => return response lama (HTTP 200/201).
3. Key sama tapi hash beda => `409 Conflict`.
4. Gunakan unique index untuk mencegah double-execution di race condition.

## Menjalankan lokal
Sementara fase bootstrap (belum service runnable penuh), source dipersiapkan di:
`src/main/java/id/ac/ui/cs/advprog/wallet`.

Target berikutnya:
1. Tambah `build.gradle` standalone.
2. Tambah `SpringBootApplication` khusus wallet.
3. Migrasi skema DB wallet terpisah.

## Testing
Rencana test minimum:
- Unit test WalletService untuk top-up, withdraw, hold, release, capture.
- Concurrency test untuk idempotency key.
- Contract test antara bidding-command-service ↔ wallet-service.

## Coupling yang masih harus diputus
- Dependensi entity `User` dari monolith masih dipakai di logic lama.
- `LocalWalletGateway` masih in-process call, belum HTTP/gRPC.
- Event audit trail belum dipublish ke notification/audit pipeline.
