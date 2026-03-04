import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createListing } from '../api/listing.js'
import { routes } from '../router/routes.js'

const CreateListingPage = () => {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await createListing({
        title,
        description,
        price: Number(price),
      })
      navigate(routes.listings)
    } catch (err) {
      const message = err?.response?.data?.message || 'Create listing failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <h1>Create Listing</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input
            type="text"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </label>
        <label>
          Price
          <input
            type="number"
            name="price"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            min="0"
            step="0.01"
            required
          />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Create Listing'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  )
}

export default CreateListingPage
