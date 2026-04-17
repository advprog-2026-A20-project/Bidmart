import { request } from './api.js'

const params = new URLSearchParams(window.location.search)
const sellerId = params.get('id')

const emailEl = document.querySelector('#seller-email')
const roleEl = document.querySelector('#seller-role')
const activeListingsEl = document.querySelector('#seller-active-listings')
const liveAuctionsEl = document.querySelector('#seller-live-auctions')
const completedAuctionsEl = document.querySelector('#seller-completed-auctions')
const errorBox = document.querySelector('#seller-profile-error')
const errorMessage = document.querySelector('#seller-profile-error-message')

const setVisible = (element, isVisible) => {
  if (!element) {
    return
  }

  element.classList.toggle('hidden', !isVisible)
}

const loadSellerProfile = async () => {
  if (!sellerId) {
    setVisible(errorBox, true)
    if (errorMessage) {
      errorMessage.textContent = 'Seller ID was not provided.'
    }
    return
  }

  try {
    const seller = await request(`/users/${sellerId}/public-profile`, { auth: false })
    setVisible(errorBox, false)
    emailEl.textContent = seller.email || '-'
    roleEl.textContent = seller.role || '-'
    activeListingsEl.textContent = seller.activeListingCount ?? '0'
    liveAuctionsEl.textContent = seller.liveAuctionCount ?? '0'
    completedAuctionsEl.textContent = seller.completedAuctionCount ?? '0'
  } catch (error) {
    setVisible(errorBox, true)
    if (errorMessage) {
      errorMessage.textContent = error.message || 'Failed to load seller profile.'
    }
  }
}

loadSellerProfile()
