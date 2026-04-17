import client from './client.js'

export const getAuctions = async () => {
  const response = await client.get('/auctions')
  return response.data
}

export const getAuctionDetail = async (auctionId) => {
  const response = await client.get(`/auctions/${auctionId}`)
  return response.data
}

export const getBidHistory = async (auctionId) => {
  const response = await client.get(`/auctions/${auctionId}/bids`)
  return response.data
}

export const createAuction = async ({
  title,
  description,
  startingPrice,
  reservePrice,
  minimumBidIncrement,
  durationMinutes,
  activateNow,
}) => {
  const response = await client.post('/auctions', {
    title,
    description,
    startingPrice,
    reservePrice,
    minimumBidIncrement,
    durationMinutes,
    activateNow,
  })
  return response.data
}

export const activateAuction = async (auctionId) => {
  const response = await client.post(`/auctions/${auctionId}/activate`)
  return response.data
}

export const placeBid = async (auctionId, amount) => {
  const response = await client.post(`/auctions/${auctionId}/bids`, { amount })
  return response.data
}

export const closeAuction = async (auctionId) => {
  const response = await client.post(`/auctions/${auctionId}/close`)
  return response.data
}
