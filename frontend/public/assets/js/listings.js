import { request, toQueryString } from './api.js'

const filterForm = document.querySelector('#listing-filter-form')
const keywordInput = document.querySelector('#keyword')
const categorySelect = document.querySelector('#category')
const minPriceInput = document.querySelector('#min-price')
const maxPriceInput = document.querySelector('#max-price')
const endingAfterInput = document.querySelector('#ending-after')
const endingBeforeInput = document.querySelector('#ending-before')
const container = document.querySelector('#listings-container')
const skeleton = document.querySelector('#listings-skeleton')
const emptyState = document.querySelector('#listings-empty')
const errorState = document.querySelector('#listings-error')
const errorMessage = document.querySelector('#listings-error-message')
const retryButton = document.querySelector('#listings-retry')

const formatPrice = (value) => {
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) {
    return '-'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

const formatDate = (value) => {
  if (!value) {
    return 'Belum dijadwalkan'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Belum dijadwalkan'
  }

  return parsed.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const setVisible = (element, isVisible) => {
  if (!element) {
    return
  }

  element.classList.toggle('hidden', !isVisible)
}

const flattenCategoryTree = (nodes = [], depth = 0) => {
  return nodes.flatMap((node) => {
    const prefix = depth > 0 ? `${'  '.repeat(depth)}- ` : ''
    return [
      { value: node.key, label: `${prefix}${node.path}` },
      ...flattenCategoryTree(node.children || [], depth + 1),
    ]
  })
}

const toIsoInstant = (value) => {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString()
}

const toLocalInputValue = (value) => {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16)
}

const syncFilterStateFromUrl = () => {
  const params = new URLSearchParams(window.location.search)

  if (keywordInput) keywordInput.value = params.get('keyword') || ''
  if (categorySelect) categorySelect.value = params.get('category') || ''
  if (minPriceInput) minPriceInput.value = params.get('minPrice') || ''
  if (maxPriceInput) maxPriceInput.value = params.get('maxPrice') || ''
  if (endingAfterInput) endingAfterInput.value = toLocalInputValue(params.get('endingAfter'))
  if (endingBeforeInput) endingBeforeInput.value = toLocalInputValue(params.get('endingBefore'))
}

const readFilters = () => {
  return {
    keyword: keywordInput?.value?.trim() || '',
    category: categorySelect?.value || '',
    minPrice: minPriceInput?.value || '',
    maxPrice: maxPriceInput?.value || '',
    endingAfter: toIsoInstant(endingAfterInput?.value || ''),
    endingBefore: toIsoInstant(endingBeforeInput?.value || ''),
  }
}

const applyFilterUrl = (filters) => {
  const queryString = toQueryString(filters)
  const nextUrl = `${window.location.pathname}${queryString}`
  window.history.replaceState({}, '', nextUrl)
}

const renderListing = (listing) => {
  const card = document.createElement('article')
  card.className = 'overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm'

  const imageMarkup = listing.imageUrl
    ? `<img class="h-48 w-full object-cover" src="${listing.imageUrl}" alt="${listing.title}">`
    : `<div class="flex h-48 items-center justify-center bg-slate-800 text-sm text-slate-400">No image</div>`

  card.innerHTML = `
    ${imageMarkup}
    <div class="p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-indigo-300">${listing.categoryPath || listing.category || 'Category'}</p>
          <h2 class="mt-2 text-lg font-semibold">${listing.title}</h2>
        </div>
        <span class="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">${listing.auctionStatus || 'LISTING'}</span>
      </div>
      <p class="mt-3 text-sm text-slate-300">${listing.description || ''}</p>
      <div class="mt-4 grid gap-2 text-sm text-slate-400">
        <p>Harga terkini: <span class="font-semibold text-indigo-300">${formatPrice(listing.price)}</span></p>
        <p>Berakhir: <span class="text-slate-200">${formatDate(listing.endsAt)}</span></p>
        <p>
          Seller:
          <a class="text-indigo-300 underline-offset-4 hover:underline" href="/pages/seller-profile.html?id=${listing.sellerId}">
            ${listing.sellerEmail}
          </a>
        </p>
      </div>
      <div class="mt-5 flex flex-wrap gap-3">
        <a class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400" href="/pages/listing-detail.html?id=${listing.id}">
          View listing
        </a>
        ${listing.auctionId
          ? `<a class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800" href="/pages/lelang-detail.html?id=${listing.auctionId}">
              View auction
            </a>`
          : ''}
      </div>
    </div>
  `

  return card
}

const populateCategories = async () => {
  if (!categorySelect) {
    return
  }

  const tree = await request('/listings/categories/tree', { auth: false })
  const options = flattenCategoryTree(Array.isArray(tree) ? tree : [])
  categorySelect.innerHTML = `
    <option value="">All categories</option>
    ${options.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
  `
}

const loadListings = async () => {
  if (!container) {
    return
  }

  const filters = readFilters()
  applyFilterUrl(filters)

  setVisible(skeleton, true)
  setVisible(emptyState, false)
  setVisible(errorState, false)
  container.innerHTML = ''

  try {
    const data = await request(`/listings${toQueryString(filters)}`, { auth: false })
    const listings = Array.isArray(data) ? data : []

    if (listings.length === 0) {
      setVisible(emptyState, true)
      return
    }

    listings.forEach((listing) => {
      container.appendChild(renderListing(listing))
    })
  } catch (error) {
    if (errorMessage) {
      errorMessage.textContent = error.message || 'Failed to load catalog listings.'
    }
    setVisible(errorState, true)
  } finally {
    setVisible(skeleton, false)
  }
}

if (filterForm) {
  populateCategories()
    .then(() => {
      syncFilterStateFromUrl()
      loadListings()
    })
    .catch(async () => {
      syncFilterStateFromUrl()
      await loadListings()
    })

  filterForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    await loadListings()
  })

  filterForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      loadListings()
    }, 0)
  })
} else {
  loadListings()
}

if (retryButton) {
  retryButton.addEventListener('click', () => {
    loadListings()
  })
}
