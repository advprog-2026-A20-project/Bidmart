import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { activateAuction, closeAuction, getAuctionDetail, placeBid } from '../api/auction.js'
import { getCurrentUser } from '../api/auth.js'
import useAuth from '../hooks/useAuth.js'
import { routes } from '../router/routes.js'
import {
  formatCurrency,
  formatDateTime,
  formatTimeRemaining,
  getStatusLabel,
  isAuctionOpen,
} from '../utils/auction.js'

const AuctionDetailPage = () => {
  const { auctionId } = useParams()
  const { token, user, setAuth } = useAuth()
  const [auction, setAuction] = useState(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPlacingBid, setIsPlacingBid] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [clockTick, setClockTick] = useState(Date.now())

  useEffect(() => {
    const tickTimer = window.setInterval(() => {
      setClockTick(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(tickTimer)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadAuction = async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true)
      }

      try {
        const data = await getAuctionDetail(auctionId)
        if (!isMounted) {
          return
        }

        setAuction(data)
        setError('')
        setBidAmount((currentBidAmount) => {
          if (!currentBidAmount) {
            return String(data.nextMinimumBid ?? '')
          }

          if (Number(currentBidAmount) < Number(data.nextMinimumBid ?? 0)) {
            return String(data.nextMinimumBid ?? '')
          }

          return currentBidAmount
        })
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to load auction')
        }
      } finally {
        if (isMounted && !silent) {
          setIsLoading(false)
        }
      }
    }

    loadAuction()
    const pollTimer = window.setInterval(() => {
      loadAuction({ silent: true })
    }, 5000)

    return () => {
      isMounted = false
      window.clearInterval(pollTimer)
    }
  }, [auctionId])

  const isSellerOwner = useMemo(() => {
    return Boolean(user?.id && auction?.sellerId && user.id === auction.sellerId)
  }, [auction?.sellerId, user?.id])

  const canBid = Boolean(
    token
      && user?.role === 'BUYER'
      && auction?.biddable
      && !isSellerOwner,
  )
  const canResolveAuction = Boolean(
    isSellerOwner
      && isAuctionOpen(auction?.status)
      && auction?.endsAt
      && new Date(auction.endsAt).getTime() <= clockTick,
  )

  const refreshUser = async () => {
    if (!token) {
      return
    }

    try {
      const currentUser = await getCurrentUser()
      setAuth(token, currentUser)
    } catch {
      // The auction flow stays usable even if user refresh fails.
    }
  }

  const handleBidSubmit = async (event) => {
    event.preventDefault()
    setActionError('')
    setIsPlacingBid(true)

    try {
      const nextAuction = await placeBid(auctionId, Number(bidAmount))
      setAuction(nextAuction)
      setBidAmount(String(nextAuction.nextMinimumBid ?? ''))
      await refreshUser()
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.response?.data?.detail || 'Bid failed')
    } finally {
      setIsPlacingBid(false)
    }
  }

  const handleActivate = async () => {
    setActionError('')
    setIsActivating(true)

    try {
      const nextAuction = await activateAuction(auctionId)
      setAuction(nextAuction)
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to activate auction')
    } finally {
      setIsActivating(false)
    }
  }

  const handleClose = async () => {
    setActionError('')
    setIsClosing(true)

    try {
      const nextAuction = await closeAuction(auctionId)
      setAuction(nextAuction)
      await refreshUser()
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to close auction')
    } finally {
      setIsClosing(false)
    }
  }

  if (isLoading) {
    return (
      <main className="page">
        <section className="panel hero-panel">
          <span className="eyebrow">Auction</span>
          <h1 className="page-title">Loading auction</h1>
          <p className="muted">Fetching the latest bid state and auction status.</p>
        </section>
      </main>
    )
  }

  if (error || !auction) {
    return (
      <main className="page">
        <section className="panel hero-panel">
          <span className="eyebrow">Auction</span>
          <h1 className="page-title">Auction unavailable</h1>
          <p className="alert">{error || 'Auction was not found.'}</p>
          <Link className="button button-secondary" to={routes.listings}>
            Back to listings
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="auction-hero panel">
        <div className="hero-copy">
          <Link className="eyebrow-link" to={routes.listings}>
            Listings
          </Link>
          <h1 className="page-title">{auction.title}</h1>
          <p className="page-subtitle">{auction.description}</p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span className="metric-label">Status</span>
            <strong>{getStatusLabel(auction.status)}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Current price</span>
            <strong>{formatCurrency(auction.currentPrice)}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Time remaining</span>
            <strong>{formatTimeRemaining(auction.endsAt, clockTick)}</strong>
          </div>
        </div>
      </section>

      <section className="auction-layout">
        <div className="content-column">
          <article className="panel detail-grid">
            <div>
              <p className="section-kicker">Auction summary</p>
              <div className="detail-list">
                <div>
                  <span>Seller</span>
                  <strong>{auction.sellerEmail}</strong>
                </div>
                <div>
                  <span>Started at</span>
                  <strong>{formatDateTime(auction.startsAt)}</strong>
                </div>
                <div>
                  <span>Ends at</span>
                  <strong>{formatDateTime(auction.endsAt)}</strong>
                </div>
                <div>
                  <span>Opening price</span>
                  <strong>{formatCurrency(auction.startingPrice)}</strong>
                </div>
                <div>
                  <span>Reserve price</span>
                  <strong>{formatCurrency(auction.reservePrice)}</strong>
                </div>
                <div>
                  <span>Minimum increment</span>
                  <strong>{formatCurrency(auction.minimumBidIncrement)}</strong>
                </div>
                <div>
                  <span>Total bids</span>
                  <strong>{auction.totalBids}</strong>
                </div>
                <div>
                  <span>Reserve met</span>
                  <strong>{auction.reserveMet ? 'Yes' : 'Not yet'}</strong>
                </div>
              </div>
            </div>

            <div>
              <p className="section-kicker">Leading bid</p>
              {auction.leadingBid ? (
                <div className="highlight-card">
                  <strong>{formatCurrency(auction.leadingBid.amount)}</strong>
                  <p>{auction.leadingBid.bidderEmail}</p>
                  <span>Sequence #{auction.leadingBid.sequenceNumber}</span>
                </div>
              ) : (
                <div className="empty-card">
                  <strong>No bids yet</strong>
                  <p>The first valid bid can match the opening price.</p>
                </div>
              )}
            </div>
          </article>

          <article className="panel bid-panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Bid history</p>
                <h2 className="section-title">Ordered, deterministic, and current</h2>
              </div>
            </div>
            {auction.bidHistory.length === 0 ? (
              <p className="muted">No bids have been recorded for this auction yet.</p>
            ) : (
              <div className="history-list">
                {auction.bidHistory.map((bid) => (
                  <article
                    className={`history-item${bid.winning ? ' history-item-active' : ''}`}
                    key={bid.id}
                  >
                    <div>
                      <span className="history-sequence">#{bid.sequenceNumber}</span>
                      <strong>{bid.bidderEmail}</strong>
                      <p>{formatDateTime(bid.submittedAt)}</p>
                    </div>
                    <div className="history-amount">
                      <strong>{formatCurrency(bid.amount)}</strong>
                      {bid.winning && <span>Leading</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className="sidebar-column">
          <article className="panel bid-panel">
            <p className="section-kicker">Bidding panel</p>
            <h2 className="section-title">Place or manage the next move</h2>
            <p className="muted">
              Next valid bid: <strong>{formatCurrency(auction.nextMinimumBid)}</strong>
            </p>

            {user && (
              <div className="wallet-card">
                <span>Available balance</span>
                <strong>{formatCurrency(user.availableBalance)}</strong>
                <span>Held balance</span>
                <strong>{formatCurrency(user.heldBalance)}</strong>
              </div>
            )}

            {actionError && <p className="alert">{actionError}</p>}

            {isSellerOwner && auction.status === 'DRAFT' && (
              <button className="button" type="button" onClick={handleActivate} disabled={isActivating}>
                {isActivating ? 'Activating...' : 'Start auction'}
              </button>
            )}

            {isSellerOwner && isAuctionOpen(auction.status) && (
              <div className="stack-gap">
                <p className="muted">
                  Seller controls remain limited while the auction is live. Closing is only allowed
                  once the end time has passed.
                </p>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={handleClose}
                  disabled={isClosing || !canResolveAuction}
                >
                  {isClosing ? 'Closing...' : 'Resolve auction'}
                </button>
              </div>
            )}

            {!token && (
              <div className="stack-gap">
                <p className="muted">Login as a buyer to place a bid on this auction.</p>
                <Link className="button" to={routes.login}>
                  Login to bid
                </Link>
              </div>
            )}

            {token && user?.role !== 'BUYER' && !isSellerOwner && (
              <p className="muted">Only buyer accounts can place bids.</p>
            )}

            {token && isSellerOwner && auction.status !== 'DRAFT' && (
              <p className="muted">You are the seller of this auction, so bidding is disabled.</p>
            )}

            {token && user?.role === 'BUYER' && !auction.biddable && (
              <p className="muted">
                This auction is no longer accepting bids. Final status: {getStatusLabel(auction.status)}.
              </p>
            )}

            {canBid && (
              <form className="stack-gap" onSubmit={handleBidSubmit}>
                <label className="field">
                  <span>Bid amount</span>
                  <input
                    className="input"
                    type="number"
                    name="amount"
                    min={Number(auction.nextMinimumBid || 0)}
                    step="0.01"
                    value={bidAmount}
                    onChange={(event) => setBidAmount(event.target.value)}
                    required
                  />
                </label>
                <button className="button" type="submit" disabled={isPlacingBid}>
                  {isPlacingBid ? 'Submitting bid...' : 'Place bid'}
                </button>
              </form>
            )}
          </article>
        </aside>
      </section>
    </main>
  )
}

export default AuctionDetailPage
