export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  listings: '/listings',
  lelangHome: '/lelang',
  createListing: '/listings/new',
  wallet: '/wallet',
  auctionDetail: (auctionId = ':auctionId') => `/lelang/${auctionId}`,
  legacyAuctionDetail: (auctionId = ':auctionId') => `/listings/${auctionId}`,
}
