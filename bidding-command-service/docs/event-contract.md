# Event Contract (Draft)

- `BidPlaced`:
  - auctionId, bidId, bidderId, amount, placedAt, previousLeaderId
- `AuctionExtended`:
  - auctionId, oldEndsAt, newEndsAt, triggerBidId
- `AuctionClosed`:
  - auctionId, closedAt, closedBy/system
- `WinnerDetermined`:
  - auctionId, bidId, winnerId, amount
- `AuctionUnsold`:
  - auctionId, reason, reservePrice, highestBid(optional)
