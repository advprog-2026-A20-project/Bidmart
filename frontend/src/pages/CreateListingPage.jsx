import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuction } from '../api/auction.js'
import useAuth from '../hooks/useAuth.js'
import { routes } from '../router/routes.js'
import { formatCurrency } from '../utils/auction.js'

const CreateListingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startingPrice, setStartingPrice] = useState('500000')
  const [reservePrice, setReservePrice] = useState('600000')
  const [minimumBidIncrement, setMinimumBidIncrement] = useState('25000')
  const [durationMinutes, setDurationMinutes] = useState('120')
  const [activateNow, setActivateNow] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const auction = await createAuction({
        title,
        description,
        startingPrice: Number(startingPrice),
        reservePrice: Number(reservePrice),
        minimumBidIncrement: Number(minimumBidIncrement),
        durationMinutes: Number(durationMinutes),
        activateNow,
      })
      navigate(routes.auctionDetail(auction.id))
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.detail || 'Create auction failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (user?.role !== 'SELLER') {
    return (
      <main className="page">
        <section className="panel hero-panel">
          <span className="eyebrow">Seller only</span>
          <h1 className="page-title">Auction creation is restricted</h1>
          <p className="muted">Only seller accounts can create and publish auctions.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="hero-panel panel">
        <span className="eyebrow">Seller console</span>
        <h1 className="page-title">Create a new auction</h1>
        <p className="page-subtitle">
          Configure the opening price, reserve, minimum increment, and whether the draft should
          go live immediately.
        </p>
      </section>

      <section className="panel form-panel">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field field-span-2">
            <span>Title</span>
            <input
              className="input"
              type="text"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label className="field field-span-2">
            <span>Description</span>
            <textarea
              className="textarea"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Starting price</span>
            <input
              className="input"
              type="number"
              name="startingPrice"
              value={startingPrice}
              onChange={(event) => setStartingPrice(event.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </label>

          <label className="field">
            <span>Reserve price</span>
            <input
              className="input"
              type="number"
              name="reservePrice"
              value={reservePrice}
              onChange={(event) => setReservePrice(event.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </label>

          <label className="field">
            <span>Minimum increment</span>
            <input
              className="input"
              type="number"
              name="minimumBidIncrement"
              value={minimumBidIncrement}
              onChange={(event) => setMinimumBidIncrement(event.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </label>

          <label className="field">
            <span>Duration in minutes</span>
            <input
              className="input"
              type="number"
              name="durationMinutes"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              min="1"
              step="1"
              required
            />
          </label>

          <label className="toggle-field field-span-2">
            <input
              type="checkbox"
              checked={activateNow}
              onChange={(event) => setActivateNow(event.target.checked)}
            />
            <span>Activate immediately after creation</span>
          </label>

          <div className="form-note field-span-2">
            <strong>Preview</strong>
            <p>
              Opening at {formatCurrency(startingPrice)} with a reserve of {formatCurrency(reservePrice)}
              {' '}and a minimum step of {formatCurrency(minimumBidIncrement)}.
            </p>
          </div>

          <div className="field-span-2 stack-gap">
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving auction...' : 'Create auction'}
            </button>
            {error && <p className="alert">{error}</p>}
          </div>
        </form>
      </section>
    </main>
  )
}

export default CreateListingPage
