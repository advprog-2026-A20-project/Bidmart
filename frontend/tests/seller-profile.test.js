import { describe, expect, it, vi } from 'vitest'
import {
  flushPromises,
  importFresh,
  jsonResponse,
  moduleVariants,
  setPage,
} from './helpers/module-utils.js'

const buildSellerProfileMarkup = () => `
  <p id="seller-email"></p>
  <p id="seller-role"></p>
  <p id="seller-active-listings"></p>
  <p id="seller-live-auctions"></p>
  <p id="seller-completed-auctions"></p>
  <div id="seller-profile-error" class="hidden"><span id="seller-profile-error-message"></span></div>
`

describe.each(moduleVariants)('$label seller-profile.js', ({ basePath }) => {
  it('shows an error when the seller id is missing', async () => {
    setPage('/pages/seller-profile.html')
    document.body.insertAdjacentHTML('beforeend', buildSellerProfileMarkup())
    vi.stubGlobal('fetch', vi.fn())

    await importFresh(`${basePath}/seller-profile.js`)

    expect(document.querySelector('#seller-profile-error').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#seller-profile-error-message').textContent).toBe('Seller ID was not provided.')
  })

  it('renders the public seller profile and hides any previous error state', async () => {
    setPage('/pages/seller-profile.html?id=seller-1')
    document.body.insertAdjacentHTML('beforeend', buildSellerProfileMarkup())
    document.querySelector('#seller-profile-error').classList.remove('hidden')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      email: 'seller@example.com',
      role: 'SELLER',
      activeListingCount: 2,
      liveAuctionCount: 1,
      completedAuctionCount: 4,
    })))

    await importFresh(`${basePath}/seller-profile.js`)
    await flushPromises()

    expect(document.querySelector('#seller-email').textContent).toBe('seller@example.com')
    expect(document.querySelector('#seller-role').textContent).toBe('SELLER')
    expect(document.querySelector('#seller-active-listings').textContent).toBe('2')
    expect(document.querySelector('#seller-live-auctions').textContent).toBe('1')
    expect(document.querySelector('#seller-completed-auctions').textContent).toBe('4')
    expect(document.querySelector('#seller-profile-error').classList.contains('hidden')).toBe(true)
  })

  it('shows request failures when the profile cannot be loaded', async () => {
    setPage('/pages/seller-profile.html?id=seller-2')
    document.body.insertAdjacentHTML('beforeend', buildSellerProfileMarkup())

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Profile unavailable')))

    await importFresh(`${basePath}/seller-profile.js`)
    await flushPromises()

    expect(document.querySelector('#seller-profile-error').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#seller-profile-error-message').textContent).toBe('Profile unavailable')
  })

  it('tolerates missing error containers when toggling visibility', async () => {
    setPage('/pages/seller-profile.html')
    document.body.insertAdjacentHTML('beforeend', `
      <p id="seller-email"></p>
      <p id="seller-role"></p>
      <p id="seller-active-listings"></p>
      <p id="seller-live-auctions"></p>
      <p id="seller-completed-auctions"></p>
    `)
    vi.stubGlobal('fetch', vi.fn())

    await importFresh(`${basePath}/seller-profile.js`)
  })
})
