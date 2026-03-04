import { useEffect, useState } from 'react'
import { getListings } from '../api/listing.js'

const ListingsPage = () => {
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadListings = async () => {
      setError('')
      setIsLoading(true)

      try {
        const data = await getListings()
        if (isMounted) {
          setListings(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (isMounted) {
          const message = err?.response?.data?.message || 'Failed to load listings'
          setError(message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadListings()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main>
      <h1>Listings</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p role="alert">{error}</p>}
      {!isLoading && !error && listings.length === 0 && (
        <p>No listings available.</p>
      )}
      <div>
        {listings.map((listing) => (
          <article key={listing.id}>
            <h2>{listing.title}</h2>
            <p>Price: {listing.price}</p>
            <p>{listing.description}</p>
          </article>
        ))}
      </div>
    </main>
  )
}

export default ListingsPage
