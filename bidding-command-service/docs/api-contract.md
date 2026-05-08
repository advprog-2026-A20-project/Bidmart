# API Contract (Draft)

## POST /bids
Alias global untuk place bid command.

## POST /auctions/{auctionId}/bids
Place bid ke auction tertentu.

Request:
```json
{ "amount": 125000.00 }
```

## POST /auctions/{auctionId}/close
Tutup auction (manual/system trigger) lalu tentukan winner/unsold.

## POST /auctions/{auctionId}/cancel
Batalkan auction (jika policy memperbolehkan).

## Integrasi Wallet (command dependency)
- Hold fund saat bid diterima
- Release hold saat bidder kalah/outbid
- Capture hold saat auction closed + winner confirmed

## Idempotency Plan
- Wajib `Idempotency-Key` untuk close/cancel/hold/release/capture orchestration.
- Simpan key + request hash + result snapshot.
- Tolak replay dengan payload berbeda (`409 Conflict`).
