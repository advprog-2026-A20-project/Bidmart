import { request } from './api.js'

const container = document.querySelector('#listings-container')
const skeleton = document.querySelector('#listings-skeleton')
const emptyState = document.querySelector('#listings-empty')
const errorState = document.querySelector('#listings-error')
const errorMessage = document.querySelector('#listings-error-message')
const retryButton = document.querySelector('#listings-retry')

const formatPrice = (value) => {
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) {
    return value
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

const formatDate = (value) => {
  if (!value) {
    return ''
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const truncateText = (value, limit = 140) => {
  if (!value) {
    return ''
  }
  if (value.length <= limit) {
    return value
  }
  return `${value.slice(0, limit)}...`
}

const normalizeListing = (listing) => {
  const sellerId = listing?.sellerId ?? listing?.seller?.id ?? listing?.seller?.userId ?? null
  return {
    id: listing?.id || `${listing?.title}-${sellerId || 'unknown'}`,
    title: listing?.title || 'Untitled',
    description: listing?.description || '',
    price: listing?.price,
    sellerId,
    createdAt: listing?.createdAt ?? listing?.created_at ?? null,
  }
}

const renderListing = (listing) => {
  const normalized = normalizeListing(listing)
  const card = document.createElement('article')
  card.className = 'rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm'

  const title = document.createElement('h2')
  title.className = 'text-lg font-semibold'
  title.textContent = normalized.title

  const price = document.createElement('p')
  price.className = 'mt-3 text-sm font-semibold text-indigo-300'
  price.textContent = formatPrice(normalized.price)

  const description = document.createElement('p')
  description.className = 'mt-3 text-sm text-slate-300'
  description.textContent = truncateText(normalized.description)

  const meta = document.createElement('p')
  meta.className = 'mt-4 text-xs text-slate-500'
  const dateText = formatDate(normalized.createdAt)
  meta.textContent = dateText ? `Dibuat ${dateText}` : ''

  card.appendChild(title)
  card.appendChild(price)
  card.appendChild(description)
  if (meta.textContent) {
    card.appendChild(meta)
  }

  return card
}

const setVisible = (element, isVisible) => {
  if (!element) {
    return
  }
  element.classList.toggle('hidden', !isVisible)
}

const loadListings = async () => {
  if (!container) {
    return
  }

  setVisible(skeleton, true)
  setVisible(emptyState, false)
  setVisible(errorState, false)
  container.innerHTML = ''

  try {
    const listings = await request('/listings', { auth: false })
    const data = Array.isArray(listings) ? listings : []

    if (data.length === 0) {
      setVisible(emptyState, true)
      return
    }

    data.forEach((listing) => {
      container.appendChild(renderListing(listing))
    })
  } catch (error) {
    if (errorMessage) {
      errorMessage.textContent = error.message
    }
    setVisible(errorState, true)
  } finally {
    setVisible(skeleton, false)
  }
}

if (retryButton) {
  retryButton.addEventListener('click', () => {
    loadListings()
  })
}

loadListings()
