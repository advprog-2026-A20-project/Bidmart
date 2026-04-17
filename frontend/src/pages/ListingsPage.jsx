import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuctions } from '../api/auction.js'
import useAuth from '../hooks/useAuth.js'
import { routes } from '../router/routes.js'
import {
  formatCurrency,
  formatDateTime,
  formatTimeRemaining,
  getStatusLabel,
} from '../utils/auction.js'

const ListingsPage = () => {
  const { user } = useAuth()
  const [auctions, setAuctions] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
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

    const loadAuctions = async ({ silent = false } = {}) => {
      if (!silent) {
        setError('')
        setIsLoading(true)
      }

      try {
        const data = await getAuctions()
        if (isMounted) {
          setAuctions(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (isMounted) {
          const message = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to load listings'
          setError(message)
        }
      } finally {
        if (isMounted && !silent) {
          setIsLoading(false)
        }
      }
    }

    loadAuctions()
    const pollTimer = window.setInterval(() => {
      loadAuctions({ silent: true })
    }, 15000)

    return () => {
      isMounted = false
      window.clearInterval(pollTimer)
    }
  }, [])

  return (
    <main className="page">
      <section className="hero-panel panel">
        <div className="hero-actions">
          <div>
            <span className="eyebrow">Listings</span>
            <h1 className="page-title">Live auctions and recent drafts</h1>
            <p className="page-subtitle">
              Explore active bidding, watch extensions in real time, and jump directly into the
              auction detail flow.
            </p>
          </div>
          {user?.role === 'SELLER' && (
            <Link className="button" to={routes.createListing}>
              Create auction
            </Link>
          )}
        </div>
      </section>

      {isLoading && (
        <section className="card-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <article className="auction-card auction-card-skeleton" key={index}>
              <div className="skeleton-line skeleton-line-lg" />
              <div className="skeleton-line skeleton-line-md" />
              <div className="skeleton-line skeleton-line-sm" />
              <div className="skeleton-line skeleton-line-full" />
            </article>
          ))}
        </section>
      )}

      {!isLoading && error && <p className="alert">{error}</p>}

      {!isLoading && !error && auctions.length === 0 && (
        <section className="panel bid-panel">
          <h2 className="section-title">No auctions yet</h2>
          <p className="muted">Create the first auction to start the bidding flow.</p>
        </section>
      )}

      {!isLoading && !error && auctions.length > 0 && (
        <section className="card-grid">
          {auctions.map((auction) => (
            <Link
              className="auction-card"
              key={auction.id}
              to={routes.auctionDetail(auction.id)}
            >
              <div className="card-topline">
                <span className="status-chip">{getStatusLabel(auction.status)}</span>
                <span className="countdown-chip">
                  {formatTimeRemaining(auction.endsAt, clockTick)}
                </span>
              </div>
              <h2>{auction.title}</h2>
              <p>{auction.description}</p>
              <div className="auction-stats">
                <div>
                  <span>Current price</span>
                  <strong>{formatCurrency(auction.currentPrice)}</strong>
                </div>
                <div>
                  <span>Next minimum</span>
                  <strong>{formatCurrency(auction.nextMinimumBid)}</strong>
                </div>
                <div>
                  <span>Total bids</span>
                  <strong>{auction.totalBids}</strong>
                </div>
                <div>
                  <span>Ends at</span>
                  <strong>{formatDateTime(auction.endsAt)}</strong>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}

export default ListingsPage
