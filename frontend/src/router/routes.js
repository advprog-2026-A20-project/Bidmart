export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  listings: '/listings',
  createListing: '/listings/new',
  auctionDetail: (auctionId = ':auctionId') => `/listings/${auctionId}`,
}
