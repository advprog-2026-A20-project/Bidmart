import { describe, expect, it, vi } from 'vitest'
import {
  flushPromises,
  importFresh,
  jsonFailureResponse,
  jsonResponse,
  moduleVariants,
  setPage,
} from './helpers/module-utils.js'

const buildListingDetailMarkup = () => `
  <h1 id="listing-title"></h1>
  <p id="listing-description"></p>
  <img id="listing-image" class="hidden" />
  <div id="listing-image-fallback" class="hidden"></div>
  <p id="listing-price"></p>
  <p id="listing-category"></p>
  <a id="listing-seller-link"></a>
  <p id="listing-auction-status"></p>
  <p id="listing-ends-at"></p>
  <div id="detail-error-box" class="hidden"><span id="detail-error-message"></span></div>
  <a id="open-auction-link" class="hidden"></a>
  <section id="owner-actions" class="hidden">
    <form id="listing-edit-form">
      <textarea id="edit-description"></textarea>
      <input id="edit-image-url" />
      <select id="edit-category"></select>
      <button type="submit">Save</button>
    </form>
    <button id="listing-cancel-button" type="button">Cancel</button>
    <p id="owner-error"></p>
  </section>
`

describe.each(moduleVariants)('$label listing-detail.js', ({ basePath }) => {
  it('shows a missing-id error and ignores owner actions until a listing is loaded', async () => {
    setPage('/pages/listing-detail.html')
    document.body.insertAdjacentHTML('beforeend', buildListingDetailMarkup())

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/listing-detail.js`)
    document.querySelector('#listing-edit-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    )
    document.querySelector('#listing-cancel-button').click()

    expect(document.querySelector('#detail-error-box').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#detail-error-message').textContent).toBe('Listing ID was not provided.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces detail loading failures', async () => {
    setPage('/pages/listing-detail.html?id=listing-1')
    document.body.insertAdjacentHTML('beforeend', buildListingDetailMarkup())

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Listing unavailable')))

    await importFresh(`${basePath}/listing-detail.js`)
    await flushPromises()

    expect(document.querySelector('#detail-error-box').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#detail-error-message').textContent).toBe('Listing unavailable')
  })

  it('renders non-owner listings with fallback image and hidden owner actions', async () => {
    setPage('/pages/listing-detail.html?id=listing-2')
    document.body.insertAdjacentHTML('beforeend', buildListingDetailMarkup())
    localStorage.setItem('user', JSON.stringify({ id: 'buyer-1', role: 'BUYER' }))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      id: 'listing-2',
      title: 'Poster',
      description: 'Signed poster',
      imageUrl: '',
      price: 40,
      categoryPath: 'Lainnya',
      sellerId: 'seller-2',
      sellerEmail: 'seller@example.com',
      auctionStatus: null,
      endsAt: null,
      status: 'ACTIVE',
      hasBids: true,
    })))

    await importFresh(`${basePath}/listing-detail.js`)
    await flushPromises()

    expect(document.querySelector('#listing-title').textContent).toBe('Poster')
    expect(document.querySelector('#listing-seller-link').getAttribute('href')).toBe('/pages/seller-profile.html?id=seller-2')
    expect(document.querySelector('#listing-image').classList.contains('hidden')).toBe(true)
    expect(document.querySelector('#listing-image-fallback').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#open-auction-link').classList.contains('hidden')).toBe(true)
    expect(document.querySelector('#owner-actions').classList.contains('hidden')).toBe(true)
  })

  it('lets the seller edit and cancel an eligible listing', async () => {
    setPage('/pages/listing-detail.html?id=listing-3')
    document.body.insertAdjacentHTML('beforeend', buildListingDetailMarkup())
    localStorage.setItem('user', JSON.stringify({ id: 'seller-3', role: 'SELLER' }))

    const initialListing = {
      id: 'listing-3',
      title: 'Phone Pro',
      description: 'Fast flagship',
      imageUrl: 'https://img.example/phone.jpg',
      price: 250,
      category: 'ELECTRONICS',
      categoryPath: 'Elektronik',
      sellerId: 'seller-3',
      sellerEmail: 'seller3@example.com',
      auctionId: 'auction-3',
      auctionStatus: 'ACTIVE',
      endsAt: '2026-04-21T10:00:00Z',
      status: 'ACTIVE',
      hasBids: false,
    }
    const updatedListing = {
      ...initialListing,
      description: 'Updated description',
      imageUrl: 'https://img.example/updated-phone.jpg',
      category: 'ELECTRONICS_PHONE',
      categoryPath: 'Elektronik > Handphone',
    }
    const categoryTree = [{ key: 'ELECTRONICS_PHONE', path: 'Elektronik > Handphone', children: [] }]

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(initialListing))
      .mockResolvedValueOnce(jsonResponse(categoryTree))
      .mockResolvedValueOnce(jsonResponse(updatedListing))
      .mockResolvedValueOnce(jsonResponse(updatedListing))
      .mockResolvedValueOnce(jsonResponse(categoryTree))
      .mockResolvedValueOnce(jsonResponse({}))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/listing-detail.js`)
    await flushPromises()

    expect(document.querySelector('#owner-actions').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#listing-image').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#open-auction-link').getAttribute('href')).toBe('/pages/lelang-detail.html?id=auction-3')
    expect(document.querySelector('#edit-description').value).toBe('Fast flagship')

    document.querySelector('#edit-description').value = 'Updated description'
    document.querySelector('#edit-image-url').value = 'https://img.example/updated-phone.jpg'
    document.querySelector('#edit-category').value = 'ELECTRONICS_PHONE'
    document.querySelector('#listing-edit-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    )
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/listings/listing-3',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          description: 'Updated description',
          imageUrl: 'https://img.example/updated-phone.jpg',
          category: 'ELECTRONICS_PHONE',
        }),
      }),
    )

    document.querySelector('#listing-cancel-button').click()
    await flushPromises()

    expect(fetchMock.mock.calls.some(([url, options]) =>
      url === '/api/listings/listing-3' && options?.method === 'DELETE')).toBe(true)
  })

  it('shows owner action errors and respects cancelled confirmations', async () => {
    setPage('/pages/listing-detail.html?id=listing-4')
    document.body.insertAdjacentHTML('beforeend', buildListingDetailMarkup())
    localStorage.setItem('user', JSON.stringify({ id: 'seller-4', role: 'SELLER' }))

    const listing = {
      id: 'listing-4',
      title: 'Camera',
      description: 'Mirrorless',
      imageUrl: 'https://img.example/camera.jpg',
      price: 300,
      category: 'ELECTRONICS',
      categoryPath: 'Elektronik',
      sellerId: 'seller-4',
      sellerEmail: 'seller4@example.com',
      auctionId: null,
      auctionStatus: null,
      endsAt: null,
      status: 'ACTIVE',
      hasBids: false,
    }

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(listing))
      .mockResolvedValueOnce(jsonResponse([{ key: 'ELECTRONICS', path: 'Elektronik', children: [] }]))
      .mockResolvedValueOnce(jsonFailureResponse({ message: 'Update failed' }, 409))
      .mockResolvedValueOnce(jsonFailureResponse({ message: 'Cancel failed' }, 409))

    vi.stubGlobal('fetch', fetchMock)
    window.confirm = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)

    await importFresh(`${basePath}/listing-detail.js`)
    await flushPromises()

    document.querySelector('#listing-edit-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    )
    await flushPromises()
    expect(document.querySelector('#owner-error').textContent).toBe('Update failed')

    document.querySelector('#listing-cancel-button').click()
    expect(fetchMock).toHaveBeenCalledTimes(3)

    document.querySelector('#listing-cancel-button').click()
    await flushPromises()

    expect(document.querySelector('#owner-error').textContent).toBe('Cancel failed')
  })

  it('supports invalid values and missing optional elements for owner actions', async () => {
    setPage('/pages/listing-detail.html?id=listing-5')
    document.body.insertAdjacentHTML('beforeend', `
      <h1 id="listing-title"></h1>
      <p id="listing-description"></p>
      <img id="listing-image" class="hidden" />
      <div id="listing-image-fallback" class="hidden"></div>
      <p id="listing-price"></p>
      <p id="listing-category"></p>
      <a id="listing-seller-link"></a>
      <p id="listing-auction-status"></p>
      <p id="listing-ends-at"></p>
      <a id="open-auction-link" class="hidden"></a>
      <section id="owner-actions" class="hidden">
        <form id="listing-edit-form">
          <textarea id="edit-description"></textarea>
          <input id="edit-image-url" />
          <button type="submit">Save</button>
        </form>
        <button id="listing-cancel-button" type="button">Cancel</button>
        <p id="owner-error"></p>
      </section>
    `)
    localStorage.setItem('user', JSON.stringify({ id: 'seller-5', role: 'SELLER' }))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      id: 'listing-5',
      title: 'Broken Data',
      description: 'Owner listing',
      imageUrl: '',
      price: 'not-a-number',
      category: 'OTHER',
      categoryPath: '',
      sellerId: 'seller-5',
      sellerEmail: 'seller5@example.com',
      auctionId: null,
      auctionStatus: null,
      endsAt: 'invalid-date',
      status: 'ACTIVE',
      hasBids: false,
    })))

    await importFresh(`${basePath}/listing-detail.js`)
    await flushPromises()

    expect(document.querySelector('#listing-price').textContent).toBe('-')
    expect(document.querySelector('#listing-ends-at').textContent).toBe('Belum dijadwalkan')
    expect(document.querySelector('#owner-actions').classList.contains('hidden')).toBe(false)
  })
})
