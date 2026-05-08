# API Contract - Wallet Service

## 1) GET /wallets/{userId}/balance
Response 200
```json
{
  "userId": "uuid",
  "availableBalance": "1000.00",
  "heldBalance": "250.00",
  "currency": "IDR"
}
```

## 2) POST /wallets/{userId}/top-up
Request
```json
{ "amount": "100000.00", "reference": "va-123" }
```

## 3) POST /wallets/{userId}/withdraw
Request
```json
{ "amount": "50000.00", "reference": "wd-001" }
```
TODO: implementasi domain rule withdraw.

## 4) POST /wallets/{userId}/holds
Header: `Idempotency-Key: <uuid>`
Request
```json
{
  "auctionId": "uuid",
  "amount": "120000.00",
  "reason": "bid-placement"
}
```

## 5) POST /wallets/{userId}/holds/{holdId}/release
Header: `Idempotency-Key: <uuid>`
Request
```json
{ "reason": "outbid" }
```

## 6) POST /wallets/{userId}/holds/{holdId}/capture
Header: `Idempotency-Key: <uuid>`
Request
```json
{ "reason": "auction-won" }
```

## 7) GET /wallets/{userId}/transactions
Response 200: list transaksi, urut terbaru.
