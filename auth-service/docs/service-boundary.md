# Service Boundary - bidmart-auth-service

## In Scope
- Authentication: register, login, refresh, logout
- Authorization: role & permission lookup
- User profile ownership
- Token validation internal

## Out of Scope
- Bidding command logic
- Auction query/read model
- Listing query domain
- Wallet balance/transaction logic
- Notification delivery

## Anti-Corruption Rule
- Service lain wajib akses auth/user/permission via API contract auth-service.
- Dilarang query database user/auth secara langsung dari service lain.
