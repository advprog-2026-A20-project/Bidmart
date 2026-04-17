import { getUser, request } from './api.js'
import { showToast } from './ui.js'

const params = new URLSearchParams(window.location.search)
const listingId = params.get('id')

const titleEl = document.querySelector('#listing-title')
const descriptionEl = document.querySelector('#listing-description')
const imageEl = document.querySelector('#listing-image')
const imageFallbackEl = document.querySelector('#listing-image-fallback')
const priceEl = document.querySelector('#listing-price')
const categoryEl = document.querySelector('#listing-category')
const sellerLinkEl = document.querySelector('#listing-seller-link')
const auctionStatusEl = document.querySelector('#listing-auction-status')
const endsAtEl = document.querySelector('#listing-ends-at')
const detailErrorBox = document.querySelector('#detail-error-box')
const detailErrorMessage = document.querySelector('#detail-error-message')
const openAuctionLink = document.querySelector('#open-auction-link')
const ownerActions = document.querySelector('#owner-actions')
const editForm = document.querySelector('#listing-edit-form')
const editDescriptionInput = document.querySelector('#edit-description')
const editImageUrlInput = document.querySelector('#edit-image-url')
const editCategorySelect = document.querySelector('#edit-category')
const cancelButton = document.querySelector('#listing-cancel-button')
const ownerError = document.querySelector('#owner-error')

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

const flattenCategoryTree = (nodes = [], depth = 0) => {
  return nodes.flatMap((node) => {
    const prefix = depth > 0 ? `${'  '.repeat(depth)}- ` : ''
    return [
      { value: node.key, label: `${prefix}${node.path}` },
      ...flattenCategoryTree(node.children || [], depth + 1),
    ]
  })
}

const setVisible = (element, isVisible) => {
  if (!element) {
    return
  }

  element.classList.toggle('hidden', !isVisible)
}

const populateCategories = async (selectedValue) => {
  if (!editCategorySelect) {
    return
  }

  const tree = await request('/listings/categories/tree', { auth: false })
  const options = flattenCategoryTree(Array.isArray(tree) ? tree : [])
  editCategorySelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join('')

  if (selectedValue) {
    editCategorySelect.value = selectedValue
  }
}

const renderImage = (imageUrl, title) => {
  if (imageEl && imageUrl) {
    imageEl.src = imageUrl
    imageEl.alt = title
    imageEl.classList.remove('hidden')
    imageFallbackEl?.classList.add('hidden')
    return
  }

  imageEl?.classList.add('hidden')
  imageFallbackEl?.classList.remove('hidden')
}

let currentListing = null

const renderOwnerActions = (listing) => {
  const user = getUser()
  const isOwnerSeller = user?.role === 'SELLER' && user?.id === listing?.sellerId
  const canEdit = Boolean(isOwnerSeller && listing?.status === 'ACTIVE' && !listing?.hasBids)

  setVisible(ownerActions, canEdit)

  if (!canEdit) {
    return
  }

  editDescriptionInput.value = listing.description || ''
  editImageUrlInput.value = listing.imageUrl || ''
  populateCategories(listing.category)
}

const loadListing = async () => {
  if (!listingId) {
    setVisible(detailErrorBox, true)
    if (detailErrorMessage) {
      detailErrorMessage.textContent = 'Listing ID was not provided.'
    }
    return
  }

  setVisible(detailErrorBox, false)
  ownerError.textContent = ''

  try {
    const listing = await request(`/listings/${listingId}`, { auth: false })
    currentListing = listing

    titleEl.textContent = listing.title || 'Listing'
    descriptionEl.textContent = listing.description || ''
    priceEl.textContent = formatPrice(listing.price)
    categoryEl.textContent = listing.categoryPath || listing.category || '-'
    auctionStatusEl.textContent = listing.auctionStatus || 'Belum terhubung ke lelang'
    endsAtEl.textContent = formatDate(listing.endsAt)

    if (sellerLinkEl) {
      sellerLinkEl.textContent = listing.sellerEmail || 'Seller'
      sellerLinkEl.href = `/pages/seller-profile.html?id=${listing.sellerId}`
    }

    if (openAuctionLink) {
      if (listing.auctionId) {
        openAuctionLink.href = `/pages/lelang-detail.html?id=${listing.auctionId}`
        openAuctionLink.classList.remove('hidden')
      } else {
        openAuctionLink.classList.add('hidden')
      }
    }

    renderImage(listing.imageUrl, listing.title)
    renderOwnerActions(listing)
  } catch (error) {
    setVisible(detailErrorBox, true)
    if (detailErrorMessage) {
      detailErrorMessage.textContent = error.message || 'Failed to load listing details.'
    }
  }
}

if (editForm) {
  editForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    ownerError.textContent = ''

    if (!currentListing) {
      return
    }

    try {
      await request(`/listings/${currentListing.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          description: editDescriptionInput.value.trim(),
          imageUrl: editImageUrlInput.value.trim(),
          category: editCategorySelect.value || currentListing.category,
        }),
      })
      showToast('success', 'Listing updated.')
      await loadListing()
    } catch (error) {
      ownerError.textContent = error.message
      showToast('error', error.message)
    }
  })
}

if (cancelButton) {
  cancelButton.addEventListener('click', async () => {
    if (!currentListing) {
      return
    }

    const shouldCancel = window.confirm('Cancel this listing? This action cannot be undone.')
    if (!shouldCancel) {
      return
    }

    try {
      await request(`/listings/${currentListing.id}`, {
        method: 'DELETE',
        auth: true,
      })
      showToast('success', 'Listing cancelled.')
      window.location.href = '/pages/listings.html'
    } catch (error) {
      ownerError.textContent = error.message
      showToast('error', error.message)
    }
  })
}

loadListing()
