import { getAuctionDetail, getBidHistory, placeBid } from '../api/auction.js'

export const fetchAuctionSnapshot = async (auctionId) => {
  const [detail, history] = await Promise.all([
    getAuctionDetail(auctionId),
    getBidHistory(auctionId),
  ])

  return {
    ...detail,
    bidHistory: Array.isArray(history) ? history : [],
  }
}

export const submitBid = async (auctionId, amount) => {
  const response = await placeBid(auctionId, amount)
  return response
}
