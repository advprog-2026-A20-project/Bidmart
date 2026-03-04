import { request } from './api.js'

const container = document.querySelector('#listings-container')
const emptyState = document.querySelector('#listings-empty')
const errorState = document.querySelector('#listings-error')

const renderListing = (listing) => {
  const card = document.createElement('article')
  card.className = 'rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm'

  const title = document.createElement('h2')
  title.className = 'text-lg font-semibold'
  title.textContent = listing.title

  const price = document.createElement('p')
  price.className = 'mt-2 text-sm text-indigo-300'
  price.textContent = `Rp ${listing.price}`

  const description = document.createElement('p')
  description.className = 'mt-3 text-sm text-slate-300'
  description.textContent = listing.description

  card.appendChild(title)
  card.appendChild(price)
  card.appendChild(description)

  return card
}

const loadListings = async () => {
  if (!container) {
    return
  }

  errorState.textContent = ''
  emptyState.textContent = ''
  container.innerHTML = ''

  try {
    const listings = await request('/listings')

    if (!listings || listings.length === 0) {
      emptyState.textContent = 'Belum ada listing. Coba lagi nanti.'
      return
    }

    listings.forEach((listing) => {
      container.appendChild(renderListing(listing))
    })
  } catch (error) {
    errorState.textContent = error.message
  }
}

loadListings()
